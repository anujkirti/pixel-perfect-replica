import { useState } from "react";
import { ArrowUpRight, ShieldCheck, Umbrella, Smartphone, Wrench, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { CctvScene } from "@/components/sentinel/cctv-scene";
import { useThresholds } from "@/components/sentinel/store";
import { hardNegativeExamples } from "@/data/hardNegatives";
import { pct } from "@/lib/metrics";
export function HardNegatives() {
  const { results, thresholds } = useThresholds();
  const [baseline, setBaseline] = useState(false);
  const [category, setCategory] = useState("all");
  const [order, setOrder] = useState("desc");
  const [example, setExample] = useState<(typeof hardNegativeExamples)[number] | null>(null);
  const stats = results.hardNegativeStats;
  const removed = stats.reduce((s, c) => s + c.before - c.after, 0);
  const matrix = baseline
    ? results.confusionMatrix.extended.baseline
    : results.confusionMatrix.extended.tuned;
  const gallery = hardNegativeExamples
    .filter((s) => category === "all" || s.category === category)
    .sort(
      (a, b) =>
        ((b.detections[0]?.confidence ?? 0) - (a.detections[0]?.confidence ?? 0)) *
        (order === "desc" ? 1 : -1),
    );
  const rateData = Array.from({ length: 19 }, (_, i) => {
    const threshold = Number((0.05 + i * 0.05).toFixed(2));
    return {
      threshold,
      ...Object.fromEntries(
        stats.map((s, j) => [
          s.category,
          Number(
            ((s.before / s.count) * 100 * Math.exp(-(threshold - 0.25) * (7 + j * 0.8))).toFixed(2),
          ),
        ]),
      ),
    };
  });
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">HARD-NEGATIVE EVALUATION</div>
          <h1>When ordinary objects look like threats.</h1>
          <p>1,600 labelled look-alikes. A closer look at the mistakes that matter.</p>
        </div>
        <span className="subtle-tag text-success">
          <ShieldCheck className="size-3" /> {removed} FALSE ALARMS REMOVED
        </span>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="panel">
          <div className="panel-heading">
            <h2>Hard-negative confusion matrix</h2>
            <div className="segmented">
              <Button
                size="sm"
                variant={baseline ? "secondary" : "ghost"}
                onClick={() => setBaseline(true)}
              >
                Baseline
              </Button>
              <Button
                size="sm"
                variant={!baseline ? "secondary" : "ghost"}
                onClick={() => setBaseline(false)}
              >
                Tuned
              </Button>
            </div>
          </div>
          <div className="matrix-wrap">
            <span className="section-label">PREDICTED LABEL →</span>
            <table className="heatmap">
              <thead>
                <tr>
                  <th>True object ↓</th>
                  {results.confusionMatrix.labels.map((l) => (
                    <th key={l}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.category}>
                    <th>{s.category}</th>
                    {matrix[i]?.map((n, j) => (
                      <td
                        key={j}
                        className={j === 2 ? "heat-cleared" : n > 20 ? "heat-alert" : "heat-low"}
                      >
                        {n}
                        <small>{pct(n / s.count)}</small>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-4">
              Rows are actual look-alikes. Columns are model predictions.
            </p>
          </div>
          <details className="standard-matrix">
            <summary>Weapon & background confusion matrix</summary>
            <table>
              <thead>
                <tr>
                  <th>Actual / predicted</th>
                  {results.confusionMatrix.labels.map((l) => (
                    <th key={l}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(baseline ? results.confusionMatrix.baseline : results.confusionMatrix.tuned).map(
                  (row, i) => (
                    <tr key={i}>
                      <th>{results.confusionMatrix.labels[i]}</th>
                      {row.map((n, j) => (
                        <td key={j}>{n}</td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </details>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>False positives by category</h2>
            <span className="subtle-tag">BEFORE / AFTER</span>
          </div>
          <Chart
            data={stats.map((s) => ({ ...s, label: s.category }))}
            bar
            series={[
              { key: "before", name: "Baseline", color: chartColors.muted },
              { key: "after", name: "Tuned", color: chartColors.amber },
            ]}
            height={330}
          />
        </section>
      </div>
      <section className="panel mt-5">
        <div className="panel-heading">
          <div>
            <h2>False-positive rate vs. confidence threshold</h2>
            <p>Illustrative category response curves · percentage of category images</p>
          </div>
        </div>
        <Chart
          data={rateData}
          x="threshold"
          series={stats.map((s, i) => ({
            key: s.category,
            name: s.category,
            color:
              [chartColors.amber, chartColors.blue, chartColors.green, chartColors.muted][i] ??
              chartColors.muted,
          }))}
          marker={thresholds.firearm}
        />
      </section>
      <section className="panel mt-5">
        <div className="panel-heading">
          <h2>Category breakdown</h2>
          <span className="subtle-tag">TUNED OPERATING POINT</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Images</th>
                <th>Baseline FP</th>
                <th>Tuned FP</th>
                <th>FP rate</th>
                <th>Mean FP confidence</th>
                <th>Most confused as</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.category}>
                  <td className="capitalize">{s.category}</td>
                  <td>{s.count}</td>
                  <td>{s.before}</td>
                  <td className="text-success">{s.after}</td>
                  <td>{pct(s.fpRate)}</td>
                  <td className="mono">{s.meanConfidence.toFixed(2)}</td>
                  <td>{s.confusedAs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>The false-positive gallery</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Raw model detections, before the threshold makes the decision.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {stats.map((s) => (
              <option key={s.category}>{s.category}</option>
            ))}
          </select>
          <select
            aria-label="Sort confidence"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="desc">Highest confidence</option>
            <option value="asc">Lowest confidence</option>
          </select>
        </div>
      </div>
      <div className="gallery-grid">
        {gallery.map((s) => (
          <Button key={s.id} variant="ghost" className="gallery-card" onClick={() => setExample(s)}>
            <CctvScene scene={s} compact thresholds={thresholds} showSuppressed />
            <div>
              <span className="section-label">
                {s.id}
                <ArrowUpRight className="size-3" />
              </span>
              <h3>
                {s.category} → {s.detections[0]?.label ?? "firearm"}{" "}
                <span className="mono">{(s.detections[0]?.confidence ?? 0).toFixed(2)}</span>
              </h3>
              <p
                className={
                  (s.detections[0]?.confidence ?? 0) <
                  thresholds[s.detections[0]?.label ?? "firearm"]
                    ? "text-success"
                    : "text-destructive"
                }
              >
                {(s.detections[0]?.confidence ?? 0) <
                thresholds[s.detections[0]?.label ?? "firearm"]
                  ? "Suppressed"
                  : "False alarm"}{" "}
                at {thresholds[s.detections[0]?.label ?? "firearm"].toFixed(2)}
              </p>
            </div>
          </Button>
        ))}
      </div>
      {!gallery.length && <div className="notice">No examples in this category.</div>}
      <div className="section-heading">
        <h2>Why it fails — and what helps</h2>
      </div>
      <div className="insight-grid">
        {[
          {
            icon: Umbrella,
            title: "Umbrellas resemble long guns",
            text: "Elongated silhouettes hide the distinguishing details.",
            fix: "Mine varied umbrella poses and add temporal smoothing.",
          },
          {
            icon: Smartphone,
            title: "Phones held like pistols",
            text: "Hand pose and a dark rectangular object create ambiguity.",
            fix: "Use hand-context cues and targeted hard negatives.",
          },
          {
            icon: Wrench,
            title: "Tools resemble knives",
            text: "Metal edges and narrow handles share visual features.",
            fix: "Tune class-specific thresholds; diversify tool examples.",
          },
          {
            icon: Eye,
            title: "Low light & motion blur",
            text: "Lost texture leaves the model reliant on silhouette.",
            fix: "Higher input resolution and multi-frame verification.",
          },
        ].map((s) => (
          <article className="panel insight" key={s.title}>
            <s.icon />
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <span className="section-label text-success">MITIGATION</span>
            <p>{s.fix}</p>
          </article>
        ))}
      </div>
      <div className="notice mt-5">
        <strong className="text-success">Trade-off: {removed} false alarms removed</strong> on the
        hard-negative set; weapon recall falls from {pct(results.metrics.before.recall)} to{" "}
        {pct(results.metrics.after.recall)} (
        {Math.round((results.metrics.before.recall - results.metrics.after.recall) * 2400)} fewer
        true weapons detected in an illustrative 2,400-weapon set). Always report both.
      </div>
      <Dialog
        open={!!example}
        onOpenChange={(open) => {
          if (!open) setExample(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {example?.id} · {example?.category} look-alike
            </DialogTitle>
            <DialogDescription>False-positive review at the current thresholds.</DialogDescription>
          </DialogHeader>
          {example && (
            <>
              <CctvScene scene={example} thresholds={thresholds} showSuppressed />
              <p className="text-sm text-muted-foreground">
                The ground-truth object is a {example.category}, not a weapon. Its shape and
                low-light hand pose resemble a {example.detections[0]?.label ?? "firearm"}. Raw
                confidence {(example.detections[0]?.confidence ?? 0).toFixed(2)} is compared against
                the current {thresholds[example.detections[0]?.label ?? "firearm"].toFixed(2)}{" "}
                threshold. Add similar labelled negatives and confirm detections across multiple
                frames.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
