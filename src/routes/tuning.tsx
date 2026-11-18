import { createFileRoute } from "@tanstack/react-router";
import { Tuning } from "@/pages/tuning";
export const Route = createFileRoute("/tuning")({
  head: () => ({
    meta: [
      { title: "Threshold Tuning | SentinelEye" },
      {
        name: "description",
        content: "Analyze precision, recall and false alarms to optimize per-class thresholds.",
      },
      { property: "og:title", content: "Threshold Tuning | SentinelEye" },
      {
        property: "og:description",
        content: "Analyze precision, recall and false alarms to optimize per-class thresholds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tuning,
});
