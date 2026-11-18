import { Button } from "@/components/ui/button";
import { Download, ShieldCheck } from "lucide-react";
import { download } from "@/lib/metrics";
import { demoResults } from "@/lib/results";
export function About() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="page-eyebrow">PROJECT DOCUMENTATION</div>
          <h1>About SentinelEye</h1>
          <p>Low-false-positive weapon detection, with transparent trade-offs.</p>
        </div>
        <ShieldCheck className="size-10 text-primary" />
      </div>
      <section className="prose-section documentation">
        <h2>Research objective</h2>
        <p>
          SentinelEye is an interactive analysis prototype for a YOLO-style detector of concealed or
          handheld firearms and knives. The primary goal is minimizing false positives against hard
          negatives — umbrellas, phones and tools — without hiding the recall cost.
        </p>
        <h2>Demo & offline behavior</h2>
        <p>
          All demo scenes are deterministic procedural drawings. All charts and metrics are
          synthetic, not results from an actual trained model. Thresholds are applied to predefined
          raw predictions, not to image pixels. No login or backend is needed. In the published app,
          visit pages once online so their assets are available offline. Live mode is never
          available offline.
        </p>
        <h2>Live inference API contract</h2>
        <p>
          Configure an HTTPS endpoint in Settings. Uploading an image sends a POST request with
          multipart/form-data field <code>image</code>. An optional API key is sent as an
          Authorization Bearer header. The response must match:
        </p>
        <pre className="config-code">{`{\n  "detections": [\n    { "label": "firearm", "confidence": 0.91,\n      "bbox": [344, 190, 438, 278] }\n  ],\n  "image_width": 640,\n  "image_height": 360\n}`}</pre>
        <p>
          Labels are firearm or knife, confidence is between 0 and 1, and bounding boxes use
          absolute pixel coordinates [x1, y1, x2, y2]. Invalid responses and connection failures
          fall back to visibly labelled simulated inference. Endpoint CORS must allow the app’s
          origin. Images are sent only to the endpoint you configure.
        </p>
        <h2>Import results JSON schema</h2>
        <p>Every import replaces the complete evaluation bundle. Required keys:</p>
        <dl className="schema-list">
          <dt>metrics</dt>
          <dd>
            before and after: map, precision, recall, f1 (0–1), fp_per_1000 (nonnegative);
            recommended: firearm and knife thresholds.
          </dd>
          <dt>thresholdSweep</dt>
          <dd>
            Array containing both classes. Each row has label, threshold (0.05–0.95), precision,
            recall, f1, integer TP, FP, FN and fp_per_1000.
          </dd>
          <dt>confusionMatrix</dt>
          <dd>
            Three labels, baseline and tuned 3×3 integer matrices; extended baseline and tuned 4×3
            matrices for umbrella, phone, tool and other.
          </dd>
          <dt>hardNegativeStats</dt>
          <dd>
            Four records containing category, count, before, after, meanConfidence, confusedAs and
            fpRate.
          </dd>
        </dl>
        <Button
          variant="outline"
          onClick={() => download("sentineleye-example.json", JSON.stringify(demoResults, null, 2))}
        >
          <Download />
          Download complete example
        </Button>
        <h2>Responsible use</h2>
        <p>
          Detections require human verification. Do not deploy this demonstration for autonomous
          enforcement or real-time emergency response. Evaluate bias, privacy, dataset licenses and
          domain shift before any research deployment.
        </p>
      </section>
    </>
  );
}
