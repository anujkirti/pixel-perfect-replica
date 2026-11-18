# SentinelEye Live – Real-Time Low-False-Positive Weapon Detector

Interactive research dashboard built with React, TypeScript, TanStack Start/Router, Tailwind v4, shadcn, Recharts and lucide. TanStack Router is the supported routing layer in this project.

## Research demo

The home page is an on-device camera detector. It includes COCO-SSD knife/look-alike inference, uploaded YOLOv8 ONNX models saved in IndexedDB, temporal confirmation, IoU tracking, overlap guards, snapshots and device-local human feedback. `/analysis` re-scores feedback and applies recommended thresholds; `/settings` imports/exports validated live preferences. Historical synthetic scene review, threshold charts and AI explanations remain available. No backend or login. COCO-SSD has no firearm class.

Camera permissions are requested only after Start camera. ONNX inference prefers a background WASM worker, with browser WebGL/WASM fallback. Camera tracks, animation loops and model resources are released when stopped or unmounted. Test without camera uses generated scenes and scripted detections through the same safety pipeline; it does not claim to be model inference.

## Run and test

```sh
bun install
bun run dev
bunx vitest run
```

## Inference endpoint

Optional Remote API mode requires explicit frame-sharing consent and POSTs multipart/form-data field `image` at the chosen interval. The endpoint must allow CORS. Bounding boxes use the original snapshot’s pixel coordinates. Expected response:

```json
{"detections":[{"label":"firearm","confidence":0.91,"bbox":[344,190,438,278]}]}
```

Weapon classes use the configured class mapping. Other labels are ignored hard negatives. A remote failure switches to the on-device COCO-SSD demo, not fabricated live predictions. Neither camera nor model-upload modes transmit frames.

## Results import

Live settings JSON is validated before import, including confidence limits and K ≤ N. Import never grants remote-sharing consent. Feedback CSV/JSON exports are available in the alert log. The historical research results schema remains documented at `/about`.

## Offline

Generated Workbox service worker via vite-plugin-pwa (PWA skill). Registration is blocked in development, Lovable previews, iframes and `?sw=off`. Published navigation uses NetworkFirst; hashed same-origin assets, including ONNX WASM, use CacheFirst. Open each desired page once online before offline use. The synthetic test has no model dependency. COCO-SSD requires internet to load model weights; saved ONNX files are local. Remote API requires internet. Published offline reload and update delivery remain unverified while unpublished.

## Safety

Research prototype. All detections must be verified by a human operator. Metrics and images are synthetic and do not represent measured outcomes from cited datasets.
