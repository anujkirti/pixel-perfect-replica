import type { LiveDetection } from "./types";
import { decodeYolo, type letterboxGeometry } from "@/lib/letterbox";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import wasmModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
let session: import("onnxruntime-web").InferenceSession | undefined;
let labels: string[] = [],
  weapons: string[] = [];
type Message =
  | { id: number; type: "load"; bytes: ArrayBuffer; labels: string[]; weapons: string[] }
  | {
      id: number;
      type: "detect";
      data: Float32Array;
      geometry: ReturnType<typeof letterboxGeometry>;
    };
self.onmessage = async (event: MessageEvent<Message>) => {
  const message = event.data;
  try {
    const ort = await import("onnxruntime-web/wasm");
    if (message.type === "load") {
      ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      session = await ort.InferenceSession.create(message.bytes, { executionProviders: ["wasm"] });
      labels = message.labels;
      weapons = message.weapons;
      self.postMessage({ id: message.id, ready: true });
    } else {
      const input = session?.inputNames[0];
      if (!session || !input) throw new Error("Model input is unavailable.");
      const tensor = new ort.Tensor("float32", message.data, [1, 3, 640, 640]);
      const outputs = await session.run({ [input]: tensor });
      try {
        const output = outputs[session.outputNames[0] ?? ""];
        if (!output || output.type !== "float32")
          throw new Error("Expected a YOLOv8 float32 output.");
        const detections: LiveDetection[] = decodeYolo(
          output.data as Float32Array,
          output.dims,
          labels,
          weapons,
          message.geometry,
        );
        self.postMessage({ id: message.id, detections });
      } finally {
        tensor.dispose();
        for (const output of Object.values(outputs)) output.dispose();
      }
    }
  } catch (error) {
    self.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : "ONNX inference failed.",
    });
  }
};
