import type { Detector, Frame } from "./types";
import { preprocess, decodeYolo } from "@/lib/letterbox";
import { onnxRuntimeUrl } from "@/lib/onnx-runtime-url";
export class OnnxDetector implements Detector {
  private session: import("onnxruntime-web").InferenceSession | undefined;
  private worker: Worker | undefined;
  private requestId = 0;
  private pending = new Map<
    number,
    {
      resolve: (detections: import("./types").LiveDetection[]) => void;
      reject: (error: Error) => void;
    }
  >();
  constructor(
    private bytes: ArrayBuffer,
    private labels: string[],
    private weapons: string[],
  ) {}
  async load(progress?: (message: string) => void) {
    progress?.("Preparing local ONNX model…");
    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(new URL("./onnx-worker.ts", import.meta.url), { type: "module" });
        this.worker.onmessage = (event) => {
          const pending = this.pending.get(event.data.id);
          if (!pending) return;
          this.pending.delete(event.data.id);
          if (event.data.error) pending.reject(new Error(event.data.error));
          else pending.resolve(event.data.detections ?? []);
        };
        this.worker.onerror = () => {
          for (const p of this.pending.values())
            p.reject(new Error("ONNX worker could not start."));
          this.pending.clear();
        };
        await this.request({
          type: "load",
          bytes: this.bytes.slice(0),
          labels: this.labels,
          weapons: this.weapons,
        });
        progress?.("ONNX ready · background WASM inference");
        return;
      } catch {
        this.worker?.terminate();
        this.worker = undefined;
        progress?.("Using compatible browser execution…");
      }
    }
    const ort = await import("onnxruntime-web");
    ort.env.wasm.wasmPaths = { wasm: await onnxRuntimeUrl(), mjs: new URL("/wasm/ort-wasm-simd-threaded.mjs", self.location.origin).href };
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    try {
      this.session = await ort.InferenceSession.create(this.bytes, {
        executionProviders: ["webgl", "wasm"],
      });
    } catch {
      progress?.("Using compatible WASM execution…");
      this.session = await ort.InferenceSession.create(this.bytes, {
        executionProviders: ["wasm"],
      });
    }
    progress?.("ONNX model ready · on-device");
  }
  async detect(frame: Frame) {
    if (this.worker) {
      const { data, geometry } = preprocess(frame);
      return this.request({ type: "detect", data, geometry }, [data.buffer]);
    }
    if (!this.session) throw new Error("ONNX model is not loaded.");
    const ort = await import("onnxruntime-web");
    const { data, geometry } = preprocess(frame);
    const input = this.session.inputNames[0];
    if (!input) throw new Error("Model has no image input.");
    const tensor = new ort.Tensor("float32", data, [1, 3, 640, 640]);
    const outputs = await this.session.run({ [input]: tensor });
    try {
      const output = outputs[this.session.outputNames[0] ?? ""];
      if (!output || output.type !== "float32")
        throw new Error("Expected a YOLOv8 float32 output.");
      return decodeYolo(
        output.data as Float32Array,
        output.dims,
        this.labels,
        this.weapons,
        geometry,
      );
    } finally {
      tensor.dispose();
      for (const output of Object.values(outputs)) output.dispose();
    }
  }
  private request(
    message: Record<string, unknown>,
    transfer: Transferable[] = [],
  ): Promise<import("./types").LiveDetection[]> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const worker = this.worker;
      if (!worker) {
        reject(new Error("Model worker is unavailable."));
        return;
      }
      const timeout = setTimeout(
        () => {
          this.pending.delete(id);
          reject(new Error("ONNX model took too long to respond. Try a smaller model."));
        },
        message["type"] === "load" ? 60000 : 30000,
      );
      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      worker.postMessage({ ...message, id }, transfer);
    });
  }
  async dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    for (const p of this.pending.values()) p.reject(new Error("Model stopped."));
    this.pending.clear();
    await this.session?.release();
    this.session = undefined;
  }
}
