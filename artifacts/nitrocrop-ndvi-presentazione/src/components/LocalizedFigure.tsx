import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useDeckLanguage } from "../i18n";
import { FIGURE_LABELS, type FigureRegion } from "../data/figure-labels";
import tobaccoPhoto from "../assets/crops/tobacco.webp";
import wheatPhoto from "../assets/crops/wheat.webp";
import { CHROME_FIGURES, chromeGeometry, type FigureModule } from "../data/figure-chrome";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "style" | "alt"> & {
  source: string;
  imageId: number;
  style?: CSSProperties;
  alt?: string;
  /** Module shown as selected in the illustrative chrome. */
  module?: FigureModule;
  /** Show the left module list (default per figure). */
  rail?: boolean;
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
const UI: Record<Lang, { tag: string; items: string[] }> = {
  it: { tag: "Schema dell\u2019interfaccia", items: ["Rilievo e dati", "Elaborazioni e Mappe", "Istruzioni", "Il mio account", "Privacy", "Scrivi al supporto tecnico", "Esci"] },
  en: { tag: "Interface illustration", items: ["Field Survey and Data", "Processing and maps", "Instructions", "My account", "Privacy", "Email technical support", "Sign out"] },
  es: { tag: "Esquema de la interfaz", items: ["Observaciones y datos", "Procesamiento y mapas", "Instrucciones", "Mi cuenta", "Privacidad", "Escribe al soporte técnico", "Cerrar sesión"] },
};

/**
 * Illustrative current-app chrome (source: ndvi-tabacco src/security/ui.tsx +
 * security.css): yellow-orange top bar, NitroCrop NDVI control, optional left
 * module list, green module heading flanked by crop photos. The original capture
 * is shown below it (cropped under any obsolete header) at uniform scale, with
 * its EN/ES label layer in the same transform. Always labelled as an
 * illustration, never as a live capture.
 */
function Fit({ x, y, text, size, weight, fill, max, anchor }: { x: number; y: number; text: string; size: number; weight: number; fill: string; max: number; anchor?: "middle" }) {
  const est = text.length * size * CHAR_W * (weight >= 600 ? 1.06 : 1);
  return (
    <text x={x} y={y} dominantBaseline="central" textAnchor={anchor ?? "start"} fontFamily={FONT} fontSize={size} fontWeight={weight} fill={fill}
      textLength={est > max ? max : undefined} lengthAdjust={est > max ? "spacingAndGlyphs" : undefined}>{text}</text>
  );
}

function RailItem({ i, label, selected, s, bar, railW }: { i: number; label: string; selected: boolean; s: number; bar: number; railW: number }) {
  const y = bar + 10 * s + i * 44 * s + (i === 6 ? 14 * s : 0);
  return (
    <g>
      {selected && <rect x={6 * s} y={y} width={railW - 12 * s} height={40 * s} rx={8 * s} fill="#F09A1F" />}
      {selected && <rect x={6 * s} y={y} width={4 * s} height={40 * s} fill="#2A1A05" />}
      {i === 6 && <rect x={10 * s} y={y - 8 * s} width={railW - 20 * s} height={Math.max(1, s)} fill="#C97A12" />}
      <Fit x={16 * s} y={y + 20 * s} text={label} size={12 * s} weight={selected ? 700 : 600} fill="#2A1A05" max={railW - 26 * s} />
    </g>
  );
}

function ChromeFigure({ imageId, source, lang, style, className, module, rail }: { imageId: number; source: string; lang: Lang; style?: CSSProperties; className?: string; module: FigureModule; rail: boolean }) {
  const data = FIGURE_LABELS[imageId];
  const cfg = CHROME_FIGURES[imageId];
  const ui = UI[lang];
  const g = chromeGeometry(data.viewW, data.viewH, cfg.cropTop, rail);
  const { s, bar, railW, W, H } = g;
  const sel = module === "maps" ? 1 : 0;
  const heading = ui.items[sel];
  const id = `nc${imageId}${module}${rail ? "r" : ""}`;
  const headX = rail ? railW + 10 * s : 10 * s;
  const headW = W - headX - 10 * s;
  const photo = 52 * s;
  return (
    <svg role="img" aria-label={`${ui.tag}: NitroCrop NDVI \u2013 ${heading}. ${data.alt[lang]}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      className={className} data-testid={`figure-interface-illustration-${imageId}`} data-module={module}
      style={{ display: "block", overflow: "hidden", background: "#fbf8f1", ...style }}>
      <defs>
        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6B42C" /><stop offset="1" stopColor="#F09A1F" /></linearGradient>
        <linearGradient id={`${id}-mh`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3D6" /><stop offset="1" stopColor="#FBE6B8" /></linearGradient>
        <clipPath id={`${id}-body`}><rect x={g.bodyX} y={g.bodyY} width={g.bodyW} height={g.bodyH} /></clipPath>
        <clipPath id={`${id}-p1`}><rect x={headX + 8 * s} y={70 * s + bar - 54 * s} width={photo} height={photo} rx={10 * s} /></clipPath>
        <clipPath id={`${id}-p2`}><rect x={headX + headW - 8 * s - photo} y={70 * s + bar - 54 * s} width={photo} height={photo} rx={10 * s} /></clipPath>
      </defs>
      <rect x={0} y={0} width={W} height={bar} fill={`url(#${id}-bar)`} />
      <rect x={0} y={bar - Math.max(1, s)} width={W} height={Math.max(1, s)} fill="#C97A12" />
      <rect x={10 * s} y={9 * s} width={214 * s} height={36 * s} rx={18 * s} fill="#FFF1C9" stroke="#C97A12" strokeWidth={Math.max(1, s)} />
      <text x={30 * s} y={27 * s} dominantBaseline="central" fontFamily={FONT} fontSize={17 * s} fontWeight={600} fill="#2A1A05">NitroCrop NDVI</text>
      <path d={rail ? `M${196 * s} ${31 * s} l${7 * s} ${-7 * s} l${7 * s} ${7 * s}` : `M${196 * s} ${24 * s} l${7 * s} ${7 * s} l${7 * s} ${-7 * s}`} fill="none" stroke="#2A1A05" strokeWidth={2.4 * s} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={W - 214 * s} y={14 * s} width={202 * s} height={26 * s} rx={6 * s} fill="#2A1A05" />
      <Fit x={W - 113 * s} y={27 * s} text={ui.tag} size={13 * s} weight={700} fill="#FFE7A8" max={190 * s} anchor="middle" />
      {rail && (
        <g data-testid="figure-module-list">
          <rect x={0} y={bar} width={railW} height={H - bar} fill="#FFE7A8" />
          <rect x={railW - Math.max(1, s)} y={bar} width={Math.max(1, s)} height={H - bar} fill="#C97A12" />
          <RailItem i={0} label={ui.items[0]} selected={sel === 0} s={s} bar={bar} railW={railW} />
          <RailItem i={1} label={ui.items[1]} selected={sel === 1} s={s} bar={bar} railW={railW} />
          <RailItem i={2} label={ui.items[2]} selected={false} s={s} bar={bar} railW={railW} />
          <RailItem i={3} label={ui.items[3]} selected={false} s={s} bar={bar} railW={railW} />
          <RailItem i={4} label={ui.items[4]} selected={false} s={s} bar={bar} railW={railW} />
          <RailItem i={5} label={ui.items[5]} selected={false} s={s} bar={bar} railW={railW} />
          <RailItem i={6} label={ui.items[6]} selected={false} s={s} bar={bar} railW={railW} />
        </g>
      )}
      <rect x={headX} y={bar + 10 * s} width={headW} height={66 * s} rx={14 * s} fill={`url(#${id}-mh)`} stroke="#ECC87E" strokeWidth={Math.max(1, s)} />
      <image href={tobaccoPhoto} x={headX + 8 * s} y={bar + 16 * s} width={photo} height={photo} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-p1)`} />
      <image href={wheatPhoto} x={headX + headW - 8 * s - photo} y={bar + 16 * s} width={photo} height={photo} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-p2)`} />
      <Fit x={headX + headW / 2} y={bar + 43 * s} text={heading} size={24 * s} weight={600} fill="#1F3D2B" max={headW - 2 * photo - 40 * s} anchor="middle" />
      <g clipPath={`url(#${id}-body)`}>
        <g transform={`translate(${g.bodyX} ${g.bodyY}) scale(${g.k}) translate(0 ${-cfg.cropTop})`}>
          <image href={source} x={0} y={0} width={data.viewW} height={data.viewH} preserveAspectRatio="none" />
          {lang !== "it" && data.regions.map((r, i) => <RegionLayer key={i} r={r} text={r[lang]} idx={i} />)}
        </g>
      </g>
    </svg>
  );
}

export function LocalizedFigure({ source, imageId, style, alt, className, module, rail, ...rest }: Props) {
  const lang = useDeckLanguage();
  const data = FIGURE_LABELS[imageId];
  const cfg = CHROME_FIGURES[imageId];
  if (cfg && data) {
    return <ChromeFigure imageId={imageId} source={source} lang={lang} style={style} className={className} module={module ?? cfg.module} rail={rail ?? cfg.rail} />;
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
