// REPLACE WITH REAL RESULTS
import { mulberry32 } from "@/lib/metrics";
const rng = mulberry32(41);
export const trainingHistory = Array.from({ length: 50 }, (_, i) => {
  const e = i + 1;
  const noise = (rng() - 0.5) * 0.015;
  return {
    epoch: e,
    trainBox: 1.7 * Math.exp(-e / 12) + 0.22 + noise,
    valBox: 1.55 * Math.exp(-e / 13) + 0.31 + noise,
    trainCls: 1.2 * Math.exp(-e / 10) + 0.12 + noise,
    valCls: 1.15 * Math.exp(-e / 12) + 0.18 + noise,
    map: 0.86 * (1 - Math.exp(-e / 8)) + noise,
    map5095: 0.61 * (1 - Math.exp(-e / 10)) + noise,
    precision: 0.95 * (1 - Math.exp(-e / 7)) + noise,
    recall: 0.87 * (1 - Math.exp(-e / 6)) + noise,
  };
});
