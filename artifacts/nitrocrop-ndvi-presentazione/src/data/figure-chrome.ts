/** Per-figure settings for the illustrative current-app chrome (see LocalizedFigure). */
export type FigureModule = "survey" | "maps";
export const CHROME_FIGURES: Record<number, { cropTop: number; module: FigureModule; rail: boolean }> = {
  3: { cropTop: 322, module: "survey", rail: true },
  5: { cropTop: 72, module: "maps", rail: true },
  6: { cropTop: 0, module: "survey", rail: true },
  7: { cropTop: 0, module: "survey", rail: false },
  8: { cropTop: 0, module: "maps", rail: false },
  9: { cropTop: 0, module: "maps", rail: true },
};

export function chromeGeometry(viewW: number, viewH: number, cropTop: number, rail: boolean) {
  const s = viewW / 724;
  const bar = 54 * s;
  const railW = rail ? 128 * s : 0;
  const bodyX = rail ? railW + 4 * s : 0;
  const bodyY = bar + 88 * s;
  const bodyW = viewW - bodyX - (rail ? 4 * s : 0);
  const k = bodyW / viewW;
  const bodyH = (viewH - cropTop) * k;
  return { s, bar, railW, bodyX, bodyY, bodyW, bodyH, k, W: viewW, H: bodyY + bodyH + 8 * s };
}

