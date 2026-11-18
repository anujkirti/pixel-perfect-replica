import type { Box, Frame } from "@/detectors/types";
import { frameSize } from "@/detectors/types";
export function letterboxGeometry(width: number, height: number, size = 640) {
  const scale = Math.min(size / width, size / height);
  return {
    scale,
    x: (size - width * scale) / 2,
    y: (size - height * scale) / 2,
    width,
    height,
    size,
  };
}
export function restoreBox(box: Box, geometry: ReturnType<typeof letterboxGeometry>): Box {
  const { x, y, scale, width, height } = geometry;
  return [
    Math.max(0, Math.min(width, (box[0] - x) / scale)),
    Math.max(0, Math.min(height, (box[1] - y) / scale)),
    Math.max(0, Math.min(width, (box[2] - x) / scale)),
    Math.max(0, Math.min(height, (box[3] - y) / scale)),
  ];
}
export function preprocess(frame: Frame) {
  const { width, height } = frameSize(frame);
  if (!width || !height) throw new Error("The video frame is not ready.");
  const geometry = letterboxGeometry(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process video frames.");
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, 640, 640);
  ctx.drawImage(frame, geometry.x, geometry.y, width * geometry.scale, height * geometry.scale);
  const pixels = ctx.getImageData(0, 0, 640, 640).data;
  const data = new Float32Array(3 * 640 * 640);
  for (let i = 0; i < 640 * 640; i++)
    for (let c = 0; c < 3; c++) data[c * 640 * 640 + i] = (pixels[i * 4 + c] ?? 0) / 255;
  return { data, geometry };
}
export function decodeYolo(
  data: ArrayLike<number>,
  dims: readonly number[],
  labels: string[],
  weapons: string[],
  geometry: ReturnType<typeof letterboxGeometry>,
) {
  if (dims.length !== 3 || dims[0] !== 1 || dims[1] !== 4 + labels.length)
    throw new Error(
      `Expected YOLOv8 output [1, ${4 + labels.length}, boxes]. Check the model and class names.`,
    );
  const count = dims[2] ?? 0;
  const detections = [];
  for (let i = 0; i < count; i++) {
    let score = 0,
      classIndex = 0;
    for (let c = 0; c < labels.length; c++) {
      const value = Number(data[(4 + c) * count + i] ?? 0);
      if (value > score) {
        score = value;
        classIndex = c;
      }
    }
    if (score < 0.05 || !Number.isFinite(score)) continue;
    const x = Number(data[i]),
      y = Number(data[count + i]),
      w = Number(data[2 * count + i]),
      h = Number(data[3 * count + i]);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    const label = labels[classIndex];
    if (!label) continue;
    detections.push({
      label,
      confidence: score,
      bbox: restoreBox([x - w / 2, y - h / 2, x + w / 2, y + h / 2], geometry),
      weapon: weapons.includes(label),
    });
  }
  return detections;
}
