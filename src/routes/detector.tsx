import { createFileRoute } from "@tanstack/react-router";
import { Detector } from "@/pages/detector";
export const Route = createFileRoute("/detector")({
  head: () => ({
    meta: [
      { title: "Live Detector | SentinelEye" },
      {
        name: "description",
        content: "Inspect CCTV demo scenes and tune firearm and knife confidence thresholds.",
      },
      { property: "og:title", content: "Live Detector | SentinelEye" },
      {
        property: "og:description",
        content: "Inspect CCTV demo scenes and tune firearm and knife confidence thresholds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detector,
});
