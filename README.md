# SentinelEye – Low-False-Positive Weapon Detector

Interactive research dashboard built with React, TypeScript, TanStack Start/Router, Tailwind v4, shadcn, Recharts and lucide. TanStack Router is the supported routing layer in this project.

## Research demo

Seven populated pages: overview, detector, tuning, hard negatives, model/dataset, settings, and documentation. Deterministic CCTV illustrations and synthetic data; no trained model is bundled. No backend or login.

## Run and test

```sh
bun install
bun run dev
bunx vitest run
```

## Inference endpoint

Optional Live mode POSTs multipart/form-data field `image` to the configured HTTPS endpoint. Optional `Authorization: Bearer <token>` is browser-local. The endpoint must allow CORS. Expected response:

```json
{"detections":[{"label":"firearm","confidence":0.91,"bbox":[344,190,438,278]}],"image_width":640,"image_height":360}
```

Labels: firearm or knife. Bounding boxes are absolute pixels. Failure falls back to explicitly marked simulation.

## Results import

Settings exports a complete example JSON. Required top-level keys: `metrics`, `thresholdSweep`, `confusionMatrix`, `hardNegativeStats`. Full schema documentation is available at `/about`. Imports are validated before replacing demo data and stored locally.

## Offline

Generated Workbox service worker via vite-plugin-pwa. Registration is blocked in development, Lovable previews, iframes and `?sw=off`. Published navigation uses NetworkFirst; hashed same-origin assets use CacheFirst. Open each desired page once online before offline use. Live model calls require internet. Offline published installation must be verified after publication; the editor intentionally does not register the worker.

## Safety

Research prototype. All detections must be verified by a human operator. Metrics and images are synthetic and do not represent measured outcomes from cited datasets.
