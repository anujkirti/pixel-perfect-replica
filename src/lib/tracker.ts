import type { LiveDetection } from "@/detectors/types";
import { boxIou } from "./nms";
export type Track = {
  id: number;
  detection: LiveDetection;
  history: boolean[];
  lastSeen: number;
  lastAlert: number;
  suppressed: boolean;
};
export class Tracker {
  tracks: Track[] = [];
  private nextId = 1;
  update(
    detections: LiveDetection[],
    now: number,
    n: number,
    qualifies: (d: LiveDetection) => boolean,
    guarded: (d: LiveDetection) => boolean,
  ) {
    const matched = new Set<number>();
    for (const d of detections.filter((d) => d.weapon)) {
      let track = this.tracks
        .filter(
          (t) =>
            !matched.has(t.id) &&
            t.detection.label === d.label &&
            boxIou(t.detection.bbox, d.bbox) > 0.3,
        )
        .sort((a, b) => boxIou(b.detection.bbox, d.bbox) - boxIou(a.detection.bbox, d.bbox))[0];
      if (!track) {
        track = {
          id: this.nextId++,
          detection: d,
          history: [],
          lastSeen: now,
          lastAlert: -Infinity,
          suppressed: false,
        };
        this.tracks.push(track);
      }
      track.detection = d;
      track.lastSeen = now;
      track.suppressed = guarded(d);
      track.history.push(qualifies(d) && !track.suppressed);
      track.history = track.history.slice(-n);
      matched.add(track.id);
    }
    for (const track of this.tracks)
      if (!matched.has(track.id)) {
        track.history.push(false);
        track.history = track.history.slice(-n);
      }
    this.tracks = this.tracks.filter((t) => now - t.lastSeen < 2000);
    return this.tracks.filter((t) => matched.has(t.id));
  }
  reset() {
    this.tracks = [];
    this.nextId = 1;
  }
}
