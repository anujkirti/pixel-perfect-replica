import { Sparkles, ShieldCheck } from "lucide-react";
import { getDetectionExplanation } from "@/lib/explanation";
import type { Scene } from "@/data/samples";
import type { Thresholds } from "@/lib/detection";
export function AiExplanation({
  scene,
  thresholds,
  index = 0,
}: {
  scene: Scene;
  thresholds: Thresholds;
  index?: number;
}) {
  const explanation = getDetectionExplanation(scene, thresholds, index);
  if (!explanation) return null;
  return (
    <section className="ai-explanation" aria-label={`AI explanation for ${scene.id}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          AI explanation
        </h3>
        <span className="subtle-tag">{explanation.source}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{explanation.rationale}</p>
      <div className="explanation-outcome">
        <span className="mono">{explanation.outcome}</span>
        <span className="mono text-muted-foreground">
          Confidence {scene.detections[index]?.confidence.toFixed(2)} / threshold{" "}
          {explanation.threshold.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-2 mt-3">
        <ShieldCheck className="size-3 mt-1 text-success" />
        {explanation.review}
      </p>
      <p className="explanation-source">
        Pre-generated from demo metadata · not image analysis or the detector’s internal reasoning.
        Human verification required.
      </p>
    </section>
  );
}
