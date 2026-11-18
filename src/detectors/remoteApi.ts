import { z } from "zod";
import type { Detector, Frame } from "./types";
import { frameSize } from "./types";
const schema = z.object({
  detections: z.array(
    z.object({
      label: z.string(),
      confidence: z.number().min(0).max(1),
      bbox: z
        .tuple([
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
        ])
        .refine((b) => b[2] > b[0] && b[3] > b[1]),
    }),
  ),
});
export class RemoteDetector implements Detector {
  private controller: AbortController | undefined;
  constructor(
    private url: string,
    private weapons: string[],
  ) {}
  async load() {
    const u = new URL(this.url);
    if (u.protocol !== "https:" && u.hostname !== "localhost")
      throw new Error("Use an HTTPS endpoint.");
  }
  async detect(frame: Frame) {
    const { width, height } = frameSize(frame);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Snapshot unavailable.");
    ctx.drawImage(frame, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Snapshot unavailable."))),
        "image/jpeg",
        0.8,
      ),
    );
    const form = new FormData();
    form.append("image", blob, "frame.jpg");
    this.controller = new AbortController();
    const timer = setTimeout(() => this.controller?.abort(), 10000);
    try {
      const response = await fetch(this.url, {
        method: "POST",
        body: form,
        signal: this.controller.signal,
      });
      if (!response.ok) throw new Error(`Endpoint returned ${response.status}.`);
      return schema
        .parse(await response.json())
        .detections.map((d) => ({ ...d, weapon: this.weapons.includes(d.label) }));
    } finally {
      clearTimeout(timer);
    }
  }
  dispose() {
    this.controller?.abort();
  }
}
