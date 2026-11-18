import { createFileRoute } from "@tanstack/react-router";
import { Model } from "@/pages/model";
export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "Model & Dataset | SentinelEye" },
      {
        name: "description",
        content: "Explore training convergence, dataset references and evaluation methodology.",
      },
      { property: "og:title", content: "Model & Dataset | SentinelEye" },
      {
        property: "og:description",
        content: "Explore training convergence, dataset references and evaluation methodology.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Model,
});
