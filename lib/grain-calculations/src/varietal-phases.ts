import type { FaseGrano } from "./index";

export const FASI_RGT_NATUR: FaseGrano[] = [
  { label: "Semina / emergenza", bbch: "00–09", azotoMin: 30, azotoMax: 30, quotaSulTotale: 1 / 6 },
  { label: "Levata", bbch: "30–39", azotoMin: 90, azotoMax: 90, quotaSulTotale: 1 / 2 },
  { label: "Botticella", bbch: "41–49", azotoMin: 60, azotoMax: 60, quotaSulTotale: 1 / 3 },
];
