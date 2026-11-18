import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/pages/overview";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview | SentinelEye" },
      {
        name: "description",
        content:
          "Weapon detection research dashboard comparing baseline and tuned false-positive performance.",
      },
      { property: "og:title", content: "Overview | SentinelEye" },
      {
        property: "og:description",
        content:
          "Weapon detection research dashboard comparing baseline and tuned false-positive performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});
