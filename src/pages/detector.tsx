import { useEffect, useRef, useState } from "react";
import {
  Play,
  Upload,
  ScanLine,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CctvScene } from "@/components/sentinel/cctv-scene";
import { AiExplanation } from "@/components/sentinel/ai-explanation";
import { useThresholds } from "@/components/sentinel/store";
import { samples, firstSample, type Scene, type Detection } from "@/data/samples";
import { filterDetections, evaluateScene } from "@/lib/detection";
import { mulberry32 } from "@/lib/metrics";
const responseSchema = z.object({
  detections: z.array(
    z.object({
      label: z.enum(["firearm", "knife"]),
      confidence: z.number().min(0).max(1),
      bbox: z
        .tuple([
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
        ])
        .refine((b) => b[2] > b[0] && b[3] > b[1], "Invalid box"),
    }),
  ),
  image_width: z.number().positive(),
  image_height: z.number().positive(),
});
export function ThresholdSlider({
  label,
  value,
  onChange,
  min = 0.05,
  max = 0.95,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="threshold-control">
      <div>
        <label>{label}</label>
        <span className="mono">{value.toFixed(2)}</span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={0.01}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <div className="slider-range">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
export function Detector() {
  const { thresholds, setThresholds, settings, setSettings } = useThresholds();
  const [index, setIndex] = useState(0);
  const [suppressed, setSuppressed] = useState(false);
  const [uploaded, setUploaded] = useState<{
    scene: Scene;
    url: string;
    simulated: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof evaluateScene> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scene = uploaded?.scene ?? samples[index] ?? firstSample;
  const alerts = filterDetections(scene?.detections ?? [], thresholds, settings.nms);
  const stats = scene
    ? evaluateScene(scene, thresholds, settings.nms)
    : { tp: 0, fp: 0, fn: 0, alerts: 0 };
  const suppressedCount = (scene?.detections.length ?? 0) - alerts.length;
  useEffect(
    () => () => {
      if (uploaded) URL.revokeObjectURL(uploaded.url);
    },
    [uploaded],
  );
  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setBusy(true);
    setSummary(null);
    let hash = file.size;
    for (const c of file.name) hash = Math.imul(hash, 31) + c.charCodeAt(0);
    const rng = mulberry32(hash);
    let detections: Detection[] = [
      {
        label: rng() > 0.5 ? "firearm" : "knife",
        confidence: Number((0.3 + rng() * 0.6).toFixed(2)),
        bbox: [290, 140, 440, 260],
      },
    ];
    let simulated = true;
    try {
      if (settings.mode === "live" && settings.apiUrl) {
        const form = new FormData();
        form.append("image", file);
        const res = await fetch(settings.apiUrl, {
          method: "POST",
          body: form,
          headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {},
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error("Endpoint response failed");
        const data = responseSchema.parse(await res.json());
        detections = data.detections.map((d) => ({
          ...d,
          bbox: [
            (d.bbox[0] / data.image_width) * 640,
            (d.bbox[1] / data.image_height) * 360,
            (d.bbox[2] / data.image_width) * 640,
            (d.bbox[3] / data.image_height) * 360,
          ],
        }));
        simulated = false;
      }
    } catch {
      toast.error("The model could not respond. Showing simulated demo results instead.");
    }
    setUploaded({
      url: URL.createObjectURL(file),
      simulated,
      scene: {
        id: "UPLOAD",
        name: file.name,
        location: "Uploaded image",
        sceneSeed: hash,
        trueObject: "other",
        groundTruth: [],
        detections,
      },
    });
    setBusy(false);
  }
  function runAll() {
    setSummary(
      samples.reduce(
        (s, scene) => {
          const r = evaluateScene(scene, thresholds, settings.nms);
          return { tp: s.tp + r.tp, fp: s.fp + r.fp, fn: s.fn + r.fn, alerts: s.alerts + r.alerts };
        },
        { tp: 0, fp: 0, fn: 0, alerts: 0 },
      ),
    );
  }
  if (!scene) return <div className="notice">No demo scenes available.</div>;
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">INTERACTIVE INFERENCE</div>
          <h1>Live detector</h1>
          <p>Inspect the signal. Adjust the threshold. Verify the alert.</p>
        </div>
        <span className="subtle-tag">
          <span className="status-dot" />
          {settings.mode === "live" ? "LIVE ENDPOINT" : "DEMO INFERENCE"}
        </span>
      </div>
      <div className="detector-layout">
        <div className="min-w-0">
          <section className="panel viewer-panel">
            <div className="viewer-toolbar">
              <span>
                <ScanLine className="size-4" /> {scene.id}{" "}
                <span className="text-muted-foreground">/ {scene.location}</span>
              </span>
              <span className="mono text-muted-foreground">640 × 360</span>
            </div>
            <div className="main-viewer">
              <CctvScene
                scene={scene}
                thresholds={thresholds}
                showSuppressed={suppressed}
                imageUrl={uploaded?.url}
                detections={scene.detections}
              />
              {busy && (
                <div className="viewer-loading">
                  <LoaderCircle className="animate-spin" />
                  Processing image…
                </div>
              )}
            </div>
            <div className={`detection-status ${alerts.length ? "alert" : "cleared"}`}>
              {alerts.length ? <TriangleAlert /> : <ShieldCheck />}
              <strong>
                {alerts.length
                  ? `Possible ${[...new Set(alerts.map((d) => d.label))].join(" / ")}`
                  : "No weapon detected"}
              </strong>
              <span>
                {suppressedCount > 0
                  ? `${suppressedCount} low-confidence detection${suppressedCount > 1 ? "s" : ""} suppressed`
                  : "Human verification required"}
              </span>
            </div>
          </section>
          {uploaded && (
            <div className="notice mt-3">
              {uploaded.simulated
                ? "Simulated result – connect a real model in Settings."
                : "Live model result. Human verification required."}{" "}
              Ground truth unavailable.
            </div>
          )}
          <div className="section-heading">
            <h2>
              Sample scenes <span className="text-muted-foreground mono text-xs">/ 12</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload />
              Upload image
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="scene-picker">
            {samples.map((s, i) => (
              <Button
                key={s.id}
                variant="ghost"
                className={`scene-thumbnail ${!uploaded && index === i ? "selected" : ""}`}
                onClick={() => {
                  setIndex(i);
                  setUploaded(null);
                  setSummary(null);
                }}
                aria-label={`Select ${s.name}`}
              >
                <CctvScene scene={s} compact detections={[]} />
                <span>{s.name}</span>
              </Button>
            ))}
          </div>
          <section className="panel mt-5">
            <div className="panel-heading">
              <h2>Detection results</h2>
              <span className="subtle-tag">
                {scene.detections.length} RAW DETECTION{scene.detections.length !== 1 ? "S" : ""}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Confidence</th>
                    <th>Box [x₁, y₁, x₂, y₂]</th>
                    <th>Status</th>
                    <th>True object</th>
                  </tr>
                </thead>
                <tbody>
                  {scene.detections.map((d, i) => (
                    <tr key={i}>
                      <td className="capitalize">{d.label}</td>
                      <td className="mono">{d.confidence.toFixed(2)}</td>
                      <td className="mono text-muted-foreground">
                        {d.bbox.map((n) => Math.round(n)).join(", ")}
                      </td>
                      <td>
                        <span
                          className={`subtle-tag ${alerts.includes(d) ? "text-destructive" : "text-primary"}`}
                        >
                          {alerts.includes(d) ? "ALERT" : "SUPPRESSED"}
                        </span>
                      </td>
                      <td className="capitalize">{uploaded ? "Unknown" : scene.trueObject}</td>
                    </tr>
                  ))}
                  {!scene.detections.length && (
                    <tr>
                      <td colSpan={5}>No raw detections returned for this image.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {!uploaded &&
            scene.detections.map((_, i) => (
              <AiExplanation
                key={`${scene.id}-${i}`}
                scene={scene}
                thresholds={thresholds}
                index={i}
              />
            ))}
        </div>
        <aside className="detector-controls panel">
          <div className="panel-heading">
            <h2>
              <SlidersHorizontalIcon />
              Detection controls
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset detector thresholds"
              title="Reset thresholds"
              onClick={() => setThresholds({ firearm: 0.62, knife: 0.58 })}
            >
              <RotateCcw />
            </Button>
          </div>
          <div className="control-body">
            <span className="section-label">CONFIDENCE PRESET</span>
            <div className="preset-group">
              {[
                { name: "High recall", f: 0.25, k: 0.25 },
                { name: "Balanced", f: 0.45, k: 0.45 },
                { name: "Low false positives", f: 0.62, k: 0.58 },
              ].map((p) => (
                <Button
                  key={p.name}
                  variant={
                    thresholds.firearm === p.f && thresholds.knife === p.k ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setThresholds({ firearm: p.f, knife: p.k })}
                >
                  {p.name}
                  {p.f === 0.62 && <ShieldCheck />}
                </Button>
              ))}
            </div>
            <ThresholdSlider
              label="Global confidence"
              value={(thresholds.firearm + thresholds.knife) / 2}
              onChange={(n) => setThresholds({ firearm: n, knife: n })}
            />
            <div className="control-divider" />
            <span className="section-label">PER-CLASS THRESHOLDS</span>
            <ThresholdSlider
              label="Firearm"
              value={thresholds.firearm}
              onChange={(n) => setThresholds({ ...thresholds, firearm: n })}
            />
            <ThresholdSlider
              label="Knife"
              value={thresholds.knife}
              onChange={(n) => setThresholds({ ...thresholds, knife: n })}
            />
            <div className="control-divider" />
            <ThresholdSlider
              label="NMS IoU"
              value={settings.nms}
              onChange={(n) => setSettings({ ...settings, nms: n })}
            />
            <div className="flex justify-between gap-2 items-center text-sm">
              <label htmlFor="suppressed">Show suppressed detections</label>
              <Switch id="suppressed" checked={suppressed} onCheckedChange={setSuppressed} />
            </div>
            <div className="control-divider" />
            <span className="section-label">CURRENT SCENE</span>
            <div className="scene-counters">
              {[
                { label: "True positive", value: stats.tp, cls: "text-success" },
                { label: "False positive", value: stats.fp, cls: "text-destructive" },
                { label: "False negative", value: stats.fn, cls: "text-primary" },
              ].map((c) => (
                <div key={c.label}>
                  <strong className={c.cls}>{uploaded ? "—" : c.value}</strong>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
            <Button className="w-full mt-5" variant="outline" onClick={runAll}>
              <Play />
              Run on all 12 samples
            </Button>
            {summary && (
              <div className="batch-summary">
                <h3>12-sample evaluation</h3>
                <dl>
                  <div>
                    <dt>Total alerts</dt>
                    <dd>{summary.alerts}</dd>
                  </div>
                  <div>
                    <dt>False alarms</dt>
                    <dd className="text-destructive">{summary.fp}</dd>
                  </div>
                  <div>
                    <dt>Missed weapons</dt>
                    <dd className="text-primary">{summary.fn}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
function SlidersHorizontalIcon() {
  return <ScanLine className="inline size-4 mr-2 text-primary" />;
}
