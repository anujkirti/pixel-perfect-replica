import { describe, it, expect } from "vitest";
import { ConfirmationPipeline } from "@/lib/temporalConfirm";
import { liveDefaults, liveSettingsSchema } from "@/components/live/store";
import { decodeYolo, letterboxGeometry, restoreBox } from "@/lib/letterbox";
import { nonMaxSuppression } from "@/lib/nms";
import { feedbackSweep } from "@/lib/feedback-analysis";
import type { LiveDetection } from "@/detectors/types";
const knife: LiveDetection = {
  label: "knife",
  confidence: 0.8,
  bbox: [10, 10, 100, 100],
  weapon: true,
};
describe("Live detector safety rules", () => {
  it("starts at firearm .60, knife .55 and four of six frames", () => {
    expect(liveDefaults).toMatchObject({ firearm: 0.6, knife: 0.55, k: 4, n: 6 });
  });
  it("alerts only after four qualifying observations and respects cooldown", () => {
    const p = new ConfirmationPipeline();
    for (let i = 0; i < 3; i++)
      expect(p.process([knife], liveDefaults, i * 100).alerts).toHaveLength(0);
    expect(p.process([knife], liveDefaults, 300).alerts).toHaveLength(1);
    expect(p.process([knife], liveDefaults, 400).alerts).toHaveLength(0);
    expect(p.process([knife], liveDefaults, 10400).alerts).toHaveLength(1);
  });
  it("counts missing frames in the six-frame window", () => {
    const p = new ConfirmationPipeline();
    p.process([knife], liveDefaults, 0);
    p.process([knife], liveDefaults, 100);
    for (let i = 2; i < 8; i++) p.process([], liveDefaults, i * 100);
    expect(p.process([knife], liveDefaults, 800).tracks[0]?.history.filter(Boolean)).toHaveLength(
      1,
    );
  });
  it("blocks a weapon overlapping a higher-confidence hard negative above IoU .5", () => {
    const p = new ConfirmationPipeline();
    const umbrella = { ...knife, label: "umbrella", confidence: 0.9, weapon: false };
    for (let i = 0; i < 8; i++) {
      const r = p.process([knife, umbrella], liveDefaults, i * 100);
      expect(r.alerts).toHaveLength(0);
      expect(r.suppressed[0]?.suppressed).toBe(true);
    }
  });
  it("never alerts hard-negative classes even with confidence one", () => {
    const p = new ConfirmationPipeline();
    for (let i = 0; i < 8; i++)
      expect(
        p.process(
          [{ ...knife, label: "scissors", confidence: 1, weapon: false }],
          liveDefaults,
          i * 100,
        ).alerts,
      ).toHaveLength(0);
  });
  it("uses class-specific inclusive confidence thresholds", () => {
    const p = new ConfirmationPipeline();
    const r = p.process([{ ...knife, confidence: 0.55 }], { ...liveDefaults, k: 1 }, 0);
    expect(r.alerts).toHaveLength(1);
    expect(
      new ConfirmationPipeline().process(
        [{ ...knife, label: "firearm", confidence: 0.55 }],
        { ...liveDefaults, k: 1 },
        0,
      ).alerts,
    ).toHaveLength(0);
  });
  it("invalidates histories on reset", () => {
    const p = new ConfirmationPipeline();
    for (let i = 0; i < 3; i++) p.process([knife], liveDefaults, i * 100);
    p.reset();
    expect(p.process([knife], liveDefaults, 300).alerts).toHaveLength(0);
  });
  it("rejects confirmation K above N and out-of-range confidence", () => {
    expect(liveSettingsSchema.safeParse({ ...liveDefaults, k: 7, n: 6 }).success).toBe(false);
    expect(liveSettingsSchema.safeParse({ ...liveDefaults, knife: 0.96 }).success).toBe(false);
  });
  it("maps letterboxed boxes back to 1280 by 720 coordinates", () => {
    const g = letterboxGeometry(1280, 720);
    expect(g).toMatchObject({ scale: 0.5, x: 0, y: 140 });
    expect(restoreBox([100, 190, 200, 240], g)).toEqual([200, 100, 400, 200]);
  });
  it("decodes YOLOv8 channel-major confidence and suppresses duplicate boxes", () => {
    const detections = decodeYolo(
      new Float32Array([320, 320, 240, 240, 100, 100, 80, 80, 0.9, 0.8, 0.1, 0.2]),
      [1, 6, 2],
      ["firearm", "knife"],
      ["firearm", "knife"],
      letterboxGeometry(640, 640),
    );
    expect(detections[0]?.label).toBe("firearm");
    expect(detections[0]?.bbox).toEqual([270, 200, 370, 280]);
    expect(nonMaxSuppression(detections, 0.45)).toHaveLength(1);
  });
  it("sweeps .05 to .95 and distinguishes removed false positives from lost correct events", () => {
    const detection = { ...knife, confidence: 0.5 };
    const entries = [
      {
        id: "a",
        timestamp: 0,
        detection,
        frames: 4,
        status: "Alert" as const,
        feedback: "fp" as const,
      },
      {
        id: "b",
        timestamp: 0,
        detection: { ...detection, confidence: 0.8 },
        frames: 4,
        status: "Alert" as const,
        feedback: "correct" as const,
      },
    ];
    const sweep = feedbackSweep(entries);
    expect(sweep).toHaveLength(91);
    expect(sweep[0]?.threshold).toBe(0.05);
    expect(sweep[90]?.threshold).toBe(0.95);
    expect(sweep.find((s) => s.threshold === 0.6)).toMatchObject({ removed: 1, lost: 0 });
    expect(sweep.find((s) => s.threshold === 0.9)).toMatchObject({ removed: 1, lost: 1 });
  });
});
