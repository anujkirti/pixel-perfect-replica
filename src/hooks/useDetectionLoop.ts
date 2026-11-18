import { useEffect, useRef, useState } from "react";
import type { Detector, Frame, LiveDetection } from "@/detectors/types";
export function useDetectionLoop({
  detector,
  source,
  active,
  fps,
  onFrame,
  onError,
}: {
  detector: Detector | null;
  source: () => Frame | null;
  active: boolean;
  fps: number;
  onFrame: (detections: LiveDetection[], latency: number) => void;
  onError: (error: unknown) => void;
}) {
  const latest = useRef({ source, onFrame, onError });
  latest.current = { source, onFrame, onError };
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const visibility = () => setPaused(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!active || !detector || paused) return;
    let cancelled = false,
      animation = 0,
      last = 0;
    async function tick(now: number) {
      if (cancelled) return;
      const frame = latest.current.source();
      if (!frame || now - last < 1000 / fps) {
        animation = requestAnimationFrame(tick);
        return;
      }
      last = now;
      try {
        const started = performance.now();
        const detections = await detector?.detect(frame);
        if (!cancelled && detections)
          latest.current.onFrame(detections, performance.now() - started);
      } catch (error) {
        if (!cancelled) latest.current.onError(error);
        return;
      }
      if (!cancelled) animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
    };
  }, [active, detector, fps, paused]);
  return paused;
}
