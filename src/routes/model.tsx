import { createFileRoute } from "@tanstack/react-router";
import { Model } from "@/pages/model";
export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "ONNX Setup & Model Guide | SentinelEye Live" },
      {
        name: "description",
        content: "Export YOLOv8 to ONNX for on-device camera detection, configure classes and review dataset limitations.",
      },
      { property: "og:title", content: "ONNX Setup & Model Guide | SentinelEye Live" },
      {
        property: "og:description",
        content: "Export YOLOv8 to ONNX for on-device camera detection, configure classes and review dataset limitations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Model,
});
