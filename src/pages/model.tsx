import { useState } from "react";
import { Copy, Cpu, Database, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { trainingHistory } from "@/data/trainingHistory";
const config =
  "model: YOLO-style\nimgsz: 640\nepochs: 50\nbatch: 16\noptimizer: AdamW\naugment: [mosaic, flip, HSV]\nsplit: [0.70, 0.20, 0.10]\ndevice: GPU\nclasses: [firearm, knife]";
export function Model() {
  const [tab, setTab] = useState("loss");
  const series =
    tab === "loss"
      ? [
          { key: "trainBox", name: "Train box loss", color: chartColors.amber },
          { key: "valBox", name: "Validation box loss", color: chartColors.blue },
          { key: "trainCls", name: "Train cls loss", color: chartColors.green },
          { key: "valCls", name: "Validation cls loss", color: chartColors.muted },
        ]
      : tab === "map"
        ? [
            { key: "map", name: "mAP@0.5", color: chartColors.amber },
            { key: "map5095", name: "mAP@0.5:0.95", color: chartColors.blue },
          ]
        : [
            { key: "precision", name: "Precision", color: chartColors.green },
            { key: "recall", name: "Recall", color: chartColors.blue },
          ];
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">TRAINING & EVALUATION</div>
          <h1>Model & dataset</h1>
          <p>The research behind the operating point. Reproducible by design.</p>
        </div>
        <span className="subtle-tag">SYNTHETIC RESULTS</span>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <Cpu className="inline size-4 mr-2 text-primary" />
              YOLO-style object detector
            </h2>
            <span className="subtle-tag">2 CLASSES</span>
          </div>
          <div className="model-specs">
            {[
              ["Input resolution", "640 × 640"],
              ["Training epochs", "50"],
              ["Batch size", "16"],
              ["Optimizer", "AdamW"],
              ["Acceleration", "GPU"],
              ["Train / val / test", "70 / 20 / 10"],
              ["Augmentations", "Mosaic, flip, HSV"],
              ["Target classes", "Firearm, knife"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Training configuration</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard
                  .writeText(config)
                  .then(() => toast.success("Training configuration copied."))
                  .catch(() => toast.error("Clipboard unavailable. Select and copy the snippet."))
              }
            >
              <Copy />
              Copy config
            </Button>
          </div>
          <pre className="config-code">{config}</pre>
        </section>
      </div>
      <section className="panel mt-5">
        <div className="panel-heading">
          <div>
            <h2>Training convergence</h2>
            <p>50 epochs · seeded illustrative training history</p>
          </div>
          <div className="segmented">
            {[
              ["loss", "Loss"],
              ["map", "mAP"],
              ["pr", "Precision / recall"],
            ].map(([k, v]) => (
              <Button
                key={k}
                variant={tab === k ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab(k ?? "loss")}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <Chart data={trainingHistory} x="epoch" series={series} height={310} />
      </section>
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <section className="panel">
          <div className="panel-heading">
            <h2>Evaluation class distribution</h2>
          </div>
          <Chart
            bar
            data={[
              { label: "Firearm", images: 1200 },
              { label: "Knife", images: 1200 },
              { label: "Umbrella", images: 420 },
              { label: "Phone", images: 510 },
              { label: "Tool", images: 380 },
              { label: "Other", images: 290 },
            ]}
            series={[{ key: "images", name: "Labelled images", color: chartColors.blue }]}
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <Database className="inline size-4 mr-2 text-info" />
              Dataset sources
            </h2>
          </div>
          <div className="prose-section">
            <h3>Sohas Weapon Detection dataset</h3>
            <p>
              Reference dataset for handheld and concealed firearm and knife examples. Inspect
              licensing before use.
            </p>
            <Button asChild variant="link">
              <a
                href="https://www.kaggle.com/datasets?search=Sohas+Weapon+Detection"
                target="_blank"
                rel="noreferrer"
              >
                Find on Kaggle
                <ExternalLink />
              </a>
            </Button>
            <h3>Real-Time Gun Detection dataset</h3>
            <p>Reference firearm imagery across different scenes and lighting conditions.</p>
            <Button asChild variant="link">
              <a
                href="https://www.kaggle.com/datasets?search=Real+Time+Gun+Detection"
                target="_blank"
                rel="noreferrer"
              >
                Find on Kaggle
                <ExternalLink />
              </a>
            </Button>
            <p className="notice">
              All displayed results and scenes are synthetic demo data, not measured outcomes from
              these datasets.
            </p>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <h2>Evaluation methodology</h2>
      </div>
      <div className="methodology">
        {[
          [
            "01",
            "Build a labelled hard-negative set",
            "Collect umbrellas, phones and tools across varied poses and lighting. Verify that no actual weapons are present. Split by scene or camera to avoid leakage.",
          ],
          [
            "02",
            "Choose thresholds on validation data",
            "Sweep each class independently. Maximize recall subject to the chosen FP cap, then freeze thresholds before final evaluation.",
          ],
          [
            "03",
            "Report false alarms, not just accuracy",
            "FP / 1,000 = false-positive predictions ÷ evaluated frames × 1,000. Report precision, recall, F1 and missed weapons alongside this operational metric.",
          ],
        ].map(([n, t, p]) => (
          <div key={n}>
            <span className="mono text-primary">{n}</span>
            <h3>{t}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <section className="ethics-section">
        <span className="section-label text-primary">LIMITATIONS & ETHICS</span>
        <h2>A research prototype. Not an autonomous decision-maker.</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {[
            [
              "Human in the loop",
              "A detection is a prompt for trained human review, never a basis for automated enforcement.",
            ],
            [
              "Bias & domain shift",
              "Dataset demographics, poses and lighting may not represent real CCTV. Validate on the intended environment.",
            ],
            [
              "Privacy & misuse",
              "Minimize image retention, respect consent and access controls, and never use this prototype for profiling or unverified accusations.",
            ],
          ].map(([t, p]) => (
            <div key={t}>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
