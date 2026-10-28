import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useDeckLanguage } from "../i18n";
import { FIGURE_LABELS, type FigureRegion } from "../data/figure-labels";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "style" | "alt"> & {
  source: string;
  imageId: number;
  style?: CSSProperties;
  alt?: string;
};

const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
const CHAR_W = 0.53; // average glyph advance as fraction of font size

function RegionLayer({ r, text, idx }: { r: FigureRegion; text: string; idx: number }) {
  const lines = text.split("\n");
  const rot = r.rotate === -90;
  const boxW = rot ? r.h : r.w;
  const boxH = rot ? r.w : r.h;
  const lineH = boxH / lines.length;
  const fontSize = Math.max(4, lineH * 0.78);
  const middle = r.align === "middle";
  const pad = Math.min(1.5, boxW * 0.02);
  const avail = boxW - pad * 2;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return (
    <g data-region={idx}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.background ?? "#ffffff"} />
      <g transform={rot ? `rotate(-90 ${cx} ${cy})` : undefined}>
        {lines.map((line, i) => {
          const ox = rot ? cx - boxW / 2 : r.x;
          const oy = rot ? cy - boxH / 2 : r.y;
          const est = line.length * fontSize * CHAR_W * ((r.weight ?? 400) >= 600 ? 1.06 : 1);
          const squeeze = est > avail;
          return (
            <text
              key={i}
              x={middle || rot ? ox + boxW / 2 : ox + pad}
              y={oy + lineH * i + lineH / 2}
              dominantBaseline="central"
              textAnchor={middle || rot ? "middle" : "start"}
              fontFamily={FONT}
              fontSize={fontSize}
              fontWeight={r.weight ?? 400}
              fill={r.color ?? "#2b2f2c"}
              textLength={squeeze ? avail : undefined}
              lengthAdjust={squeeze ? "spacingAndGlyphs" : undefined}
            >
              {line}
            </text>
          );
        })}
      </g>
    </g>
  );
}

export function LocalizedFigure({ source, imageId, style, alt, className, ...rest }: Props) {
  const lang = useDeckLanguage();
  const data = FIGURE_LABELS[imageId];

  if (lang === "it" || !data) {
    return <img src={source} alt={alt ?? data?.alt.it ?? ""} style={style} className={className} {...rest} />;
  }

  const label = data.alt[lang];
  const texts = data.regions.map((r) => r[lang]).join(". ");
  const titleId = `fig-${imageId}-${lang}-title`;
  const descId = `fig-${imageId}-${lang}-desc`;

  return (
    <svg
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${data.viewW} ${data.viewH}`}
      preserveAspectRatio="none"
      className={className}
      data-testid={`figure-localized-${imageId}`}
      style={{ display: "block", overflow: "hidden", ...style }}
    >
      <title id={titleId}>{label}</title>
      <desc id={descId}>{texts}</desc>
      <image
        href={source}
        x={0}
        y={0}
        width={data.viewW}
        height={data.viewH}
        preserveAspectRatio="none"
      />
      <g aria-hidden="true">
        {data.regions.map((r, i) => (
          <RegionLayer key={i} r={r} text={r[lang]} idx={i} />
        ))}
      </g>
    </svg>
  );
}

export default LocalizedFigure;
