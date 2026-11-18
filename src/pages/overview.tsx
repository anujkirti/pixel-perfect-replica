import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Crosshair,
  ScanLine,
  SlidersHorizontal,
  ShieldCheck,
  TrendingDown,
  Database,
  CircleCheck,
  TriangleAlert,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThresholds } from "@/components/sentinel/store";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { CctvScene } from "@/components/sentinel/cctv-scene";
import { firstSample } from "@/data/samples";
import { pct } from "@/lib/metrics";
export function Overview() {
  const { results, thresholds, imported } = useThresholds();
  const { before, after } = results.metrics;
  const reduction = (1 - after.fp_per_1000 / (before.fp_per_1000 || 1)) * 100;
  const comparison = [
    { label: "Precision", baseline: before.precision * 100, tuned: after.precision * 100 },
    { label: "Recall", baseline: before.recall * 100, tuned: after.recall * 100 },
    { label: "F1 score", baseline: before.f1 * 100, tuned: after.f1 * 100 },
    { label: "mAP@0.5", baseline: before.map * 100, tuned: after.map * 100 },
  ];
  return (
    <>
      <div className="page-eyebrow">
        <span className="status-dot" /> RESEARCH DASHBOARD{" "}
        <span className="eyebrow-divider">/</span> EVALUATION V1.0
      </div>
      <section className="overview-intro">
        <div>
          <h1>
            Fewer false alarms.
            <br />
            <span className="text-primary">More confidence.</span>
          </h1>
          <p>
            A weapon detection pipeline built around what matters most:
            <br className="hidden md:block" /> keeping false positives low and human judgment in the
            loop.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild>
              <Link to="/detector">
                <ScanLine />
                Open live detector
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/hard-negatives">
                Explore hard negatives
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
        <div className="intro-stamp">
          <ShieldCheck />
          <span>FALSE-POSITIVE FIRST</span>
          <strong>
            {reduction.toFixed(1)}
            <small>%</small>
          </strong>
          <p>fewer false alarms after tuning</p>
          <span className="mono text-success">
            {before.fp_per_1000.toFixed(1)} → {after.fp_per_1000.toFixed(1)} / 1,000 frames
          </span>
        </div>
      </section>
      <div className="pipeline">
        {[
          { icon: Crosshair, title: "Fine-tune detector", text: "Learn firearm & knife features" },
          {
            icon: ScanLine,
            title: "Mine hard negatives",
            text: "Challenge with look-alike objects",
          },
          {
            icon: SlidersHorizontal,
            title: "Tune per-class thresholds",
            text: "Trade a little recall for more trust",
          },
        ].map((p, i) => (
          <div className="pipeline-step" key={p.title}>
            <span className="step-icon">
              <p.icon />
            </span>
            <div>
              <span className="section-label">STEP 0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
            {i < 2 && <ArrowRight className="pipeline-arrow" />}
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2>Performance at a glance</h2>
        <span className="subtle-tag">
          <span className="status-dot" />
          {imported ? "Imported results" : "Tuned vs. baseline · test set"}
        </span>
      </div>
      <div className="kpi-grid">
        {[
          {
            title: "mAP@0.5",
            old: before.map,
            value: after.map,
            delta: `${((after.map - before.map) * 100).toFixed(1)} pp`,
            good: false,
          },
          {
            title: "Precision",
            old: before.precision,
            value: after.precision,
            delta: `+${((after.precision - before.precision) * 100).toFixed(1)} pp`,
            good: true,
          },
          {
            title: "Recall",
            old: before.recall,
            value: after.recall,
            delta: `${((after.recall - before.recall) * 100).toFixed(1)} pp`,
            good: false,
          },
          {
            title: "F1 score",
            old: before.f1,
            value: after.f1,
            delta: `+${((after.f1 - before.f1) * 100).toFixed(1)} pp`,
            good: true,
          },
        ].map((m) => (
          <article className="metric-card" key={m.title}>
            <div className="metric-title">
              {m.title}
              <Activity />
            </div>
            <div className="metric-value">{pct(m.value)}</div>
            <div className="metric-bottom">
              <span>
                from <span className="mono">{pct(m.old)}</span>
              </span>
              <span className={m.good ? "text-success" : "text-primary"}>
                {m.good ? "↗" : "↘"} {m.delta}
              </span>
            </div>
          </article>
        ))}
        <article className="metric-card fp-metric">
          <div className="metric-title">
            False positives / 1,000
            <TrendingDown />
          </div>
          <div className="metric-value">
            {after.fp_per_1000.toFixed(1)}
            <span className="small-unit">FP</span>
          </div>
          <div className="metric-bottom">
            <span>from {before.fp_per_1000}</span>
            <span className="text-success">↓ {reduction.toFixed(1)}%</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-title">
            Confidence thresholds
            <SlidersHorizontal />
          </div>
          <div className="threshold-pair">
            <div>
              <strong>{thresholds.firearm.toFixed(2)}</strong>
              <span>FIREARM</span>
            </div>
            <span className="threshold-separator" />
            <div>
              <strong>{thresholds.knife.toFixed(2)}</strong>
              <span>KNIFE</span>
            </div>
          </div>
          <div className="metric-bottom">
            <span>Per-class · recommended</span>
            <CircleCheck className="text-success size-3" />
          </div>
        </article>
      </div>
      <div className="overview-charts">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Before vs. after tuning</h2>
              <p>A sharper balance between detection and reliability.</p>
            </div>
            <span className="subtle-tag">TEST SET</span>
          </div>
          <Chart
            data={comparison}
            series={[
              { key: "baseline", name: "Baseline · 0.25", color: chartColors.muted },
              { key: "tuned", name: "Tuned thresholds", color: chartColors.amber },
            ]}
            bar
            yMax={100}
          />
        </section>
        <section className="why-panel">
          <span className="section-label text-primary">THE COST OF A FALSE ALARM</span>
          <h2>
            Accuracy is only
            <br />
            part of the story.
          </h2>
          <p>
            In a security control room, every alert asks for someone’s attention. Too many false
            alarms make real threats easier to miss.
          </p>
          <div className="why-item">
            <TriangleAlert />
            <div>
              <h3>Reduce alert fatigue</h3>
              <p>Let operators focus on signals, not noise.</p>
            </div>
          </div>
          <div className="why-item">
            <ShieldCheck />
            <div>
              <h3>Build operator trust</h3>
              <p>Make every detection worth investigating.</p>
            </div>
          </div>
          <div className="why-item">
            <TrendingDown />
            <div>
              <h3>Lower response costs</h3>
              <p>Avoid unnecessary escalations and reviews.</p>
            </div>
          </div>
        </section>
      </div>
      <div className="overview-bottom">
        <section className="panel dataset-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <Database className="inline size-4 mr-2 text-info" />
                Grounded in challenging data
              </h2>
              <p>Weapon datasets enriched with a dedicated hard-negative set.</p>
            </div>
          </div>
          <div className="dataset-row">
            <span>01</span>
            <div>
              <h3>Sohas Weapon Detection</h3>
              <p>Handheld & concealed weapons · Kaggle</p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </div>
          <div className="dataset-row">
            <span>02</span>
            <div>
              <h3>Real-Time Gun Detection</h3>
              <p>Firearms across varied environments · Kaggle</p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2 flex-wrap mt-4">
            {["Firearm", "Knife", "Umbrella", "Phone", "Tools"].map((t) => (
              <span className="subtle-tag" key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="dataset-foot">
            <span className="mono">1,600</span> labelled hard-negative images
            <Button asChild variant="link" size="sm">
              <Link to="/model">
                View dataset
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>
        <section className="panel detector-preview">
          <div className="panel-heading">
            <div>
              <h2>The detector, in action</h2>
              <p>12 CCTV-style scenes. One adjustable decision boundary.</p>
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Open detector">
              <Link to="/detector">
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="preview-frame">
            {firstSample && <CctvScene scene={firstSample} thresholds={thresholds} />}
            <span className="preview-label">
              <span className="status-dot" /> DEMO FEED · CAM-01
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
