import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLive, liveSettingsSchema } from "@/components/live/store";
import { LiveRange } from "./live-camera";
import { download } from "@/lib/metrics";
import { toast } from "sonner";
export function LiveSettingsPage() {
  const { settings, setSettings, reset, clearStored, storageError } = useLive();
  const file = useRef<HTMLInputElement>(null),
    [error, setError] = useState("");
  const update = (patch: Partial<typeof settings>) => setSettings({ ...settings, ...patch });
  return (
    <div className="live-settings">
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">DEVICE-LOCAL PREFERENCES</div>
          <h1>Settings</h1>
          <p>Camera, confirmation and feedback defaults saved on this device.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            toast.success("Live detector defaults restored.");
          }}
        >
          <RotateCcw />
          Reset defaults
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <div className="section-heading">
            <h2>Detection & confirmation</h2>
          </div>
          <LiveRange
            label="Default firearm confidence"
            value={settings.firearm}
            onChange={(firearm) => update({ firearm })}
          />
          <LiveRange
            label="Default knife confidence"
            value={settings.knife}
            onChange={(knife) => update({ knife })}
          />
          <LiveRange
            label="Default NMS IoU"
            value={settings.nms}
            onChange={(nms) => update({ nms })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-k">Confirm K</label>
              <Input
                id="settings-k"
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
              <label htmlFor="settings-n">Window N</label>
              <Input
                id="settings-n"
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
            label="Cooldown seconds"
            value={settings.cooldown}
            min={0}
            max={60}
            step={1}
            onChange={(cooldown) => update({ cooldown })}
          />
          <label htmlFor="settings-fps">Target FPS</label>
          <select
            id="settings-fps"
            value={settings.fps}
            onChange={(e) => update({ fps: Number(e.target.value) as typeof settings.fps })}
          >
            {[5, 10, 15, 60].map((n) => (
              <option key={n} value={n}>
                {n === 60 ? "Max" : n}
              </option>
            ))}
          </select>
        </section>
        <section>
          <div className="section-heading">
            <h2>Camera & privacy</h2>
          </div>
          <label htmlFor="settings-facing">Default lens</label>
          <select
            id="settings-facing"
            value={settings.facing}
            onChange={(e) => update({ facing: e.target.value as typeof settings.facing })}
          >
            <option value="environment">Rear</option>
            <option value="user">Front</option>
          </select>
          <label htmlFor="settings-resolution">Default resolution</label>
          <select
            id="settings-resolution"
            value={settings.resolution}
            onChange={(e) => update({ resolution: e.target.value as typeof settings.resolution })}
          >
            <option value="640x480">640 × 480</option>
            <option value="1280x720">1280 × 720</option>
          </select>
          {[
            { label: "Mirror video", key: "mirror" },
            { label: "Show suppressed detections", key: "showSuppressed" },
          ].map(({ label, key }) => (
            <div className="live-toggle" key={key}>
              <label htmlFor={`settings-${key}`}>{label}</label>
              <Switch
                id={`settings-${key}`}
                checked={settings[key as "mirror" | "showSuppressed"]}
                onCheckedChange={(value) => update({ [key]: value })}
              />
            </div>
          ))}
          <div className="notice mt-5">
            Camera permission is requested only when you press Start camera. Demo and ONNX modes
            never upload frames. Remote API requires explicit consent on the detector page.
          </div>
          <h3 className="mt-5">Offline use</h3>
          <p className="text-muted-foreground mt-2">
            The synthetic test needs no model download. COCO-SSD’s first load requires internet.
            Uploaded ONNX files are saved in browser storage. Published page caching is separate
            from model availability and disabled in editor previews.
          </p>
        </section>
      </div>
      <section className="mt-8">
        <div className="section-heading">
          <h2>Saved data</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() =>
              download(
                "sentineleye-settings.json",
                JSON.stringify({ ...settings, remoteConsent: false }, null, 2),
              )
            }
          >
            <Download />
            Export settings JSON
          </Button>
          <Button variant="outline" onClick={() => file.current?.click()}>
            <Upload />
            Import settings JSON
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                !window.confirm(
                  "Clear saved feedback, ONNX model and live settings from this device?",
                )
              )
                return;
              try {
                await clearStored();
                toast.success("Saved feedback, model and settings cleared.");
              } catch {
                setError("Feedback and settings cleared, but model storage could not be accessed.");
              }
            }}
          >
            <Trash2 />
            Clear stored data
          </Button>
          <input
            ref={file}
            className="hidden"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f)
                try {
                  const parsed = liveSettingsSchema.parse(JSON.parse(await f.text()));
                  setSettings({ ...parsed, remoteConsent: false });
                  setError("");
                  toast.success(
                    "Settings imported. Remote frame sharing remains disabled until you consent.",
                  );
                } catch {
                  setError(
                    "Invalid settings file. Check confidence ranges, camera values and K ≤ N.",
                  );
                }
              e.target.value = "";
            }}
          />
        </div>
        {(error || storageError) && (
          <div className="notice mt-4" role="alert">
            {error || storageError}
          </div>
        )}
      </section>
    </div>
  );
}
