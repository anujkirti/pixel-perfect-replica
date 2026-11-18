// REPLACE WITH REAL RESULTS
import type { ObjectKind, Scene } from "./samples";
export const hardNegativeStats = [
  {
    category: "umbrella",
    count: 420,
    before: 68,
    after: 5,
    meanConfidence: 0.49,
    confusedAs: "firearm",
  },
  {
    category: "phone",
    count: 510,
    before: 57,
    after: 4,
    meanConfidence: 0.43,
    confusedAs: "firearm",
  },
  { category: "tool", count: 380, before: 59, after: 6, meanConfidence: 0.46, confusedAs: "knife" },
  {
    category: "other",
    count: 290,
    before: 21,
    after: 2,
    meanConfidence: 0.37,
    confusedAs: "knife",
  },
].map((s) => ({ ...s, fpRate: s.after / s.count }));
export const hardNegativeExamples: (Scene & { category: string })[] = Array.from(
  { length: 24 },
  (_, i) => {
    const category = (["umbrella", "phone", "tool", "other"] as const)[i % 4] ?? "other";
    const label = category === "umbrella" || category === "phone" ? "firearm" : "knife";
    return {
      id: `HN-${String(i + 1).padStart(3, "0")}`,
      category,
      name: `Hard negative ${i + 1}`,
      location: ["Entrance", "Corridor", "Shop floor"][i % 3] ?? "Street",
      sceneSeed: i * 73 + 12,
      trueObject: category as ObjectKind,
      groundTruth: [],
      detections: [
        { label, confidence: Number((0.55 - i * 0.008).toFixed(2)), bbox: [344, 190, 438, 278] },
      ],
    };
  },
);
