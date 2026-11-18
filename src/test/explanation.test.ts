import { describe, it, expect } from "vitest";
import { samples } from "@/data/samples";
import { hardNegativeExamples } from "@/data/hardNegatives";
import { getDetectionExplanation } from "@/lib/explanation";
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
});
