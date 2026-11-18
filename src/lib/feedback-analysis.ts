import type { FeedbackEntry } from "@/components/live/store";
export function feedbackSweep(entries: FeedbackEntry[], label?: string) {
  const reviewed = entries.filter(
    (e) => e.feedback && (label === undefined || e.detection.label === label),
  );
  return Array.from({ length: 91 }, (_, i) => {
    const threshold = Number((0.05 + i * 0.01).toFixed(2));
    return {
      threshold,
      removed: reviewed.filter((e) => e.feedback === "fp" && e.detection.confidence < threshold)
        .length,
      lost: reviewed.filter((e) => e.feedback === "correct" && e.detection.confidence < threshold)
        .length,
    };
  });
}
export function recommendFeedbackThreshold(
  entries: FeedbackEntry[],
  label: string,
  fallback: number,
) {
  if (!entries.some((e) => e.feedback && e.detection.label === label)) return fallback;
  const sweep = feedbackSweep(entries, label);
  return (
    [...sweep].sort(
      (a, b) =>
        b.removed - 3 * b.lost - (a.removed - 3 * a.lost) ||
        Math.abs(a.threshold - fallback) - Math.abs(b.threshold - fallback) ||
        a.threshold - b.threshold,
    )[0]?.threshold ?? fallback
  );
}
export const seededFeedback: FeedbackEntry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `DEMO-${i + 1}`,
  timestamp: 1763481600000 + i * 60000,
  detection: {
    label: i % 2 ? "knife" : "firearm",
    confidence: Number((i < 12 ? 0.28 + i * 0.025 : 0.64 + (i - 12) * 0.035).toFixed(2)),
    bbox: [280, 150, 430, 250],
    weapon: true,
  },
  frames: 4,
  status: "Alert",
  feedback: i < 12 ? "fp" : "correct",
  category: i < 12 ? ["umbrella", "phone", "tool", "other"][i % 4] : undefined,
}));
