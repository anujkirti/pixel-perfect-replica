import { createFileRoute } from "@tanstack/react-router";
import { LiveCamera } from "@/pages/live-camera";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Camera Detector | SentinelEye Live" },
      {
        name: "description",
        content:
          "On-device live camera weapon detection with temporal confirmation and hard-negative guards.",
      },
      { property: "og:title", content: "Live Camera Detector | SentinelEye Live" },
      {
        property: "og:description",
        content:
          "On-device live camera weapon detection with temporal confirmation and hard-negative guards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveCamera,
});
