// REPLACE WITH REAL RESULTS
import { thresholdSweep } from "./thresholdSweep";
export const prCurves = {
  firearm: thresholdSweep.filter((p) => p.label === "firearm").filter((_, i) => i % 2 === 0),
  knife: thresholdSweep.filter((p) => p.label === "knife").filter((_, i) => i % 2 === 0),
  averagePrecision: { firearm: 0.87, knife: 0.81 },
};
