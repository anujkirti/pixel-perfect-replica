import { useState } from "react";
import { Download, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLive } from "./store";
import { download } from "@/lib/metrics";
import { toCsv } from "@/lib/csv";
export function FeedbackLog() {
  const { entries, mark, clearLog } = useLive();
  const [filter, setFilter] = useState("all");
  const rows = entries.filter(
    (e) =>
      filter === "all" ||
      (filter === "fp"
        ? e.feedback === "fp"
        : filter === "correct"
          ? e.feedback === "correct"
          : e.status === filter),
  );
  const exportRows = rows.map(({ snapshot, detection, ...e }) => ({
    ...e,
    label: detection.label,
    confidence: detection.confidence,
    bbox: detection.bbox.join(" "),
  }));
  return (
    <section className="mt-6">
      <div className="section-heading">
        <h2>
          Alert & suppression log{" "}
          <span className="mono text-muted-foreground">/ {entries.length}</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          <select
            aria-label="Filter alert log"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All events</option>
            <option>Alert</option>
            <option>Suppressed look-alike</option>
            <option>Suppressed threshold</option>
            <option value="fp">Marked false positive</option>
            <option value="correct">Marked correct</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download("sentineleye-feedback.csv", toCsv(exportRows), "text/csv")}
          >
            <Download />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download("sentineleye-feedback.json", JSON.stringify(rows, null, 2))}
          >
            <Download />
            JSON
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Clear log"
            aria-label="Clear log"
            onClick={() => {
              if (window.confirm("Clear all saved feedback events?")) clearLog();
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Frame</th>
              <th>Time / class</th>
              <th>Confidence</th>
              <th>Confirmed</th>
              <th>Status</th>
              <th>Human review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  {e.snapshot ? (
                    <img
                      src={e.snapshot}
                      alt={`${e.detection.label} event snapshot`}
                      className="live-log-thumb"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td>
                  <span className="mono text-xs">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  <br />
                  {e.detection.label}
                </td>
                <td className="mono">{e.detection.confidence.toFixed(2)}</td>
                <td className="mono">{e.frames}</td>
                <td>
                  <span
                    className={
                      e.feedback === "fp"
                        ? "text-destructive"
                        : e.feedback === "correct"
                          ? "text-success"
                          : "text-primary"
                    }
                  >
                    {e.feedback === "fp"
                      ? "Marked FP"
                      : e.feedback === "correct"
                        ? "Marked correct"
                        : e.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={e.feedback === "correct" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => mark(e.id, "correct")}
                    >
                      <Check />
                      Correct detection
                    </Button>
                    <Button
                      variant={e.feedback === "fp" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => mark(e.id, "fp")}
                    >
                      <X />
                      False positive
                    </Button>
                    {e.feedback === "fp" && (
                      <select
                        aria-label={`False-positive category ${e.id}`}
                        value={e.category ?? "other"}
                        onChange={(event) => mark(e.id, "fp", event.target.value)}
                      >
                        {["umbrella", "phone", "tool", "other"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-10">
                  No events in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
