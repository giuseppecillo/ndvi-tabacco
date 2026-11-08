// Modello agronomico puro condiviso da app e API. La validazione degli input
// e la conferma in campo del BBCH restano responsabilità dei chiamanti.
export {
  GRANO_DURO_DB, granoSemiMqDaKgHa, granoKgHaDaSemiMq, calcolaDensitaGrano,
  fattoreAzotoGrano, type DensitaUnita, type GranoVarietaDati,
} from "./density";
import { FASI_RGT_NATUR } from "./varietal-phases";
export { FASI_RGT_NATUR } from "./varietal-phases";

export type FaseGranoLabel = "Semina / emergenza" | "Accestimento" | "Inizio levata" | "Foglia a bandiera" | "Levata" | "Botticella";

export type FaseGrano = {
  label: FaseGranoLabel;
  bbch: string;
  azotoMin: number;
  azotoMax: number;
  // Ripartizione del piano varietale, distinta dagli intervalli disciplinari.
  quotaSulTotale?: number;
};

export const FASI_GRANO: FaseGrano[] = [
  { label: "Semina / emergenza", bbch: "00–09", azotoMin: 27, azotoMax: 36 },
  { label: "Accestimento", bbch: "20–29", azotoMin: 40, azotoMax: 50 },
  { label: "Inizio levata", bbch: "30–32", azotoMin: 40, azotoMax: 60 },
  { label: "Foglia a bandiera", bbch: "37–39", azotoMin: 20, azotoMax: 30 },
];

export function fasiGranoPerVarieta(varieta?: string): FaseGrano[] {
  return varieta === "RGT NATUR" ? FASI_RGT_NATUR : FASI_GRANO;
}

export function faseGranoDaBbch(bbch: string, varieta?: string): FaseGrano | null {
  return fasiGranoPerVarieta(varieta).find((fase) => fase.bbch === bbch) ?? null;
}

export function calcolaFabbisognoNGrano(resaQHa: number, fattoreDensita: number): { base: number; corretto: number } {
  // Consiglio di riferimento: 40 q = 120, 50 q = 150, 60 q = 180 kg N/ha.
  const base = Math.max(0, Math.round(resaQHa * 3));
  return { base, corretto: Math.round(base * fattoreDensita) };
}

export function calcolaQuotaNGrano(fabbisognoN: number, fase: FaseGrano): number {
  if (fase.quotaSulTotale !== undefined) {
    return Math.max(0, Math.round(fabbisognoN * fase.quotaSulTotale));
  }
  const sommaRiferimenti = FASI_GRANO.reduce((sum, item) => sum + (item.azotoMin + item.azotoMax) / 2, 0);
  const quotaRiferimento = (fase.azotoMin + fase.azotoMax) / 2;
  const quotaScalata = Math.round(fabbisognoN * quotaRiferimento / sommaRiferimenti);
  return Math.max(fase.azotoMin, Math.min(fase.azotoMax, quotaScalata));
}

export const NDVI_GRANO_CURVA: Array<{ das: number; ottimale: number }> = [
  { das: 0, ottimale: 0.20 },
  { das: 20, ottimale: 0.34 },
  { das: 50, ottimale: 0.40 },
  { das: 135, ottimale: 0.55 },
  { das: 136, ottimale: 0.65 },
  { das: 165, ottimale: 0.72 },
  { das: 166, ottimale: 0.73 },
  { das: 190, ottimale: 0.85 },
  { das: 205, ottimale: 0.80 },
  { das: 220, ottimale: 0.72 },
  { das: 250, ottimale: 0.42 },
];

export function ndviOttimaleGrano(das: number): number {
  const first = NDVI_GRANO_CURVA[0];
  const last = NDVI_GRANO_CURVA[NDVI_GRANO_CURVA.length - 1];
  if (das <= first.das) return first.ottimale;
  if (das >= last.das) return last.ottimale;
  for (let i = 1; i < NDVI_GRANO_CURVA.length; i++) {
    const right = NDVI_GRANO_CURVA[i];
    if (das <= right.das) {
      const left = NDVI_GRANO_CURVA[i - 1];
      const progress = (das - left.das) / (right.das - left.das);
      return left.ottimale + (right.ottimale - left.ottimale) * progress;
    }
  }
  return last.ottimale;
}

export function calcolaDoseNGrano(input: {
  fabbisognoN: number;
  azotoGiaDistribuito: number;
  fase: FaseGrano | null;
  media: number;
  ndviOttimale: number;
  valoriValidi: boolean;
}) {
  const scostamentoNdvi = input.ndviOttimale - input.media;
  const deficitNdvi = Math.max(0, scostamentoNdvi);
  const deficitRelativo = input.ndviOttimale > 0
    ? Math.min(1, deficitNdvi / input.ndviOttimale)
    : 0;
  const quotaBase = input.fase ? calcolaQuotaNGrano(input.fabbisognoN, input.fase) : 0;
  // Doses stay in whole kg N/ha: the available plan must never round up.
  const residuoPiano = Math.max(0, Math.floor(input.fabbisognoN - input.azotoGiaDistribuito));
  // Nessun minimo di fase sulla dose: a NDVI adeguato non si indica N.
  const quotaDaDeficitNdvi = input.valoriValidi && input.fase && deficitNdvi > 0
    ? Math.round(quotaBase * deficitRelativo)
    : 0;
  const quotaProposta = input.valoriValidi && input.fase
    ? Math.min(residuoPiano, quotaDaDeficitNdvi)
    : 0;
  return {
    scostamentoNdvi, deficitNdvi, deficitRelativo, quotaBase,
    quotaDaDeficitNdvi, residuoPiano, quotaProposta,
  };
}
