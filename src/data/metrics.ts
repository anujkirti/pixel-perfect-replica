// REPLACE WITH REAL RESULTS
import { f1 } from "@/lib/metrics";
export const metrics = {
  before: { map: 0.86, precision: 0.78, recall: 0.91, f1: f1(0.78, 0.91), fp_per_1000: 38.4 },
  after: { map: 0.84, precision: 0.95, recall: 0.87, f1: f1(0.95, 0.87), fp_per_1000: 3.1 },
  recommended: { firearm: 0.62, knife: 0.58 },
};
