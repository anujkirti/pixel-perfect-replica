import type { Detector, Frame } from "./types";
import { frameSize } from "./types";
export class SampleDetector implements Detector {
  private frame = 0;
  async load() {}
  async detect(source: Frame) {
    const { width, height } = frameSize(source);
    const phase = Math.floor(this.frame++ / 36) % 3;
    const bbox: [number, number, number, number] = [
      width * 0.46,
      height * 0.44,
      width * 0.69,
      height * 0.65,
    ];
    return phase === 0
      ? [{ label: "knife", confidence: 0.78, bbox, weapon: true }]
      : phase === 1
        ? [
            { label: "firearm", confidence: 0.72, bbox, weapon: true },
            { label: "umbrella", confidence: 0.91, bbox, weapon: false },
          ]
        : [{ label: "cell phone", confidence: 0.86, bbox, weapon: false }];
  }
  dispose() {}
}
