import { z } from "zod";
import { metrics } from "@/data/metrics";
import { thresholdSweep } from "@/data/thresholdSweep";
import { confusionMatrix } from "@/data/confusionMatrix";
import { hardNegativeStats } from "@/data/hardNegatives";
const rate = z.number().min(0).max(1);
const count = z.number().int().nonnegative();
const metric = z.object({
  map: rate,
  precision: rate,
  recall: rate,
  f1: rate,
  fp_per_1000: z.number().nonnegative(),
});
const matrix = z.array(z.array(count).length(3)).length(3);
export const resultsSchema = z.object({
  metrics: z.object({
    before: metric,
    after: metric,
    recommended: z.object({ firearm: rate, knife: rate }),
  }),
  thresholdSweep: z
    .array(
      z.object({
        label: z.enum(["firearm", "knife"]),
        threshold: z.number().min(0.05).max(0.95),
        precision: rate,
        recall: rate,
        f1: rate,
        TP: count,
        FP: count,
        FN: count,
        fp_per_1000: z.number().nonnegative(),
      }),
    )
    .min(2)
    .refine(
      (p) => p.some((x) => x.label === "firearm") && p.some((x) => x.label === "knife"),
      "Both classes are required",
    ),
  confusionMatrix: z.object({
    labels: z.array(z.string()).length(3),
    baseline: matrix,
    tuned: matrix,
    extended: z.object({
      baseline: z.array(z.array(count).length(3)).length(4),
      tuned: z.array(z.array(count).length(3)).length(4),
    }),
  }),
  hardNegativeStats: z
    .array(
      z.object({
        category: z.string(),
        count: count,
        before: count,
        after: count,
        meanConfidence: rate,
        confusedAs: z.string(),
        fpRate: rate,
      }),
    )
    .length(4),
});
export type Results = z.infer<typeof resultsSchema>;
export const demoResults: Results = { metrics, thresholdSweep, confusionMatrix, hardNegativeStats };
