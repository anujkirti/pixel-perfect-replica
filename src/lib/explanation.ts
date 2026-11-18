import generated from "@/data/aiExplanations.json";
import type { Scene } from "@/data/samples";
import type { Thresholds } from "./detection";
export function getDetectionExplanation(scene: Scene, thresholds: Thresholds, index = 0) {
  const explanation = generated.explanations.find((e) => e.id === scene.id);
  const detection = scene.detections[index];
  if (!explanation || !detection) return null;
  const threshold = thresholds[detection.label];
  const retained = detection.confidence >= threshold;
  const weapon = scene.trueObject === "firearm" || scene.trueObject === "knife";
  const outcome = weapon
    ? retained
      ? "True weapon retained"
      : "True weapon missed"
    : retained
      ? "False alarm retained"
      : "False alarm suppressed";
  return { ...explanation, threshold, retained, outcome, source: generated.source };
}
