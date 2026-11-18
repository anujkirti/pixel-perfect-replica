import { createFileRoute } from "@tanstack/react-router";
import { HardNegatives } from "@/pages/hard-negatives";
export const Route = createFileRoute("/hard-negatives")({
  head: () => ({
    meta: [
      { title: "Hard-Negative Analysis | SentinelEye" },
      {
        name: "description",
        content: "Investigate umbrella, phone and tool look-alikes and false-positive suppression.",
      },
      { property: "og:title", content: "Hard-Negative Analysis | SentinelEye" },
      {
        property: "og:description",
        content: "Investigate umbrella, phone and tool look-alikes and false-positive suppression.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HardNegatives,
});
