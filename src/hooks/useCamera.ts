import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveSettings } from "@/components/live/store";
export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "Camera permission was denied. Allow camera access in your browser’s site settings, then retry.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "No camera was found. Connect a camera or choose Test without camera.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "The camera is in use. Close other camera apps, then retry.";
  if (name === "OverconstrainedError")
    return "This camera does not support those settings. Try 640×480 or a different camera.";
  return error instanceof Error ? error.message : "The camera could not start. Please retry.";
}
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const current = useRef<MediaStream | null>(null),
    generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
    setBusy(false);
    setError("");
  }, []);
  const start = useCallback(
    async (settings: LiveSettings, deviceId: string) => {
      stop();
      const token = generation.current;
      setError("");
      setBusy(true);
      try {
        if (!window.isSecureContext)
          throw new Error(
            "Camera access needs HTTPS. Open the secure published address or use Test without camera.",
          );
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "This browser does not support camera access. Use a recent Chrome, Safari, Firefox or Edge.",
          );
        const width = settings.resolution === "640x480" ? 640 : 1280;
        const height = settings.resolution === "640x480" ? 480 : 720;
        const next = await navigator.mediaDevices.getUserMedia({
          video: {
            ...(deviceId
              ? { deviceId: { exact: deviceId } }
              : { facingMode: { ideal: settings.facing } }),
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        });
        if (generation.current !== token) {
          next.getTracks().forEach((t) => t.stop());
          return;
        }
        current.current = next;
        setStream(next);
        try {
          setDevices(
            (await navigator.mediaDevices.enumerateDevices()).filter(
              (d) => d.kind === "videoinput",
            ),
          );
        } catch {
          // A working stream remains usable even if the device list is restricted.
        }
      } catch (e) {
        if (generation.current === token) setError(cameraError(e));
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [stop],
  );
  useEffect(
    () => () => {
      generation.current++;
      current.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  return { stream, devices, error, busy, start, stop };
}
