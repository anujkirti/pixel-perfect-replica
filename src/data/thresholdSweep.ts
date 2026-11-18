// REPLACE WITH REAL RESULTS
import { metricsFromCounts } from "@/lib/metrics";
export type Weapon = "firearm" | "knife";
export type SweepPoint = {
  label: Weapon;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  TP: number;
  FP: number;
  FN: number;
  fp_per_1000: number;
};
export const thresholdSweep: SweepPoint[] = (["firearm", "knife"] as const).flatMap((label) => {
  let previousTP = 1200,
    previousFP = 10000;
  return Array.from({ length: 91 }, (_, i) => {
    const threshold = (i + 5) / 100;
    const recall = Math.max(0.12, 0.98 - 0.13 * threshold - 0.72 * Math.pow(threshold, 8));
    const FP = Math.round(760 * Math.exp(-7.4 * threshold) * (label === "knife" ? 0.84 : 1));
    const TP = Math.min(
      previousTP,
      Math.max(Math.round(1200 * recall), Math.ceil((previousTP * FP) / previousFP)),
    );
    previousTP = TP;
    previousFP = FP;
    const FN = 1200 - TP;
    return { label, threshold, TP, FP, FN, ...metricsFromCounts(TP, FP, FN, 10000) };
  });
});
export function pointAt(points: SweepPoint[], label: Weapon, threshold: number) {
  return points
    .filter((p) => p.label === label)
    .reduce<SweepPoint | undefined>(
      (best, p) =>
        !best || Math.abs(p.threshold - threshold) < Math.abs(best.threshold - threshold)
          ? p
          : best,
      undefined,
    );
}
export function recommend(points: SweepPoint[], label: Weapon, cap: number) {
  return points
    .filter((p) => p.label === label && p.fp_per_1000 <= cap)
    .sort((a, b) => b.recall - a.recall)[0];
}
