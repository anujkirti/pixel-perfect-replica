import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Play,
  Pause,
  Upload,
  Download,
  ShieldCheck,
  Volume2,
  VolumeX,
  ScanLine,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { useLive, type LiveSettings, type FeedbackEntry } from "@/components/live/store";
import { FeedbackLog } from "@/components/live/feedback-log";
import { useCamera } from "@/hooks/useCamera";
import { useDetectionLoop } from "@/hooks/useDetectionLoop";
import type { Detector, LiveDetection } from "@/detectors/types";
import { ConfirmationPipeline } from "@/lib/temporalConfirm";
import { drawOverlay, drawSample, snapshot } from "@/lib/live-drawing";
import { modelCache } from "@/lib/model-cache";
type Result = ReturnType<ConfirmationPipeline["process"]>;
export function LiveRange({
  label,
  value,
  min = 0.05,
  max = 0.95,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="threshold-control">
      <div>
        <label>{label}</label>
        <span className="mono">{step === 1 ? value : value.toFixed(2)}</span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <div className="slider-range">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
export function LiveCamera() {
  const { settings, setSettings, entries, addEntries, storageError } = useLive();
  const camera = useCamera();
  const video = useRef<HTMLVideoElement>(null),
    sample = useRef<HTMLCanvasElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    pipeline = useRef(new ConfirmationPipeline()),
    engine = useRef<Detector | null>(null),
    loadToken = useRef(0),
    modelBytes = useRef<ArrayBuffer | undefined>(undefined),
    uploadRef = useRef<HTMLInputElement>(null),
    videoUpload = useRef<HTMLInputElement>(null),
    audio = useRef<AudioContext | null>(null);
  const [detector, setDetector] = useState<Detector | null>(null),
    [source, setSource] = useState<"none" | "camera" | "test" | "file">("none"),
    [running, setRunning] = useState(true),
    [device, setDevice] = useState(""),
    [loading, setLoading] = useState(false),
    [progress, setProgress] = useState("Select a source to begin"),
    [error, setError] = useState(""),
    [modelName, setModelName] = useState(""),
    [fileUrl, setFileUrl] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [latency, setLatency] = useState(0),
    [actualFps, setActualFps] = useState(0),
    [sessionAlerts, setSessionAlerts] = useState(0),
    [sessionSuppressed, setSessionSuppressed] = useState(0),
    [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const lastFrame = useRef(0),
    suppressionTimes = useRef(new Map<number, number>()),
    sessionStart = useRef(0),
    lastChart = useRef(0);
  const update = (patch: Partial<LiveSettings>) => setSettings({ ...settings, ...patch });
  const stop = useCallback(() => {
    camera.stop();
    setSource("none");
    setDetector(null);
    setLoading(false);
    setActualFps(0);
    setLatency(0);
    loadToken.current++;
    const old = engine.current;
    engine.current = null;
    Promise.resolve(old?.dispose()).catch(() => {});
    pipeline.current.reset();
    setResult(null);
    overlay.current
      ?.getContext("2d")
      ?.clearRect(0, 0, overlay.current.width, overlay.current.height);
  }, [camera.stop]);
  useEffect(
    () => () => {
      loadToken.current++;
      Promise.resolve(engine.current?.dispose()).catch(() => {});
      audio.current?.close().catch(() => {});
    },
    [],
  );
  useEffect(() => {
    if (!video.current) return;
    video.current.srcObject = source === "camera" ? camera.stream : null;
    if (source === "camera" && camera.stream)
      video.current
        .play()
        .catch(() => setError("Press Start camera again to allow video playback."));
  }, [camera.stream, source]);
  useEffect(() => {
    if (source !== "test") return;
    let id = 0;
    const start = performance.now();
    function draw() {
      if (sample.current) drawSample(sample.current, performance.now() - start);
      id = requestAnimationFrame(draw);
    }
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [source]);
  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);
  useEffect(() => {
    modelCache("read")
      .then((bytes) => {
        if (bytes) {
          modelBytes.current = bytes;
          setModelName("Saved ONNX model");
        }
      })
      .catch(() => {});
  }, []);
  async function loadEngine(test = false, override?: LiveSettings) {
    const config = override ?? settings;
    const token = ++loadToken.current;
    setLoading(true);
    setError("");
    setDetector(null);
    await engine.current?.dispose();
    engine.current = null;
    let next: Detector | null = null;
    try {
      if (test) {
        const { SampleDetector } = await import("@/detectors/sample");
        next = new SampleDetector();
      } else if (config.model === "onnx") {
        const bytes = modelBytes.current ?? (await modelCache("read"));
        if (!bytes) throw new Error("Upload your YOLOv8 ONNX model first.");
        const labels = config.labels
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!labels.length || new Set(labels).size !== labels.length)
          throw new Error("Enter unique class names in model output order.");
        const { OnnxDetector } = await import("@/detectors/onnxYolo");
        next = new OnnxDetector(bytes, labels, config.weapons);
      } else if (config.model === "remote") {
        if (!config.remoteConsent)
          throw new Error(
            "Remote API sends video frames outside this browser. Enable explicit consent before loading it.",
          );
        const { RemoteDetector } = await import("@/detectors/remoteApi");
        next = new RemoteDetector(config.apiUrl, config.weapons);
      } else {
        const { CocoDetector } = await import("@/detectors/cocoSsd");
        next = new CocoDetector();
      }
      await next.load((message) => {
        if (token === loadToken.current) setProgress(message);
      });
      if (token !== loadToken.current) {
        await next.dispose();
        return;
      }
      engine.current = next;
      setDetector(next);
      pipeline.current.reset();
      suppressionTimes.current.clear();
      setRunning(true);
      setProgress(
        test
          ? "Synthetic pipeline ready · scripted detections"
          : config.model === "demo"
            ? "COCO-SSD ready · no firearm class"
            : config.model === "onnx"
              ? "ONNX model ready"
              : "Remote API ready",
      );
    } catch (e) {
      await next?.dispose();
      if (token === loadToken.current)
        setError(e instanceof Error ? e.message : "Model loading failed. Please retry.");
    } finally {
      if (token === loadToken.current) setLoading(false);
    }
  }
  async function startCamera() {
    setSource("camera");
    setFileUrl("");
    sessionStart.current = performance.now();
    await camera.start(settings, device);
    if (!engine.current || source === "test") await loadEngine();
  }
  async function test() {
    camera.stop();
    setSource("test");
    setFileUrl("");
    sessionStart.current = performance.now();
    await loadEngine(true);
  }
  function beep() {
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      ctx.resume().catch(() => {});
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }
  const getSource = () =>
    source === "test"
      ? sample.current
      : video.current && video.current.readyState >= 2
        ? video.current
        : null;
  function onFrame(detections: LiveDetection[], ms: number) {
    const now = performance.now();
    setLatency(ms);
    if (lastFrame.current) setActualFps(1000 / (now - lastFrame.current));
    lastFrame.current = now;
    const next = pipeline.current.process(detections, settings, now);
    setResult(next);
    const frame = getSource();
    if (frame && overlay.current) drawOverlay(overlay.current, frame, next, settings);
    const events: FeedbackEntry[] = [];
    for (const track of next.alerts) {
      events.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        detection: track.detection,
        frames: track.history.filter(Boolean).length,
        status: "Alert",
      });
    }
    for (const track of next.suppressed) {
      if (
        now - (suppressionTimes.current.get(track.id) ?? -Infinity) >=
        Math.max(1000, settings.cooldown * 1000)
      ) {
        suppressionTimes.current.set(track.id, now);
        events.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          detection: track.detection,
          frames: track.history.filter(Boolean).length,
          status: track.suppressed ? "Suppressed look-alike" : "Suppressed threshold",
        });
      }
    }
    if (events.length) {
      const thumb =
        frame && overlay.current ? snapshot(frame, overlay.current, settings.mirror, true) : "";
      addEntries(events.map((e) => ({ ...e, snapshot: thumb })));
      setSessionAlerts((n) => n + next.alerts.length);
      setSessionSuppressed(
        (n) => n + events.filter((e) => e.status === "Suppressed look-alike").length,
      );
      if (next.alerts.length) {
        if (settings.sound) beep();
        if (
          settings.notifications &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        )
          new Notification("SentinelEye: possible weapon", {
            body: "Verify manually. A research detection is not a confirmed threat.",
          });
      }
    }
    if (now - lastChart.current >= 500) {
      lastChart.current = now;
      setHistory((h) =>
        [
          ...h,
          {
            time: Math.round((now - sessionStart.current) / 1000),
            confidence: Math.max(0, ...detections.map((d) => d.confidence)),
          },
        ].slice(-60),
      );
    }
  }
  const paused = useDetectionLoop({
    detector,
    source: getSource,
    active: running && source !== "none" && (source !== "camera" || !!camera.stream),
    fps:
      settings.model === "remote" && source !== "test"
        ? Math.min(settings.fps, 1000 / settings.remoteInterval)
        : settings.fps,
    onFrame,
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Inference failed.");
      setRunning(false);
      if (settings.model === "remote" && source !== "test") {
        const fallback = { ...settings, model: "demo" as const, remoteConsent: false };
        setSettings(fallback);
        setError("Remote API failed. Switching to the on-device demo model.");
        void loadEngine(false, fallback).then(() =>
          setError(
            "Remote API failed. The on-device demo is now selected; it has no firearm class.",
          ),
        );
      }
    },
  });
  useEffect(() => {
    pipeline.current.reset();
    suppressionTimes.current.clear();
    setResult(null);
  }, [settings.firearm, settings.knife, settings.nms, settings.k, settings.n, settings.cooldown]);
  useEffect(() => {
    if (paused || !running) {
      pipeline.current.reset();
      setResult(null);
    }
  }, [paused, running]);
  useEffect(() => {
    const frame = getSource();
    if (frame && overlay.current && result) drawOverlay(overlay.current, frame, result, settings);
  }, [settings.mirror, settings.showSuppressed, result]);
  const correct = entries.filter((e) => e.feedback === "correct").length,
    fp = entries.filter((e) => e.feedback === "fp").length;
  const categories = ["umbrella", "phone", "tool", "other"].map((label) => ({
    label,
    count: entries.filter((e) => e.feedback === "fp" && e.category === label).length,
  }));
  const remote = source !== "test" && settings.model === "remote";
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">ON-DEVICE SECURITY RESEARCH</div>
          <h1>
            SentinelEye <span className="text-primary">Live</span>
          </h1>
          <p>Real-Time Low-False-Positive Weapon Detector</p>
        </div>
        <span className={`live-privacy ${remote ? "text-destructive" : "text-success"}`}>
          <ShieldCheck className="size-4" />
          {remote
            ? "Remote mode: JPEG frames sent to your endpoint"
            : "🔒 Processing on-device. No video leaves your browser."}
        </span>
      </div>
      <div className="live-layout">
        <div className="min-w-0">
          <div className="live-viewer">
            <div className="viewer-toolbar">
              <span>
                <ScanLine className="size-4" />
                {source === "test"
                  ? "SYNTHETIC TEST"
                  : source === "camera"
                    ? "LIVE CAMERA"
                    : source === "file"
                      ? "LOCAL VIDEO"
                      : "CAMERA OFF"}
              </span>
              <span className="mono">
                {actualFps.toFixed(1)} FPS · {latency.toFixed(0)} ms
              </span>
            </div>
            <div className="live-stage">
              <video
                ref={video}
                src={fileUrl || undefined}
                autoPlay
                muted
                playsInline
                loop
                className={`${source === "test" || source === "none" ? "hidden" : ""} ${settings.mirror ? "live-mirrored" : ""}`}
              />
              <canvas
                ref={sample}
                width={640}
                height={360}
                className={`${source !== "test" ? "hidden" : ""} ${settings.mirror ? "live-mirrored" : ""}`}
              />
              <canvas ref={overlay} className="live-overlay" />
              {source === "none" && (
                <div className="live-idle">
                  <Camera className="size-12 text-muted-foreground" />
                  <h2>Camera ready when you are</h2>
                  <p className="text-muted-foreground">On-device · human verified</p>
                  <Button onClick={() => void startCamera()} disabled={camera.busy}>
                    <Camera />
                    Start camera
                  </Button>
                </div>
              )}
              {loading && (
                <div className="live-loading" role="status">
                  <span className="live-spinner" />
                  {progress}
                </div>
              )}
            </div>
            <div
              className={`live-status live-status-${result?.status ?? "clear"}`}
              role="status"
              aria-live="polite"
            >
              {source === "none"
                ? "Camera stopped"
                : camera.error || error
                  ? "Detection unavailable · check the message below"
                  : loading || !detector
                    ? "Detection model not ready"
                    : paused
                      ? "Detection paused · tab hidden"
                      : !running
                        ? "Detection paused"
                        : result?.status === "alert"
                          ? `⚠ POSSIBLE ${result.alerts[0]?.detection.label.toUpperCase() ?? result.tracks.find((t) => t.history.filter(Boolean).length >= settings.k)?.detection.label.toUpperCase() ?? "WEAPON"} – VERIFY MANUALLY`
                          : result?.status === "candidate"
                            ? "Candidate – confirming…"
                            : "No weapon detected"}
            </div>
            <div className="live-actions">
              <Button
                variant={source === "camera" ? "outline" : "default"}
                onClick={() => void startCamera()}
                disabled={camera.busy}
              >
                {camera.busy ? <span className="live-spinner" /> : <Camera />}
                {source === "camera" ? "Restart camera" : "Start camera"}
              </Button>
              <Button variant="outline" onClick={stop} disabled={source === "none"}>
                <CameraOff />
                Stop camera
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={running ? "Pause detection" : "Resume detection"}
                aria-label={running ? "Pause detection" : "Resume detection"}
                onClick={() => setRunning(!running)}
                disabled={!detector}
              >
                {running ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const frame = getSource();
                  if (frame && overlay.current) {
                    const a = document.createElement("a");
                    a.download = "sentineleye-snapshot.png";
                    a.href = snapshot(frame, overlay.current, settings.mirror);
                    a.click();
                  }
                }}
                disabled={source === "none"}
              >
                <Download />
                Snapshot
              </Button>
              <Button variant="ghost" onClick={() => void test()}>
                <Play />
                Test without camera
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Open local video"
                aria-label="Open local video"
                onClick={() => videoUpload.current?.click()}
              >
                <Upload />
              </Button>
              <input
                ref={videoUpload}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    camera.stop();
                    setSource("file");
                    setFileUrl(URL.createObjectURL(file));
                    sessionStart.current = performance.now();
                    void loadEngine();
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {(camera.error || error) && (
            <div className="notice mt-3" role="alert">
              <p>{camera.error || error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  source === "camera" ? void startCamera() : void loadEngine(source === "test")
                }
              >
                <RotateCcw />
                Retry
              </Button>
            </div>
          )}
          {source === "test" && (
            <div className="notice mt-3">
              Synthetic scenes and scripted detections · same confirmation, overlap guard and
              feedback pipeline; not model predictions.
            </div>
          )}
          {storageError && (
            <div role="alert" className="notice mt-3">
              {storageError}
            </div>
          )}
          <div className="live-stats">
            {[
              ["Detections / sec", ((result?.detections.length ?? 0) * actualFps).toFixed(1)],
              ["Session alerts", sessionAlerts],
              ["Look-alikes suppressed", sessionSuppressed],
              ["Marked correct", correct],
              ["Marked false positive", fp],
              [
                "Feedback precision",
                correct + fp ? `${((correct / (correct + fp)) * 100).toFixed(1)}%` : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong className="mono">{value}</strong>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <section>
              <div className="section-heading">
                <h2>Confidence over time</h2>
              </div>
              <Chart
                data={history}
                x="time"
                series={[{ key: "confidence", name: "Top detection", color: chartColors.amber }]}
                height={230}
                yMax={1}
              />
            </section>
            <section>
              <div className="section-heading">
                <h2>Reviewed false positives</h2>
              </div>
              <Chart
                data={categories}
                bar
                series={[{ key: "count", name: "Marked false positives", color: chartColors.blue }]}
                height={230}
              />
            </section>
          </div>
        </div>
        <aside className="live-controls">
          <section>
            <div className="section-heading">
              <h2>Camera</h2>
            </div>
            <label htmlFor="camera-device">Device</label>
            <select id="camera-device" value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">Default camera</option>
              {camera.devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="camera-facing">Lens</label>
                <select
                  id="camera-facing"
                  value={settings.facing}
                  onChange={(e) => {
                    setDevice("");
                    update({ facing: e.target.value as LiveSettings["facing"] });
                  }}
                >
                  <option value="environment">Rear</option>
                  <option value="user">Front</option>
                </select>
              </div>
              <div>
                <label htmlFor="camera-resolution">Resolution</label>
                <select
                  id="camera-resolution"
                  value={settings.resolution}
                  onChange={(e) =>
                    update({ resolution: e.target.value as LiveSettings["resolution"] })
                  }
                >
                  <option value="640x480">640 × 480</option>
                  <option value="1280x720">1280 × 720</option>
                </select>
              </div>
            </div>
            <div className="live-toggle">
              <label htmlFor="mirror-live">Mirror video</label>
              <Switch
                id="mirror-live"
                checked={settings.mirror}
                onCheckedChange={(mirror) => update({ mirror })}
              />
            </div>
          </section>
          <section>
            <div className="section-heading">
              <h2>Model</h2>
              <span className="subtle-tag">LOCAL FIRST</span>
            </div>
            <select
              aria-label="Model source"
              value={settings.model}
              onChange={(e) => {
                update({ model: e.target.value as LiveSettings["model"], remoteConsent: false });
                stop();
              }}
            >
              <option value="demo">Demo · COCO-SSD</option>
              <option value="onnx">My fine-tuned model · ONNX</option>
              <option value="remote">Remote API · optional</option>
            </select>
            {settings.model === "demo" ? (
              <p className="notice mt-3">
                Demo model has no firearm class. Upload your fine-tuned model for firearm detection.
              </p>
            ) : settings.model === "onnx" ? (
              <>
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => uploadRef.current?.click()}
                >
                  <Upload />
                  Upload .onnx
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {modelName || "YOLOv8 · 640×640 · [1, 4+nc, 8400]"}
                </p>
                <input
                  ref={uploadRef}
                  type="file"
                  accept=".onnx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.name.toLowerCase().endsWith(".onnx")) {
                        setError("Choose an .onnx model file.");
                        return;
                      }
                      const bytes = await file.arrayBuffer();
                      modelBytes.current = bytes;
                      setModelName(file.name);
                      try {
                        await modelCache("write", bytes);
                      } catch {
                        setError(
                          "Model works this session, but browser storage could not save it.",
                        );
                      }
                      stop();
                    }
                    e.target.value = "";
                  }}
                />
                <label htmlFor="class-names">Class names · output order</label>
                <Input
                  id="class-names"
                  value={settings.labels}
                  onChange={(e) => {
                    update({ labels: e.target.value });
                    stop();
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {settings.labels
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((label, i) => (
                      <label key={`${label}-${i}`} className="live-class">
                        <input
                          type="checkbox"
                          checked={settings.weapons.includes(label)}
                          onChange={(e) => {
                            update({
                              weapons: e.target.checked
                                ? [...settings.weapons, label]
                                : settings.weapons.filter((l) => l !== label),
                            });
                            stop();
                          }}
                        />
                        {label} · weapon
                      </label>
                    ))}
                </div>
              </>
            ) : (
              <>
                <label htmlFor="remote-url">Endpoint URL</label>
                <Input
                  id="remote-url"
                  value={settings.apiUrl}
                  placeholder="https://model.example/predict"
                  onChange={(e) => {
                    update({ apiUrl: e.target.value, remoteConsent: false });
                    stop();
                  }}
                />
                <p className="notice mt-3">
                  Remote mode uploads JPEG frames to this URL. Its privacy policy and CORS rules
                  apply.
                </p>
                <div className="live-toggle">
                  <label htmlFor="remote-consent">I allow sending frames</label>
                  <Switch
                    id="remote-consent"
                    checked={settings.remoteConsent}
                    onCheckedChange={(remoteConsent) => {
                      update({ remoteConsent });
                      if (!remoteConsent) stop();
                    }}
                  />
                </div>
                <LiveRange
                  label="Snapshot interval (ms)"
                  value={settings.remoteInterval}
                  min={100}
                  max={10000}
                  step={100}
                  onChange={(remoteInterval) => update({ remoteInterval })}
                />
              </>
            )}
            <Button
              variant="outline"
              className="w-full mt-3"
              disabled={loading}
              onClick={() => void loadEngine(source === "test")}
            >
              <ScanLine />
              {loading ? "Loading…" : "Load selected model"}
            </Button>
            <p role="status" className="text-xs text-muted-foreground mt-2">
              {progress}
            </p>
          </section>
          <section>
            <div className="section-heading">
              <h2>False-positive controls</h2>
            </div>
            <div className="live-presets">
              {[
                {
                  name: "High Recall",
                  firearm: 0.25,
                  knife: 0.25,
                  k: 2,
                  n: 4,
                  cooldown: 3,
                  nms: 0.5,
                },
                {
                  name: "Balanced",
                  firearm: 0.45,
                  knife: 0.45,
                  k: 3,
                  n: 5,
                  cooldown: 5,
                  nms: 0.45,
                },
                {
                  name: "Low False Positives",
                  firearm: 0.6,
                  knife: 0.55,
                  k: 4,
                  n: 6,
                  cooldown: 10,
                  nms: 0.45,
                },
              ].map(({ name, ...p }) => (
                <Button
                  key={name}
                  size="sm"
                  variant={
                    settings.k === p.k && settings.firearm === p.firearm ? "default" : "outline"
                  }
                  onClick={() => update(p)}
                >
                  {name}
                  {name === "Low False Positives" && <ShieldCheck />}
                </Button>
              ))}
            </div>
            <LiveRange
              label="Global confidence"
              value={(settings.firearm + settings.knife) / 2}
              onChange={(n) => update({ firearm: n, knife: n })}
            />
            <LiveRange
              label="Firearm confidence"
              value={settings.firearm}
              onChange={(firearm) => update({ firearm })}
            />
            <LiveRange
              label="Knife confidence"
              value={settings.knife}
              onChange={(knife) => update({ knife })}
            />
            <LiveRange label="NMS IoU" value={settings.nms} onChange={(nms) => update({ nms })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="confirm-k">Confirm K</label>
                <Input
                  id="confirm-k"
                  type="number"
                  min={1}
                  max={settings.n}
                  value={settings.k}
                  onChange={(e) =>
                    update({ k: Math.max(1, Math.min(settings.n, Number(e.target.value) || 1)) })
                  }
                />
              </div>
              <div>
                <label htmlFor="confirm-n">Window N</label>
                <Input
                  id="confirm-n"
                  type="number"
                  min={settings.k}
                  max={30}
                  value={settings.n}
                  onChange={(e) =>
                    update({
                      n: Math.max(settings.k, Math.min(30, Number(e.target.value) || settings.k)),
                    })
                  }
                />
              </div>
            </div>
            <LiveRange
              label="Alert cooldown (seconds)"
              value={settings.cooldown}
              min={0}
              max={60}
              step={1}
              onChange={(cooldown) => update({ cooldown })}
            />
            <label htmlFor="target-fps">Target FPS</label>
            <select
              id="target-fps"
              value={settings.fps}
              onChange={(e) => update({ fps: Number(e.target.value) as LiveSettings["fps"] })}
            >
              {[5, 10, 15, 60].map((v) => (
                <option value={v} key={v}>
                  {v === 60 ? "Max" : v}
                </option>
              ))}
            </select>
            <div className="live-toggle">
              <label htmlFor="show-suppressed-live">Show suppressed</label>
              <Switch
                id="show-suppressed-live"
                checked={settings.showSuppressed}
                onCheckedChange={(showSuppressed) => update({ showSuppressed })}
              />
            </div>
            <div className="live-toggle">
              <label htmlFor="alert-sound" className="flex gap-2 items-center">
                {settings.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                Alert sound
              </label>
              <Switch
                id="alert-sound"
                checked={settings.sound}
                onCheckedChange={(sound) => {
                  update({ sound });
                  if (sound) beep();
                }}
              />
            </div>
            <div className="live-toggle">
              <label htmlFor="browser-alerts">Browser notification</label>
              <Switch
                id="browser-alerts"
                checked={settings.notifications}
                onCheckedChange={async (enabled) => {
                  if (!enabled) {
                    update({ notifications: false });
                    return;
                  }
                  if (typeof Notification === "undefined") {
                    setError("Browser notifications are unavailable here.");
                    return;
                  }
                  const permission = await Notification.requestPermission();
                  update({ notifications: permission === "granted" });
                  if (permission !== "granted")
                    setError(
                      "Notifications were not allowed. Enable them in browser site settings.",
                    );
                }}
              />
            </div>
          </section>
        </aside>
      </div>
      <FeedbackLog />
    </>
  );
}
