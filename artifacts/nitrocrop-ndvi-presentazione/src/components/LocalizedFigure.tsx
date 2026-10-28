import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useDeckLanguage } from "../i18n";
import { FIGURE_LABELS, type FigureRegion } from "../data/figure-labels";
import tobaccoPhoto from "../assets/crops/tobacco.webp";
import wheatPhoto from "../assets/crops/wheat.webp";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "style" | "alt"> & {
  source: string;
  imageId: number;
  style?: CSSProperties;
  alt?: string;
  /** Draw the illustrative current-app chrome (imageId 3 only). */
  chrome?: boolean;
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


type Lang = "it" | "en" | "es";
const UI: Record<Lang, { tag: string; heading: string; items: string[] }> = {
  it: { tag: "Schema dell\u2019interfaccia", heading: "Rilievo e Mappe", items: ["Rilievo e Mappe", "Elaborazioni e Mappe", "Istruzioni", "Il mio account", "Privacy", "Scrivi al supporto tecnico", "Esci"] },
  en: { tag: "Interface illustration", heading: "Field Survey and Maps", items: ["Field Survey and Maps", "Processing and maps", "Instructions", "My account", "Privacy", "Email technical support", "Sign out"] },
  es: { tag: "Esquema de la interfaz", heading: "Observaciones y Mapas", items: ["Observaciones y Mapas", "Procesamiento y mapas", "Instrucciones", "Mi cuenta", "Privacidad", "Escribe al soporte técnico", "Cerrar sesión"] },
};
// Illustrative chrome (source: ndvi-tabacco security/ui.tsx + security.css):
// yellow-orange top bar, NitroCrop NDVI control, left module rail, green module heading.
// The original capture is cropped below its obsolete header/tabs (view y >= CROP_Y).
const CHROME_W = 724, CHROME_H = 780, BAR_H = 54, RAIL_W = 128, CROP_Y = 322;
function ChromeFigure({ source, lang, style, className, regions }: { source: string; lang: Lang; style?: CSSProperties; className?: string; regions?: FigureRegion[] }) {
  const ui = UI[lang];
  const bodyW = CHROME_W - RAIL_W - 8;
  const k = bodyW / 724;
  const bodyY = 142;
  const bodyH = (1024 - CROP_Y) * k;
  return (
    <svg role="img" aria-label={`${ui.tag}: NitroCrop NDVI`} viewBox={`0 0 ${CHROME_W} ${CHROME_H}`} preserveAspectRatio="xMidYMid meet" className={className} data-testid="figure-interface-illustration" style={{ display: "block", overflow: "hidden", background: "#fbf8f1", ...style }}>
      <defs>
        <linearGradient id="nc-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6B42C" /><stop offset="1" stopColor="#F09A1F" /></linearGradient>
        <linearGradient id="nc-mh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3D6" /><stop offset="1" stopColor="#FBE6B8" /></linearGradient>
        <clipPath id="nc-body"><rect x={RAIL_W + 4} y={bodyY} width={bodyW} height={bodyH} /></clipPath>
        <clipPath id="nc-p1"><rect x={RAIL_W + 22} y={70} width={52} height={52} rx={10} /></clipPath>
        <clipPath id="nc-p2"><rect x={CHROME_W - 66} y={70} width={52} height={52} rx={10} /></clipPath>
      </defs>
      <rect x={0} y={0} width={CHROME_W} height={BAR_H} fill="url(#nc-bar)" />
      <rect x={0} y={BAR_H - 1} width={CHROME_W} height={1} fill="#C97A12" />
      <rect x={10} y={9} width={214} height={36} rx={18} fill="#FFF1C9" stroke="#C97A12" />
      <text x={30} y={28} dominantBaseline="central" fontFamily={FONT} fontSize={17} fontWeight={600} fill="#2A1A05">NitroCrop NDVI</text>
      <path d="M196 31 l7 -7 l7 7" fill="none" stroke="#2A1A05" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={CHROME_W - 214} y={14} width={202} height={26} rx={6} fill="#2A1A05" />
      <text x={CHROME_W - 113} y={27} dominantBaseline="central" textAnchor="middle" fontFamily={FONT} fontSize={13} fontWeight={700} fill="#FFE7A8">{ui.tag}</text>
      <rect x={0} y={BAR_H} width={RAIL_W} height={CHROME_H - BAR_H} fill="#FFE7A8" />
      <rect x={RAIL_W - 1} y={BAR_H} width={1} height={CHROME_H - BAR_H} fill="#C97A12" />
      <rect x={6} y={BAR_H + 10} width={RAIL_W - 12} height={40} rx={8} fill="#F09A1F" />
      <rect x={6} y={BAR_H + 10} width={4} height={40} fill="#2A1A05" />
      <text x={16} y={BAR_H + 30} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={700} fill="#2A1A05" textLength={ui.items[0].length * 6.6 > RAIL_W - 26 ? RAIL_W - 26 : undefined} lengthAdjust="spacingAndGlyphs">{ui.items[0]}</text>
      <text x={16} y={BAR_H + 78} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05" textLength={ui.items[1].length * 6.6 > RAIL_W - 26 ? RAIL_W - 26 : undefined} lengthAdjust="spacingAndGlyphs">{ui.items[1]}</text>
      <text x={16} y={BAR_H + 122} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05">{ui.items[2]}</text>
      <text x={16} y={BAR_H + 166} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05">{ui.items[3]}</text>
      <text x={16} y={BAR_H + 210} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05">{ui.items[4]}</text>
      <text x={16} y={BAR_H + 254} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05" textLength={ui.items[5].length * 6.6 > RAIL_W - 26 ? RAIL_W - 26 : undefined} lengthAdjust="spacingAndGlyphs">{ui.items[5]}</text>
      <rect x={10} y={BAR_H + 280} width={RAIL_W - 20} height={1} fill="#C97A12" />
      <text x={16} y={BAR_H + 304} dominantBaseline="central" fontFamily={FONT} fontSize={12} fontWeight={600} fill="#2A1A05">{ui.items[6]}</text>
      <rect x={RAIL_W + 10} y={64} width={CHROME_W - RAIL_W - 20} height={66} rx={14} fill="url(#nc-mh)" stroke="#ECC87E" />
      <image href={tobaccoPhoto} x={RAIL_W + 22} y={70} width={52} height={52} preserveAspectRatio="xMidYMid slice" clipPath="url(#nc-p1)" />
      <image href={wheatPhoto} x={CHROME_W - 66} y={70} width={52} height={52} preserveAspectRatio="xMidYMid slice" clipPath="url(#nc-p2)" />
      <text x={(RAIL_W + CHROME_W) / 2} y={97} dominantBaseline="central" textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={600} fill="#1F3D2B">{ui.heading}</text>
      <g clipPath="url(#nc-body)">
        <g transform={`translate(${RAIL_W + 4} ${bodyY}) scale(${k}) translate(0 ${-CROP_Y})`}>
          <image href={source} x={0} y={0} width={724} height={1024} preserveAspectRatio="none" />
          {lang !== "it" && regions && regions.map((r, i) => <RegionLayer key={i} r={r} text={r[lang]} idx={i} />)}
        </g>
      </g>
    </svg>
  );
}

export function LocalizedFigure({ source, imageId, style, alt, className, chrome = true, ...rest }: Props) {
  const lang = useDeckLanguage();
  const data = FIGURE_LABELS[imageId];
  if (imageId === 3 && chrome) {
    return <ChromeFigure source={source} lang={lang} style={style} className={className} regions={data?.regions} />;
  }

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
