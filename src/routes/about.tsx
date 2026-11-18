import { createFileRoute } from "@tanstack/react-router";
import { About } from "@/pages/about";
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Documentation | SentinelEye" },
      {
        name: "description",
        content: "Research objectives, inference API contract and evaluation JSON import format.",
      },
      { property: "og:title", content: "Documentation | SentinelEye" },
      {
        property: "og:description",
        content: "Research objectives, inference API contract and evaluation JSON import format.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});
