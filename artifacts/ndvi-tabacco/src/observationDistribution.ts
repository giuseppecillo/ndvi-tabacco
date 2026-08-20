import type { Coltura } from "./calculations";

export type ObservationDistributionSource = {
  id: string;
  coltura: Coltura;
  data: string;
  varieta: string;
  media: number;
  ottimale: number;
  dose: number;
  quotaAzoto?: number | null;
};

export type ObservationDistributionPoint = {
  id: string;
  coltura: Coltura;
  data: string;
  varieta: string;
  media: number;
  ottimale: number;
  scostamento: number;
  deficitNdvi: number;
  azotoIndicato: number;
};

/**
 * Builds a visual-only series from recorded observations. Nitrogen dose stays
 * exactly as saved; the signed NDVI difference is derived from the saved
 * average and reference to make above-target points visible left of zero.
 */
export function serieDistribuzioneOsservazioni(
  osservazioni: ObservationDistributionSource[],
): ObservationDistributionPoint[] {
  return osservazioni.flatMap((osservazione) => {
    const coltura = osservazione.coltura === "grano duro" ? "grano duro" : "tabacco";
    const scostamento = osservazione.ottimale - osservazione.media;
    const azotoIndicato = coltura === "grano duro"
      ? osservazione.quotaAzoto ?? osservazione.dose
      : osservazione.dose;

    if (![osservazione.media, osservazione.ottimale, scostamento, azotoIndicato].every(Number.isFinite)) {
      return [];
    }

    return [{
      id: osservazione.id,
      coltura,
      data: osservazione.data,
      varieta: osservazione.varieta,
      media: osservazione.media,
      ottimale: osservazione.ottimale,
      scostamento,
      deficitNdvi: Math.max(0, scostamento),
      azotoIndicato: Math.max(0, azotoIndicato),
    }];
  });
}