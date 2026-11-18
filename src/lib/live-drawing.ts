import type { Frame } from "@/detectors/types";
import { frameSize } from "@/detectors/types";
import type { ConfirmationPipeline, PipelineSettings } from "./temporalConfirm";
import { thresholdFor } from "./temporalConfirm";
type Result = ReturnType<ConfirmationPipeline["process"]>;
export function drawOverlay(
  canvas: HTMLCanvasElement,
  frame: Frame,
  result: Result,
  settings: PipelineSettings & { mirror: boolean; showSuppressed: boolean },
) {
  const { width, height } = frameSize(frame);
  if (!width || !height) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const styles = getComputedStyle(document.documentElement);
  for (const d of result.detections) {
    const suppressed =
      d.weapon &&
      (d.confidence < thresholdFor(d, settings) ||
        result.suppressed.some((t) => t.detection === d));
    if (suppressed && !settings.showSuppressed) continue;
    const color = styles
      .getPropertyValue(
        suppressed
          ? "--muted-foreground"
          : !d.weapon
            ? "--info"
            : d.label === "knife"
              ? "--primary"
              : "--destructive",
      )
      .trim();
    const x = settings.mirror ? width - d.bbox[2] : d.bbox[0],
      y = d.bbox[1],
      w = d.bbox[2] - d.bbox[0],
      h = d.bbox[3] - d.bbox[1];
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash(suppressed ? [2, 5] : !d.weapon ? [8, 5] : []);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    const track = result.tracks.find((t) => t.detection === d),
      hits = track?.history.filter(Boolean).length ?? 0;
    const label = `${d.label}${!d.weapon ? " (ignored)" : ""} ${(d.confidence * 100).toFixed(0)}%${track ? ` · ${Math.min(hits, settings.k)}/${settings.k}` : ""}`;
    ctx.font = "16px JetBrains Mono";
    const chipWidth = Math.min(width, ctx.measureText(label).width + 16);
    const chipX = Math.max(0, Math.min(x, width - chipWidth));
    const chipY = Math.max(24, y);
    ctx.fillStyle = color;
    ctx.fillRect(chipX, chipY - 24, chipWidth, 24);
    ctx.fillStyle = styles.getPropertyValue("--background").trim();
    ctx.fillText(label, chipX + 8, chipY - 7);
    if (track && !suppressed) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(
        x + w - 14,
        y + 15,
        10,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.min(1, hits / settings.k),
      );
      ctx.stroke();
    }
  }
}
export function snapshot(
  frame: Frame,
  overlay: HTMLCanvasElement,
  mirror: boolean,
  thumbnail = false,
) {
  const { width, height } = frameSize(frame);
  const canvas = document.createElement("canvas");
  canvas.width = thumbnail ? 160 : width;
  canvas.height = thumbnail ? Math.round((height * 160) / width) : height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  if (mirror) ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(thumbnail ? "image/jpeg" : "image/png", 0.65);
}
export function drawSample(canvas: HTMLCanvasElement, time: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = getComputedStyle(document.documentElement),
    color = (name: string) => s.getPropertyValue(name).trim();
  const phase = Math.floor(time / 3600) % 3;
  ctx.fillStyle = color("--scene-wall");
  ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = color("--scene-floor");
  ctx.fillRect(0, 240, 640, 120);
  ctx.strokeStyle = color("--scene-line");
  ctx.lineWidth = 2;
  for (let x = 0; x < 640; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 240);
    ctx.stroke();
  }
  ctx.fillStyle = color("--scene-back");
  ctx.fillRect(36, 65, 145, 175);
  ctx.fillRect(478, 60, 120, 180);
  ctx.fillStyle = color("--scene-lamp");
  ctx.fillRect(225, 20, 185, 7);
  ctx.fillStyle = color("--scene-person");
  ctx.beginPath();
  ctx.arc(306, 100, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(281, 128, 54, 100);
  ctx.fillRect(285, 218, 18, 100);
  ctx.fillRect(314, 218, 18, 100);
  ctx.save();
  ctx.translate(322, 157);
  ctx.rotate(-0.3);
  ctx.fillRect(0, 0, 65, 17);
  ctx.restore();
  ctx.fillStyle = color("--scene-metal");
  if (phase === 0) {
    ctx.beginPath();
    ctx.moveTo(369, 165);
    ctx.lineTo(440, 170);
    ctx.lineTo(370, 180);
    ctx.fill();
    ctx.fillStyle = color("--scene-person");
    ctx.fillRect(345, 164, 27, 18);
  } else if (phase === 1) {
    ctx.fillStyle = color("--scene-person");
    ctx.fillRect(350, 157, 90, 12);
    ctx.beginPath();
    ctx.arc(414, 150, 30, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = color("--info");
    ctx.fillRect(360, 158, 24, 38);
  }
  ctx.fillStyle = color("--scene-overlay");
  ctx.font = "12px JetBrains Mono";
  ctx.fillText(
    `SYNTHETIC PIPELINE TEST · ${["KNIFE", "UMBRELLA GUARD", "PHONE IGNORED"][phase]}`,
    20,
    342,
  );
}
