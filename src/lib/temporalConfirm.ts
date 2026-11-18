import type { LiveDetection } from "@/detectors/types";
import { Tracker } from "./tracker";
import { boxIou, nonMaxSuppression } from "./nms";
export type PipelineSettings = {
  firearm: number;
  knife: number;
  nms: number;
  k: number;
  n: number;
  cooldown: number;
};
export function thresholdFor(d: LiveDetection, settings: PipelineSettings) {
  return d.label === "knife" ? settings.knife : settings.firearm;
}
export class ConfirmationPipeline {
  private tracker = new Tracker();
  process(raw: LiveDetection[], settings: PipelineSettings, now: number) {
    const detections = nonMaxSuppression(raw, settings.nms);
    const hardNegatives = detections.filter((d) => !d.weapon);
    const tracks = this.tracker.update(
      detections,
      now,
      settings.n,
      (d) => d.confidence >= thresholdFor(d, settings),
      (d) => hardNegatives.some((h) => h.confidence > d.confidence && boxIou(h.bbox, d.bbox) > 0.5),
    );
    const confirmed = tracks.filter(
      (t) =>
        t.history.filter(Boolean).length >= settings.k &&
        !t.suppressed &&
        t.detection.confidence >= thresholdFor(t.detection, settings),
    );
    const alerts = confirmed.filter((t) => now - t.lastAlert >= settings.cooldown * 1000);
    for (const t of alerts) t.lastAlert = now;
    const suppressed = tracks.filter(
      (t) => t.suppressed || t.detection.confidence < thresholdFor(t.detection, settings),
    );
    return {
      detections,
      tracks,
      alerts,
      suppressed,
      status: confirmed.length
        ? "alert"
        : tracks.some(
              (t) => !t.suppressed && t.detection.confidence >= thresholdFor(t.detection, settings),
            )
          ? "candidate"
          : "clear",
    } as const;
  }
  reset() {
    this.tracker.reset();
  }
}
