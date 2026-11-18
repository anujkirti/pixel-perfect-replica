import type { Detector, Frame } from "./types";
import { hardNegativeLabels } from "./types";
export class CocoDetector implements Detector {
  private model: import("@tensorflow-models/coco-ssd").ObjectDetection | undefined;
  async load(progress?: (message: string) => void) {
    progress?.("Loading TensorFlow.js…");
    const tf = await import("@tensorflow/tfjs");
    await tf.ready();
    progress?.("Downloading COCO-SSD weights · first load needs internet…");
    const coco = await import("@tensorflow-models/coco-ssd");
    this.model = await coco.load({ base: "lite_mobilenet_v2" });
    progress?.("Demo model ready · no firearm class");
  }
  async detect(frame: Frame) {
    if (!this.model) throw new Error("Demo model is not loaded.");
    return (await this.model.detect(frame, 40, 0.05))
      .filter((d) => d.class === "knife" || hardNegativeLabels.has(d.class))
      .map((d) => ({
        label: d.class,
        confidence: d.score,
        bbox: [d.bbox[0], d.bbox[1], d.bbox[0] + d.bbox[2], d.bbox[1] + d.bbox[3]] as [
          number,
          number,
          number,
          number,
        ],
        weapon: d.class === "knife",
      }));
  }
  dispose() {
    this.model?.dispose();
    this.model = undefined;
  }
}
