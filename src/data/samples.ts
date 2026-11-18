// REPLACE WITH REAL RESULTS
import type { Weapon } from "./thresholdSweep";
export type ObjectKind = Weapon | "umbrella" | "phone" | "tool" | "other";
export type Detection = {
  label: Weapon;
  confidence: number;
  bbox: [number, number, number, number];
};
export type Scene = {
  id: string;
  name: string;
  location: string;
  sceneSeed: number;
  trueObject: ObjectKind;
  groundTruth: Detection[];
  detections: Detection[];
};
const kinds: ObjectKind[] = [
  "firearm",
  "firearm",
  "firearm",
  "knife",
  "knife",
  "knife",
  "umbrella",
  "umbrella",
  "phone",
  "phone",
  "tool",
  "tool",
];
const places = [
  "North entrance",
  "Parking level B",
  "Loading bay",
  "East corridor",
  "Shop floor",
  "Station platform",
  "West entrance",
  "Service corridor",
  "Retail entrance",
  "Platform 02",
  "Workshop",
  "Maintenance bay",
];
export const samples: Scene[] = kinds.map((trueObject, i) => {
  const weapon = trueObject === "firearm" || trueObject === "knife";
  const label: Weapon = weapon ? trueObject : trueObject === "tool" ? "knife" : "firearm";
  const confidence =
    i === 5
      ? 0.55
      : weapon
        ? ([0.91, 0.84, 0.95, 0.88, 0.78][i] ?? 0.85)
        : ([0.52, 0.44, 0.48, 0.36, 0.51, 0.39][i - 6] ?? 0.4);
  const bbox: Detection["bbox"] = [344, 190, 438, 278];
  return {
    id: `CAM-${String(i + 1).padStart(2, "0")}`,
    name: `${trueObject === "tool" ? "Wrench" : trueObject.charAt(0).toUpperCase() + trueObject.slice(1)} · ${String(i + 1).padStart(2, "0")}`,
    location: places[i] ?? "Corridor",
    sceneSeed: i * 127 + 39,
    trueObject,
    groundTruth: weapon ? [{ label, confidence: 1, bbox }] : [],
    detections: [{ label, confidence, bbox }],
  };
});

export const firstSample = samples.find((s) => s.id === "CAM-01");
