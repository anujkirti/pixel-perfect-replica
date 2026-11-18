import { createFileRoute } from "@tanstack/react-router";
import { LiveAnalysis } from "@/pages/live-analysis";
export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Feedback Analysis | SentinelEye Live" },
      {
        name: "description",
        content:
          "Analyze local human-reviewed weapon detections and tune thresholds against false positives.",
      },
      { property: "og:title", content: "Feedback Analysis | SentinelEye Live" },
      {
        property: "og:description",
        content: "Analyze local feedback, hard negatives and threshold trade-offs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveAnalysis,
});
