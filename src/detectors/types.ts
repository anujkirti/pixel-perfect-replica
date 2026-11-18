export type Box = [number, number, number, number];
export type LiveDetection = { label: string; confidence: number; bbox: Box; weapon: boolean };
export type Frame = HTMLVideoElement | HTMLCanvasElement;
export interface Detector {
  load(onProgress?: (message: string) => void): Promise<void>;
  detect(frame: Frame): Promise<LiveDetection[]>;
  dispose(): void | Promise<void>;
}
export const hardNegativeLabels = new Set([
  "scissors",
  "cell phone",
  "phone",
  "umbrella",
  "baseball bat",
  "bottle",
  "remote",
  "tool",
  "wrench",
]);
export function frameSize(frame: Frame) {
  return frame instanceof HTMLVideoElement
    ? { width: frame.videoWidth, height: frame.videoHeight }
    : { width: frame.width, height: frame.height };
}
