import { describe, expect, it } from "vitest";
import { metrics } from "@/data/metrics";
import { samples } from "@/data/samples";
import { thresholdSweep, recommend } from "@/data/thresholdSweep";
import { evaluateScene, filterDetections } from "@/lib/detection";
import { resultsSchema, demoResults } from "@/lib/results";
import { hardNegativeStats } from "@/data/hardNegatives";
describe("SentinelEye research rules", () => {
  it("uses requested baseline and tuned metrics", () => {
    expect(metrics.before).toMatchObject({
      map: 0.86,
      precision: 0.78,
      recall: 0.91,
      fp_per_1000: 38.4,
    });
    expect(metrics.after).toMatchObject({
      map: 0.84,
      precision: 0.95,
      recall: 0.87,
      fp_per_1000: 3.1,
    });
  });
  it("uses recommended firearm .62 and knife .58 thresholds", () => {
    expect(metrics.recommended).toEqual({ firearm: 0.62, knife: 0.58 });
  });
  it("contains exactly 12 samples with requested composition", () => {
    expect(samples).toHaveLength(12);
    for (const [kind, n] of [
      ["firearm", 3],
      ["knife", 3],
      ["umbrella", 2],
      ["phone", 2],
      ["tool", 2],
    ] as const)
      expect(samples.filter((s) => s.trueObject === kind)).toHaveLength(n);
  });
  it("suppresses all six moderate-confidence hard negatives at tuned thresholds", () => {
    expect(samples.slice(6).reduce((n, s) => n + evaluateScene(s, metrics.recommended).fp, 0)).toBe(
      0,
    );
    expect(
      samples.slice(6).reduce((n, s) => n + evaluateScene(s, { firearm: 0.25, knife: 0.25 }).fp, 0),
    ).toBe(6);
  });
  it("makes the .55 knife recall cost visible", () => {
    expect(samples[5]?.detections[0]?.confidence).toBe(0.55);
    const scene = samples[5];
    if (!scene) throw new Error("Missing knife sample");
    expect(evaluateScene(scene, metrics.recommended).fn).toBe(1);
    expect(evaluateScene(scene, { firearm: 0.25, knife: 0.25 }).tp).toBe(1);
  });
  it("sweeps .05 to .95 in .01 increments for each class", () => {
    for (const label of ["firearm", "knife"] as const) {
      const p = thresholdSweep.filter((p) => p.label === label);
      expect(p).toHaveLength(91);
      expect(p[0]?.threshold).toBe(0.05);
      expect(p[90]?.threshold).toBe(0.95);
      for (let i = 1; i < p.length; i++) {
        const curr = p[i],
          prev = p[i - 1];
        if (!curr || !prev) throw new Error("Missing point");
        expect(curr.recall).toBeLessThanOrEqual(prev.recall);
        expect(curr.precision).toBeGreaterThanOrEqual(prev.precision);
        expect(curr.FP).toBeLessThanOrEqual(prev.FP);
      }
    }
  });
  it("maximizes recall under default five-FP cap", () => {
    const r = recommend(thresholdSweep, "firearm", 5);
    expect(r?.fp_per_1000).toBeLessThanOrEqual(5);
    expect(
      thresholdSweep
        .filter((p) => p.label === "firearm" && p.fp_per_1000 <= 5)
        .every((p) => p.recall <= (r?.recall ?? 0)),
    ).toBe(true);
    expect(recommend(thresholdSweep, "firearm", 0)).toBeUndefined();
  });
  it("uses specified hard-negative image counts", () => {
    expect(hardNegativeStats.map((s) => s.count)).toEqual([420, 510, 380, 290]);
  });
  it("validates complete results and rejects invalid rates or missing classes", () => {
    expect(resultsSchema.safeParse(demoResults).success).toBe(true);
    expect(
      resultsSchema.safeParse({
        ...demoResults,
        metrics: { ...metrics, after: { ...metrics.after, precision: 1.2 } },
      }).success,
    ).toBe(false);
    expect(
      resultsSchema.safeParse({
        ...demoResults,
        thresholdSweep: thresholdSweep.filter((p) => p.label === "knife"),
      }).success,
    ).toBe(false);
  });
  it("uses NMS to remove overlapping duplicates of the same class", () => {
    const d = samples[0]?.detections[0];
    if (!d) throw new Error("Missing detection");
    expect(
      filterDetections([d, { ...d, confidence: 0.8 }], metrics.recommended, 0.45),
    ).toHaveLength(1);
  });
});
