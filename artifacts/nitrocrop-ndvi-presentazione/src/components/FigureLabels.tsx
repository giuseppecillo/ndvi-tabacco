import { useDeckLanguage } from "../i18n";
import { FIGURE_LABELS } from "../data/figure-labels";
import { RegionLayer } from "./LocalizedFigure";

/**
 * EN/ES label layer for the uploaded deck's flattened app screenshots.
 * Rendered inside the screenshot's background-image box; uses the same
 * "cover" fit (xMidYMid slice) so masks land on the measured source
 * coordinates. Italian shows the uploaded image untouched.
 */
export function FigureLabels({ imageId }: { imageId: number }) {
  const lang = useDeckLanguage();
  const data = FIGURE_LABELS[imageId];
  if (lang === "it" || !data) return null;
  return (
    <svg
      viewBox={`0 0 ${data.viewW} ${data.viewH}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={data.alt[lang]}
      data-testid={`figure-labels-${imageId}-${lang}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      {data.regions.map((r, i) => <RegionLayer key={i} r={r} text={r[lang]} idx={i} />)}
    </svg>
  );
}
