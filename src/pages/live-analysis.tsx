import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLive } from "@/components/live/store";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { feedbackSweep, recommendFeedbackThreshold, seededFeedback } from "@/lib/feedback-analysis";
import { toast } from "sonner";
export function LiveAnalysis() {
  const { entries, settings, setSettings } = useLive();
  const demo = entries.length === 0;
  const data = demo ? seededFeedback : entries;
  const reviewed = data.filter((e) => e.feedback),
    correct = reviewed.filter((e) => e.feedback === "correct").length,
    fp = reviewed.filter((e) => e.feedback === "fp").length;
  const categories = ["umbrella", "phone", "tool", "other"].map((label) => ({
    label,
    count: reviewed.filter((e) => e.feedback === "fp" && e.category === label).length,
  }));
  const recommendation = {
    firearm: recommendFeedbackThreshold(data, "firearm", settings.firearm),
    knife: recommendFeedbackThreshold(data, "knife", settings.knife),
  };
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">LOCAL HUMAN FEEDBACK</div>
          <h1>Hard-Negative Analysis</h1>
          <p>Compare false alarms removed with real detections lost.</p>
        </div>
        <span className="subtle-tag">{demo ? "DEMO DATA" : "YOUR LOCAL FEEDBACK"}</span>
      </div>
      <div className="live-stats analysis-stats">
        {[
          ["Reviewed events", reviewed.length],
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
      {!reviewed.length && (
        <div className="notice mt-4">
          No reviewed events yet. Mark detections in the live alert log to calculate
          recommendations.
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section>
          <div className="section-heading">
            <h2>False positives by look-alike</h2>
          </div>
          <Chart
            data={categories}
            bar
            series={[{ key: "count", name: "False positives", color: chartColors.blue }]}
            height={300}
          />
        </section>
        <section>
          <div className="section-heading">
            <h2>Human-labelled summary</h2>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model label</th>
                  <th>Marked correct</th>
                  <th>Marked FP</th>
                  <th>Unreviewed</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set(["firearm", "knife", ...data.map((e) => e.detection.label)])].map(
                  (label) => (
                    <tr key={label}>
                      <th className="capitalize">{label}</th>
                      <td className="text-success">
                        {
                          data.filter(
                            (e) => e.detection.label === label && e.feedback === "correct",
                          ).length
                        }
                      </td>
                      <td className="text-destructive">
                        {
                          data.filter((e) => e.detection.label === label && e.feedback === "fp")
                            .length
                        }
                      </td>
                      <td>
                        {data.filter((e) => e.detection.label === label && !e.feedback).length}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-xs mt-4">
            Event-level feedback is not a full ground-truth confusion matrix. Missed objects that
            never entered the log are unknown.
          </p>
        </section>
      </div>
      <section className="mt-7">
        <div className="section-heading">
          <h2>Threshold re-scoring simulation</h2>
          <span className="subtle-tag">0.05 – 0.95</span>
        </div>
        <Chart
          data={feedbackSweep(data)}
          x="threshold"
          series={[
            { key: "removed", name: "False positives removed", color: chartColors.green },
            { key: "lost", name: "Correct detections lost", color: chartColors.red },
          ]}
          height={320}
        />
        <p className="text-muted-foreground text-xs">
          Re-scores saved confidence values only; does not replay temporal tracking or measure
          unseen false negatives.
        </p>
      </section>
      <section className="live-recommendation mt-6">
        <div>
          <span className="section-label text-success">SUGGESTED OPERATING POINT</span>
          <h2 className="mt-2">
            Firearm <span className="mono text-primary">{recommendation.firearm.toFixed(2)}</span> ·
            Knife <span className="mono text-primary">{recommendation.knife.toFixed(2)}</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Each correct detection lost carries a three-event penalty. Validate on held-out video
            before deployment.
          </p>
        </div>
        <Button
          disabled={!reviewed.length}
          onClick={() => {
            setSettings({ ...settings, ...recommendation });
            toast.success("Recommended thresholds applied to the live detector.");
          }}
        >
          <ShieldCheck />
          Apply recommended thresholds
          <ArrowRight />
        </Button>
      </section>
    </>
  );
}
