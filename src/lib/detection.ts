import type { Detection, Scene } from "@/data/samples";
import type { Weapon } from "@/data/thresholdSweep";
export type Thresholds = Record<Weapon, number>;
export function iou(a: Detection["bbox"], b: Detection["bbox"]) {
  const area = (c: Detection["bbox"]) => Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
  const intersection =
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
    Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  return intersection / (area(a) + area(b) - intersection || 1);
}
export function filterDetections(detections: Detection[], thresholds: Thresholds, nms = 0.45) {
  const selected: Detection[] = [];
  for (const d of [...detections].sort((a, b) => b.confidence - a.confidence))
    if (
      d.confidence >= thresholds[d.label] &&
      !selected.some((s) => s.label === d.label && iou(s.bbox, d.bbox) > nms)
    )
      selected.push(d);
  return selected;
}
export function evaluateScene(scene: Scene, thresholds: Thresholds, nms = 0.45) {
  const alerts = filterDetections(scene.detections, thresholds, nms);
  const matched = new Set<number>();
  let tp = 0;
  for (const d of alerts) {
    const index = scene.groundTruth.findIndex(
      (g, i) => !matched.has(i) && g.label === d.label && iou(g.bbox, d.bbox) >= 0.5,
    );
    if (index >= 0) {
      tp++;
      matched.add(index);
    }
  }
  return { tp, fp: alerts.length - tp, fn: scene.groundTruth.length - tp, alerts: alerts.length };
}
