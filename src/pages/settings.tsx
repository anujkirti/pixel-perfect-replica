import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useThresholds } from "@/components/sentinel/store";
import { resultsSchema, demoResults } from "@/lib/results";
import { download } from "@/lib/metrics";
import { ThresholdSlider } from "./detector";
export function SettingsPage() {
  const {
    settings,
    setSettings,
    thresholds,
    setThresholds,
    results,
    setResults,
    imported,
    revert,
    reset,
  } = useThresholds();
  const [draft, setDraft] = useState({ ...settings });
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  function importJson(raw: string) {
    try {
      const parsed = resultsSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        setError(
          parsed.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .slice(0, 5)
            .join("\n"),
        );
        return;
      }
      setResults(parsed.data);
      setError("");
      toast.success("Results imported and saved on this device.");
    } catch {
      setError("Invalid JSON. Check commas, quotation marks and brackets.");
    }
  }
  function save() {
    if (draft.mode === "live") {
      try {
        const u = new URL(draft.apiUrl);
        if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error();
      } catch {
        toast.error("Enter a valid HTTPS model endpoint.");
        return;
      }
    }
    setSettings(draft);
    toast.success("Connection settings saved.");
  }
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">LOCAL WORKSPACE PREFERENCES</div>
          <h1>Settings</h1>
          <p>Your preferences and imported results stay on this device.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            setDraft({ mode: "demo", apiUrl: "", apiKey: "", nms: 0.45 });
            setJson("");
            setError("");
            toast.success("Demo defaults restored.");
          }}
        >
          <RotateCcw />
          Reset to defaults
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="panel">
          <div className="panel-heading">
            <h2>Inference connection</h2>
            <span className="subtle-tag">OPTIONAL</span>
          </div>
          <div className="form-section">
            <label>Mode</label>
            <div className="segmented w-fit mt-2">
              {(["demo", "live"] as const).map((m) => (
                <Button
                  key={m}
                  variant={draft.mode === m ? "secondary" : "ghost"}
                  onClick={() => setDraft({ ...draft, mode: m })}
                  className="capitalize"
                >
                  {m}
                  {draft.mode === m && <Check />}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Demo mode is entirely local. Live mode sends uploaded images to your chosen endpoint.
            </p>
            <label htmlFor="api-url">Model API URL</label>
            <Input
              id="api-url"
              placeholder="https://your-model.example/predict"
              value={draft.apiUrl}
              onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })}
            />
            <label htmlFor="api-key">
              API key <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              placeholder="Stored only in this browser"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            />
            <div className="notice">
              Browser storage is not a secure vault. Use only a limited-scope demo token. Your
              endpoint must permit this app through CORS.
            </div>
            <Button onClick={save}>
              <Save />
              Save connection
            </Button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Default confidence thresholds</h2>
            <span className="subtle-tag">AUTO-SAVED</span>
          </div>
          <div className="form-section">
            <ThresholdSlider
              label="Firearm default"
              value={thresholds.firearm}
              onChange={(n) => setThresholds({ ...thresholds, firearm: n })}
            />
            <ThresholdSlider
              label="Knife default"
              value={thresholds.knife}
              onChange={(n) => setThresholds({ ...thresholds, knife: n })}
            />
            <div className="notice">
              These thresholds are shared with the detector, threshold tuning and hard-negative
              gallery.
            </div>
            <h3>Offline availability</h3>
            <p>
              After opening each page online in the published app, it can be revisited without a
              connection. Offline caching is disabled in editor previews. Live inference always
              requires a network connection.
            </p>
            <h3>Local data only</h3>
            <p>
              No account, analytics service or remote database. Reset demo removes imported results
              and restores the initial operating point.
            </p>
          </div>
        </section>
      </div>
      <section className="panel mt-5">
        <div className="panel-heading">
          <div>
            <h2>Import evaluation results</h2>
            <p>Replace synthetic metrics with your own validated evaluation output.</p>
          </div>
          <span className={`subtle-tag ${imported ? "text-success" : ""}`}>
            {imported ? "IMPORTED RESULTS ACTIVE" : "DEMO RESULTS ACTIVE"}
          </span>
        </div>
        <div className="form-section">
          <label htmlFor="results-json">Results JSON</label>
          <Textarea
            id="results-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='{"metrics": {...}, "thresholdSweep": [...], "confusionMatrix": {...}, "hardNegativeStats": [...]}'
            className="min-h-44 mono text-xs"
          />
          {error && (
            <pre role="alert" className="import-error">
              {error}
            </pre>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => importJson(json)}>
              <Check />
              Validate & import
            </Button>
            <Button variant="outline" onClick={() => ref.current?.click()}>
              <Upload />
              Choose JSON file
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                revert();
                setJson("");
                setError("");
                toast.success("Demo results restored.");
              }}
            >
              <RotateCcw />
              Revert to demo data
            </Button>
            <input
              ref={ref}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const raw = await f.text();
                  setJson(raw);
                  importJson(raw);
                }
                e.target.value = "";
              }}
            />
          </div>
          <div className="control-divider" />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => download("sentineleye-results.json", JSON.stringify(results, null, 2))}
            >
              <Download />
              Export current results
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                download("sentineleye-example.json", JSON.stringify(demoResults, null, 2))
              }
            >
              <Download />
              Download example schema
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The example is a complete valid import document. Metrics, both class sweeps, 3×3
            matrices, extended 4×3 matrices, and four category statistics are required.
          </p>
        </div>
      </section>
    </>
  );
}
