import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/settings";
export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | SentinelEye" },
      {
        name: "description",
        content: "Configure local preferences, optional model inference and evaluation imports.",
      },
      { property: "og:title", content: "Settings | SentinelEye" },
      {
        property: "og:description",
        content: "Configure local preferences, optional model inference and evaluation imports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
