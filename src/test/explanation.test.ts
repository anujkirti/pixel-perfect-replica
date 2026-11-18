import { describe, it, expect } from "vitest";
import { samples } from "@/data/samples";
import { hardNegativeExamples } from "@/data/hardNegatives";
import { getDetectionExplanation } from "@/lib/explanation";
import { filterDetections } from "@/lib/detection";
describe("AI demo explanations", () => {
  it("covers all 12 demo and 24 hard-negative scenes", () => {
    const scenes = [...samples, ...hardNegativeExamples];
    expect(scenes).toHaveLength(36);
    for (const s of scenes) {
      const e = getDetectionExplanation(s, { firearm: 0.62, knife: 0.58 });
      expect(e?.id).toBe(s.id);
      expect(e?.source).toBe("Lovable AI Gateway");
    }
  });
  it("updates umbrella review outcome when confidence crosses the threshold", () => {
    const scene = samples.find((s) => s.id === "CAM-07");
    if (!scene) throw new Error("Missing umbrella");
    expect(getDetectionExplanation(scene, { firearm: 0.62, knife: 0.58 })?.outcome).toBe(
      "False alarm suppressed",
    );
    expect(getDetectionExplanation(scene, { firearm: 0.25, knife: 0.25 })?.outcome).toBe(
      "False alarm retained",
    );
  });
  it("reports the low-confidence knife recall cost", () => {
    const scene = samples.find((s) => s.id === "CAM-06");
    if (!scene) throw new Error("Missing knife");
    expect(getDetectionExplanation(scene, { firearm: 0.62, knife: 0.58 })?.outcome).toBe(
      "True weapon missed",
    );
    expect(getDetectionExplanation(scene, { firearm: 0.25, knife: 0.25 })?.outcome).toBe(
      "True weapon retained",
    );
  });
  it("matches detection decisions below, at, and above confidence for all 36 scenes", () => {
    for (const scene of [...samples, ...hardNegativeExamples]) {
      for (const [index, detection] of scene.detections.entries()) {
        for (const offset of [-0.01, 0, 0.01]) {
          const threshold = detection.confidence + offset;
          const thresholds = { firearm: 0.95, knife: 0.95, [detection.label]: threshold };
          const explanation = getDetectionExplanation(scene, thresholds, index);
          expect(explanation?.threshold).toBe(threshold);
          expect(explanation?.retained).toBe(offset <= 0);
          expect(explanation?.retained).toBe(
            filterDetections(scene.detections, thresholds).includes(detection),
          );
        }
      }
    }
  });
  it("keeps each explanation tied to its class threshold and preserves the generated rationale", () => {
    for (const scene of [...samples, ...hardNegativeExamples]) {
      const detection = scene.detections[0];
      if (!detection) throw new Error(`Missing detection for ${scene.id}`);
      const before = getDetectionExplanation(scene, { firearm: 0.25, knife: 0.25 });
      const unrelatedChange = detection.label === "firearm"
        ? { firearm: 0.25, knife: 0.95 }
        : { firearm: 0.95, knife: 0.25 };
      const after = getDetectionExplanation(scene, unrelatedChange);
      expect(before?.retained).toBe(true);
      expect(after?.retained).toBe(true);
      expect(after?.threshold).toBe(0.25);
      expect(after?.rationale).toBe(before?.rationale);
      expect(after?.review).toBe(before?.review);
    }
  });
});
