import type { Box, LiveDetection } from "@/detectors/types";
export function boxIou(a: Box, b: Box) {
  const intersection =
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
    Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const area = (box: Box) => Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
  return intersection / (area(a) + area(b) - intersection || 1);
}
export function nonMaxSuppression(detections: LiveDetection[], threshold: number) {
  const kept: LiveDetection[] = [];
  for (const detection of [...detections].sort((a, b) => b.confidence - a.confidence)) {
    if (
      !kept.some(
        (other) =>
          other.label === detection.label && boxIou(other.bbox, detection.bbox) > threshold,
      )
    )
      kept.push(detection);
  }
  return kept;
}
