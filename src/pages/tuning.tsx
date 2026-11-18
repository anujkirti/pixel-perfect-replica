import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, ArrowRight, SlidersHorizontal, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chart, chartColors } from "@/components/sentinel/charts";
import { useThresholds } from "@/components/sentinel/store";
import { pointAt, recommend, type Weapon, type SweepPoint } from "@/data/thresholdSweep";
import { ThresholdSlider } from "./detector";
import { download, pct } from "@/lib/metrics";
export function Tuning() {
  const { results, thresholds, setThresholds } = useThresholds();
  const navigate = useNavigate();
  const [label, setLabel] = useState<Weapon | "both">("firearm");
  const [chosen, setChosen] = useState({ ...thresholds });
  const [cap, setCap] = useState(5);
  const [sort, setSort] = useState<{ key: keyof SweepPoint; asc: boolean }>({
    key: "threshold",
    asc: true,
  });
  const current = label === "both" ? "firearm" : label;
  const points = results.thresholdSweep.filter((p) => p.label === current);
  const rec = recommend(results.thresholdSweep, current, cap);
  const selected = pointAt(results.thresholdSweep, current, chosen[current]);
  const secondary = results.thresholdSweep.filter((p) => p.label === "knife");
  const chartData = points.map((p) => ({
    ...p,
    knifePrecision: pointAt(secondary, "knife", p.threshold)?.precision,
    knifeF1: pointAt(secondary, "knife", p.threshold)?.f1,
    knifeFP: pointAt(secondary, "knife", p.threshold)?.fp_per_1000,
  }));
  const sorted = useMemo(
    () =>
      [...results.thresholdSweep.filter((p) => label === "both" || p.label === label)].sort(
        (a, b) => {
          const av = a[sort.key],
            bv = b[sort.key];
          return (
            (typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv))) * (sort.asc ? 1 : -1)
          );
        },
      ),
    [results, label, sort],
  );
  const update = (n: number) =>
    setChosen((c) => (label === "both" ? { firearm: n, knife: n } : { ...c, [current]: n }));
  function autoRecommend() {
    const f = recommend(results.thresholdSweep, "firearm", cap);
    const k = recommend(results.thresholdSweep, "knife", cap);
    if ((label === "both" && (!f || !k)) || (label !== "both" && !rec)) {
      toast.error("No threshold satisfies this cap. Increase the acceptable rate.");
      return;
    }
    setChosen((c) => ({
      firearm: label === "knife" ? c.firearm : (f?.threshold ?? c.firearm),
      knife: label === "firearm" ? c.knife : (k?.threshold ?? c.knife),
    }));
  }
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">DECISION BOUNDARY ANALYSIS</div>
          <h1>Threshold tuning</h1>
          <p>Find the smallest threshold that keeps false alarms within your tolerance.</p>
        </div>
        <Button
          onClick={() => {
            setThresholds(chosen);
            void navigate({ to: "/detector" });
            toast.success("Thresholds applied to detector.");
          }}
        >
          Apply to detector
          <ArrowRight />
        </Button>
      </div>
      <div className="tuning-toolbar">
        <div className="segmented">
          {(["firearm", "knife", "both"] as const).map((c) => (
            <Button
              key={c}
              variant={label === c ? "secondary" : "ghost"}
              onClick={() => setLabel(c)}
              className="capitalize"
            >
              {c}
            </Button>
          ))}
        </div>
        <span className="subtle-tag">{points.length} EVALUATION POINTS / CLASS</span>
      </div>
      <div className="tuning-top">
        <section className="panel">
          <div className="panel-heading">
            <h2>False positives per 1,000 frames</h2>
            <span className="subtle-tag text-primary">PRIMARY OBJECTIVE</span>
          </div>
          <Chart
            data={chartData}
            x="threshold"
            series={[
              { key: "fp_per_1000", name: current, color: chartColors.amber },
              ...(label === "both"
                ? [{ key: "knifeFP", name: "knife", color: chartColors.blue }]
                : []),
            ]}
            marker={chosen[current]}
            recommended={rec?.threshold}
            onClick={update}
            height={300}
          />
          <div className="chart-note">
            Recommended at cap {cap}:{" "}
            <strong className="mono text-primary">
              {rec?.threshold.toFixed(2) ?? "No qualifying threshold"}
            </strong>{" "}
            · {current}
          </div>
        </section>
        <section className="panel recommendation">
          <div className="panel-heading">
            <h2>
              <SlidersHorizontal className="inline size-4 mr-2 text-primary" />
              Operating point
            </h2>
          </div>
          <div className="control-body">
            <ThresholdSlider
              label={`${current} threshold${label === "both" ? " / both classes" : ""}`}
              value={chosen[current]}
              onChange={update}
            />
            <label htmlFor="fp-cap" className="text-sm">
              Max acceptable FP / 1,000 frames
            </label>
            <div className="flex gap-2 mt-2">
              <Input
                id="fp-cap"
                type="number"
                min="0"
                step=".1"
                value={cap}
                onChange={(e) => setCap(Math.max(0, Number(e.target.value)))}
              />
              <Button variant="outline" onClick={autoRecommend}>
                Optimize
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Maximum recall subject to the false-positive cap. Independently optimized for each
              class.
            </p>
            <div className="operating-stats">
              {[
                { name: "Precision", value: pct(selected?.precision ?? 0) },
                { name: "Recall", value: pct(selected?.recall ?? 0) },
                { name: "F1", value: (selected?.f1 ?? 0).toFixed(3) },
                { name: "FP / 1,000", value: (selected?.fp_per_1000 ?? 0).toFixed(1) },
                { name: "False positives", value: selected?.FP ?? 0 },
                { name: "Missed weapons", value: selected?.FN ?? 0 },
              ].map((s) => (
                <div key={s.name}>
                  <span>{s.name}</span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <section className="panel">
          <div className="panel-heading">
            <h2>Precision–recall curve</h2>
            <span className="subtle-tag">{current.toUpperCase()}</span>
          </div>
          <Chart
            data={chartData}
            x="recall"
            series={[
              { key: "precision", name: "Precision", color: chartColors.green },
              ...(label === "both"
                ? [{ key: "knifePrecision", name: "Knife precision", color: chartColors.blue }]
                : []),
            ]}
            marker={selected?.recall}
            onClick={(n) => {
              const p = points.reduce<SweepPoint | undefined>(
                (b, p) => (!b || Math.abs(p.recall - n) < Math.abs(b.recall - n) ? p : b),
                undefined,
              );
              if (p) update(p.threshold);
            }}
            yMax={1}
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>F1 vs. threshold</h2>
          </div>
          <Chart
            data={chartData}
            x="threshold"
            series={[
              { key: "f1", name: current, color: chartColors.blue },
              ...(label === "both"
                ? [{ key: "knifeF1", name: "Knife F1", color: chartColors.amber }]
                : []),
            ]}
            marker={chosen[current]}
            onClick={update}
            yMax={1}
          />
        </section>
      </div>
      <div className="notice mt-5">
        <strong>Recall is the trade-off.</strong> A higher threshold suppresses look-alikes, but can
        also remove genuine, low-confidence weapons. Choose an operating point against a labelled
        validation set, not against the test set.
      </div>
      <section className="panel mt-5">
        <div className="panel-heading">
          <h2>Full threshold sweep</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const keys = [
                "label",
                "threshold",
                "precision",
                "recall",
                "f1",
                "TP",
                "FP",
                "FN",
                "fp_per_1000",
              ] as const;
              download(
                "sentineleye-threshold-sweep.csv",
                keys.join(",") +
                  "\n" +
                  sorted.map((p) => keys.map((k) => p[k]).join(",")).join("\n"),
                "text/csv",
              );
            }}
          >
            <Download />
            Download CSV
          </Button>
        </div>
        <div className="table-scroll sweep-table">
          <table>
            <thead>
              <tr>
                {(
                  [
                    "label",
                    "threshold",
                    "precision",
                    "recall",
                    "f1",
                    "TP",
                    "FP",
                    "FN",
                    "fp_per_1000",
                  ] as const
                ).map((key) => (
                  <th key={key}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSort({ key, asc: sort.key === key ? !sort.asc : true })}
                    >
                      {key === "fp_per_1000" ? "FP / 1,000" : key}
                      <ArrowDownUp className="size-3" />
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={`${p.label}${p.threshold}`}
                  className={
                    recommend(results.thresholdSweep, p.label, cap)?.threshold === p.threshold
                      ? "recommended-row"
                      : ""
                  }
                >
                  <td className="capitalize">{p.label}</td>
                  <td className="mono">{p.threshold.toFixed(2)}</td>
                  <td>{pct(p.precision)}</td>
                  <td>{pct(p.recall)}</td>
                  <td>{p.f1.toFixed(3)}</td>
                  <td>{p.TP}</td>
                  <td>{p.FP}</td>
                  <td>{p.FN}</td>
                  <td>{p.fp_per_1000.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
