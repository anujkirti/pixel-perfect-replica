import { createFileRoute } from "@tanstack/react-router";
import { LiveSettingsPage } from "@/pages/live-settings";
export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Device Settings | SentinelEye Live" },
      {
        name: "description",
        content: "Set camera preferences, confirmation thresholds and local feedback storage.",
      },
      { property: "og:title", content: "Device Settings | SentinelEye Live" },
      {
        property: "og:description",
        content: "Set camera preferences, confirmation thresholds and local feedback storage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveSettingsPage,
});
