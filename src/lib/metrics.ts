export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const f1 = (precision: number, recall: number) =>
  precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
export const metricsFromCounts = (tp: number, fp: number, fn: number, frames: number) => ({
  precision: tp + fp ? tp / (tp + fp) : 0,
  recall: tp + fn ? tp / (tp + fn) : 0,
  f1: f1(tp + fp ? tp / (tp + fp) : 0, tp + fn ? tp / (tp + fn) : 0),
  fp_per_1000: frames ? (fp / frames) * 1000 : 0,
});
export function download(name: string, contents: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contents], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
