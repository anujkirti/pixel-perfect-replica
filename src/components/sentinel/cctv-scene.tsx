import { useId } from "react";
import type { Scene, Detection } from "@/data/samples";
import { mulberry32 } from "@/lib/metrics";
import type { Thresholds } from "@/lib/detection";
export function CctvScene({
  scene,
  thresholds,
  showSuppressed = false,
  imageUrl,
  detections = scene.detections,
  compact = false,
}: {
  scene: Scene;
  thresholds?: Thresholds;
  showSuppressed?: boolean;
  imageUrl?: string | undefined;
  detections?: Detection[];
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const rng = mulberry32(scene.sceneSeed);
  const isGun = scene.trueObject === "firearm";
  const isKnife = scene.trueObject === "knife";
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={`${scene.location}: ${scene.trueObject} CCTV scene`}
      className="cctv-scene"
    >
      <defs>
        <linearGradient id={`bg${id}`} x2="0" y2="1">
          <stop className="scene-light" />
          <stop offset="1" className="scene-dark" />
        </linearGradient>
        <filter id={`grain${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".7"
            numOctaves="3"
            seed={scene.sceneSeed}
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".13" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
        <pattern id={`lines${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0H640" className="scan-line" />
        </pattern>
      </defs>
      {imageUrl ? (
        <image href={imageUrl} width="640" height="360" preserveAspectRatio="xMidYMid meet" />
      ) : (
        <g filter={`url(#grain${id})`}>
          <path d="M0 0H640V360H0Z" fill={`url(#bg${id})`} />
          <path d="M0 0L229 108V237L0 360ZM640 0L422 108V237L640 360Z" className="scene-wall" />
          <path d="M229 108H422V237H229Z" className="scene-back" />
          <path d="M0 360L229 237H422L640 360Z" className="scene-floor" />
          <g className="scene-lines">
            <path d="M0 88L229 140M0 199L229 191M640 78L422 133M640 190L422 187M166 360L281 237M471 360L368 237M0 296H640M0 341H640" />
            <path d="M40 40L176 93V249L40 309ZM473 88L579 42V296L473 251Z" />
          </g>
          <path d="M277 106H373V114H277Z" className="scene-lamp" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x={rng() * 600}
              y={300 + rng() * 50}
              width={20 + rng() * 40}
              height="2"
              className="scene-detail"
            />
          ))}
          <ellipse cx="337" cy="321" rx="51" ry="9" className="scene-shadow" />
          <g className="scene-person">
            <circle cx="328" cy="144" r="19" />
            <path d="M312 165Q328 157 346 166L355 225L344 257H308L301 218Z" />
            <path d="M310 244L325 245L318 318H302ZM331 245L344 244L357 317H340Z" />
            <path d="M306 177L294 218L316 239L323 226L310 211L322 180ZM342 177L363 201L390 210L387 225L353 217L330 192Z" />
          </g>
          <g className="scene-object">
            {isGun ? (
              <path d="M382 202L429 202L429 212L405 216L402 239L390 235L391 214L380 214Z" />
            ) : isKnife ? (
              <>
                <path d="M384 213L413 193L435 189L419 207L391 223Z" className="scene-metal" />
                <path d="M383 212L397 223L388 234L375 225Z" />
              </>
            ) : scene.trueObject === "umbrella" ? (
              <>
                <path d="M386 211L445 166L449 172L391 219Z" />
                <path d="M436 179Q423 134 465 145L479 164Q453 151 436 179Z" />
              </>
            ) : scene.trueObject === "phone" ? (
              <rect x="382" y="196" width="18" height="31" rx="3" />
            ) : (
              <>
                <path d="M382 218L421 188L428 195L390 226Z" className="scene-metal" />
                <path
                  d="M416 188Q410 171 426 169L423 181L432 185L441 175Q445 193 428 197Z"
                  className="scene-metal"
                />
              </>
            )}
          </g>
        </g>
      )}
      <rect width="640" height="360" fill={`url(#lines${id})`} opacity=".55" />
      {!compact && (
        <g className="camera-text">
          <text x="20" y="27">
            {scene.id} / {scene.location.toUpperCase()}
          </text>
          <text x="20" y="342">
            2026-11-18 18:42:{String(scene.sceneSeed % 60).padStart(2, "0")} UTC
          </text>
          <circle cx="575" cy="23" r="4" className="rec-dot" />
          <text x="586" y="27">
            REC
          </text>
          <text x="559" y="341">
            1080p
          </text>
        </g>
      )}
      {detections.map((d, i) => {
        const alert = !thresholds || d.confidence >= thresholds[d.label];
        if (!alert && !showSuppressed) return null;
        const [x1, y1, x2, y2] = d.bbox;
        return (
          <g
            key={i}
            className={
              alert ? (d.label === "firearm" ? "bbox-firearm" : "bbox-knife") : "bbox-suppressed"
            }
          >
            <rect
              x={x1}
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              fill="none"
              strokeWidth="2"
              strokeDasharray={alert ? undefined : "5 4"}
            />
            {!compact && (
              <>
                <rect x={x1} y={y1 - 23} width="119" height="23" className="bbox-chip" />
                <text x={x1 + 7} y={y1 - 7} className="bbox-label">
                  {d.label} {d.confidence.toFixed(2)}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
