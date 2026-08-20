export type EtaPiantina = "standard" | "avanzata" | "extra";
export type Coltura = "tabacco" | "grano duro";
export type DensitaUnita = "piante/ha" | "semi/ha" | "kg/ha";

export const ETA_GIORNI_EQUIVALENTI: Record<EtaPiantina, number> = {
  standard: 0,
  avanzata: 7,
  extra: 14,
};

export type GranoVarietaDati = {
  label: string;
  densitaSemiMqMin: number;
  densitaSemiMqMax: number;
  densitaSemiMqDefault: number;
  pesoMilleSemiG: number;
};

// Dati dalla tabella varietale del disciplinare De Matteis 2023–2024.
// Il disciplinare esprime la dose in semi/m²; la conversione kg/ha è
// indicativa e resa esplicita usando il peso di 1.000 semi.
export const GRANO_DURO_DB: Record<string, GranoVarietaDati> = {
  Redidenari: { label: "Redidenari", densitaSemiMqMin: 200, densitaSemiMqMax: 230, densitaSemiMqDefault: 215, pesoMilleSemiG: 45 },
  Telemaco: { label: "Telemaco", densitaSemiMqMin: 190, densitaSemiMqMax: 220, densitaSemiMqDefault: 205, pesoMilleSemiG: 45 },
  President: { label: "President", densitaSemiMqMin: 165, densitaSemiMqMax: 220, densitaSemiMqDefault: 192.5, pesoMilleSemiG: 45 },
  "Federico II": { label: "Federico II", densitaSemiMqMin: 170, densitaSemiMqMax: 190, densitaSemiMqDefault: 180, pesoMilleSemiG: 45 },
  Egeo: { label: "Egeo", densitaSemiMqMin: 200, densitaSemiMqMax: 230, densitaSemiMqDefault: 215, pesoMilleSemiG: 45 },
  Minosse: { label: "Minosse", densitaSemiMqMin: 210, densitaSemiMqMax: 240, densitaSemiMqDefault: 225, pesoMilleSemiG: 45 },
  Spineto: { label: "Spineto", densitaSemiMqMin: 240, densitaSemiMqMax: 240, densitaSemiMqDefault: 240, pesoMilleSemiG: 45 },
  Farah: { label: "Farah", densitaSemiMqMin: 270, densitaSemiMqMax: 270, densitaSemiMqDefault: 270, pesoMilleSemiG: 45 },
  "Furio Camillo": { label: "Furio Camillo", densitaSemiMqMin: 200, densitaSemiMqMax: 230, densitaSemiMqDefault: 215, pesoMilleSemiG: 45 },
  "Marco Aurelio": { label: "Marco Aurelio", densitaSemiMqMin: 200, densitaSemiMqMax: 230, densitaSemiMqDefault: 215, pesoMilleSemiG: 45 },
  Nazareno: { label: "Nazareno", densitaSemiMqMin: 170, densitaSemiMqMax: 170, densitaSemiMqDefault: 170, pesoMilleSemiG: 45 },
  Quadrato: { label: "Quadrato", densitaSemiMqMin: 220, densitaSemiMqMax: 260, densitaSemiMqDefault: 240, pesoMilleSemiG: 45 },
  Giulio: { label: "Giulio", densitaSemiMqMin: 190, densitaSemiMqMax: 220, densitaSemiMqDefault: 205, pesoMilleSemiG: 45 },
};

export type FaseGrano = {
  label: "Semina" | "Accestimento" | "Levata" | "Foglia a bandiera";
  dasMin: number;
  dasMax: number | null;
  azotoMin: number;
  azotoMax: number;
};

export const FASI_GRANO: FaseGrano[] = [
  { label: "Semina", dasMin: 0, dasMax: 10, azotoMin: 27, azotoMax: 36 },
  { label: "Accestimento", dasMin: 11, dasMax: 35, azotoMin: 40, azotoMax: 50 },
  { label: "Levata", dasMin: 36, dasMax: 65, azotoMin: 40, azotoMax: 60 },
  { label: "Foglia a bandiera", dasMin: 66, dasMax: null, azotoMin: 20, azotoMax: 30 },
];

export function granoSemiMqDaKgHa(kgHa: number, dati: GranoVarietaDati): number {
  return kgHa / (dati.pesoMilleSemiG / 100);
}

export function granoKgHaDaSemiMq(semiMq: number, dati: GranoVarietaDati): number {
  return semiMq * dati.pesoMilleSemiG / 100;
}

export function calcolaDensitaGrano(
  valore: number,
  unita: DensitaUnita,
  dati: GranoVarietaDati,
): { semiMqEquivalenti: number; semiHaEquivalenti: number; rapportoDensita: number; fattoreAzoto: number; fuoriRange: boolean } {
  const semiMqEquivalenti = unita === "semi/ha"
    ? valore / 10_000
    : unita === "kg/ha"
    ? granoSemiMqDaKgHa(valore, dati)
    : valore / 10_000;
  const rapportoDensita = dati.densitaSemiMqDefault > 0
    ? semiMqEquivalenti / dati.densitaSemiMqDefault
    : 1;
  const fattoreAzoto = Math.max(0.90, Math.min(1.10, 0.75 + rapportoDensita * 0.25));
  return {
    semiMqEquivalenti,
    semiHaEquivalenti: semiMqEquivalenti * 10_000,
    rapportoDensita,
    fattoreAzoto,
    fuoriRange: semiMqEquivalenti < dati.densitaSemiMqMin || semiMqEquivalenti > dati.densitaSemiMqMax,
  };
}

export function faseGranoDaDas(giorni: number): FaseGrano {
  return [...FASI_GRANO].reverse().find((fase) => giorni >= fase.dasMin) ?? FASI_GRANO[0];
}

export function calcolaFabbisognoNGrano(resaQHa: number, fattoreDensita: number): { base: number; corretto: number } {
  // Tab. 2 del disciplinare: 40 q = 120, 50 q = 150, 60 q = 180 kg N/ha.
  const base = Math.max(0, Math.round(resaQHa * 3));
  return { base, corretto: Math.round(base * fattoreDensita) };
}

export function calcolaQuotaNGrano(
  fabbisognoN: number,
  fase: FaseGrano,
): number {
  const sommaRiferimenti = FASI_GRANO.reduce((sum, item) => sum + (item.azotoMin + item.azotoMax) / 2, 0);
  const quotaRiferimento = (fase.azotoMin + fase.azotoMax) / 2;
  const quotaScalata = Math.round(fabbisognoN * quotaRiferimento / sommaRiferimenti);
  return Math.max(fase.azotoMin, Math.min(fase.azotoMax, quotaScalata));
}

export type VarietaDati = {
  label: string;
  categoria: string;
  resaDefault: number;
  resaMin: number;
  resaMax: number;
  azotoDefault: number;
  azotoMin: number;
  azotoMax: number;
  kgNPerTon: number;
  densitaPianteDefault: number;
  kgSemiDefault: number;
};

export function calcolaDensita(
  valore: number,
  unita: DensitaUnita,
  dati: VarietaDati
): { pianteHaEquivalenti: number; rapportoDensita: number; fattoreAzoto: number } {
  const pianteHaEquivalenti = unita === "piante/ha"
    ? valore
    : (valore / dati.kgSemiDefault) * dati.densitaPianteDefault;
  const rapportoDensita = pianteHaEquivalenti / dati.densitaPianteDefault;
  // A parità di resa, la densità corregge il fabbisogno solo in parte:
  // la resa resta il principale indicatore delle asportazioni.
  const fattoreAzoto = Math.max(0.85, Math.min(1.15, 0.7 + rapportoDensita * 0.3));
  return { pianteHaEquivalenti, rapportoDensita, fattoreAzoto };
}

const NDVI_CURVA: Array<{ giorni: number; ottimale: number }> = [
  { giorni: 0,   ottimale: 0.28 },
  { giorni: 14,  ottimale: 0.34 },
  { giorni: 28,  ottimale: 0.48 },
  { giorni: 42,  ottimale: 0.64 },
  { giorni: 56,  ottimale: 0.74 },
  { giorni: 70,  ottimale: 0.76 },
  { giorni: 84,  ottimale: 0.72 },
  { giorni: 105, ottimale: 0.66 },
  { giorni: 130, ottimale: 0.60 },
];

export const NDVI_FASI: Array<{ giorni: number; label: string }> = [
  { giorni: 0,  label: "Trapianto" },
  { giorni: 20, label: "Ripresa (20 gg)" },
  { giorni: 35, label: "Sviluppo (35 gg)" },
  { giorni: 50, label: "Espansione (50 gg)" },
  { giorni: 65, label: "Piena copertura (65 gg)" },
  { giorni: 90, label: "Maturazione (90 gg)" },
];

export type NdviStats = {
  media: number;
  varianza: number;
  deviazioneStandard: number;
  coefficienteVariazione: number;
  valoriValidi: boolean;
};

export function statisticheNdvi(values: number[]): NdviStats {
  const media = values.reduce((sum, value) => sum + value, 0) / values.length;
  const varianza = values.reduce((sum, value) => sum + (value - media) ** 2, 0) / values.length;
  const deviazioneStandard = Math.sqrt(varianza);
  return {
    media,
    varianza,
    deviazioneStandard,
    coefficienteVariazione: media > 0 ? (deviazioneStandard / media) * 100 : 0,
    valoriValidi: values.every((value) => value >= 0 && value <= 1),
  };
}

export function ndviOttimale(
  giorni: number,
  etaPiantina: EtaPiantina = "standard"
): { ottimale: number; label: string; giorniFenologici: number } {
  const giorniFenologici = Math.max(0, giorni + ETA_GIORNI_EQUIVALENTI[etaPiantina]);
  const first = NDVI_CURVA[0];
  const last = NDVI_CURVA[NDVI_CURVA.length - 1];

  if (giorniFenologici <= first.giorni) {
    return { ottimale: first.ottimale, label: NDVI_FASI[0].label, giorniFenologici };
  }
  if (giorniFenologici >= last.giorni) {
    return { ottimale: last.ottimale, label: "Maturazione avanzata", giorniFenologici };
  }

  for (let i = 1; i < NDVI_CURVA.length; i++) {
    const right = NDVI_CURVA[i];
    if (giorniFenologici <= right.giorni) {
      const left = NDVI_CURVA[i - 1];
      const t = (giorniFenologici - left.giorni) / (right.giorni - left.giorni);
      const smoothT = t * t * (3 - 2 * t);
      const ottimale = left.ottimale + (right.ottimale - left.ottimale) * smoothT;
      const fase = [...NDVI_FASI].reverse().find((item) => giorniFenologici >= item.giorni) ?? NDVI_FASI[0];
      return { ottimale, label: fase.label, giorniFenologici };
    }
  }

  return { ottimale: last.ottimale, label: "Maturazione avanzata", giorniFenologici };
}

export function calcola(
  resa: number,
  azotoTot: number,
  giorni: number,
  n1: number,
  n2: number,
  n3: number,
  n4: number,
  n5: number,
  fabbisognoN: number,
  etaPiantina: EtaPiantina = "standard"
) {
  const stats = statisticheNdvi([n1, n2, n3, n4, n5]);
  const { ottimale, giorniFenologici } = ndviOttimale(giorni, etaPiantina);
  const media = stats.media;
  const discostamento = Math.max(0, ottimale - media);
  let dose = discostamento * 500 * (resa / 4.5);
  const limiteMax = azotoTot / 2;
  if (dose > limiteMax) dose = limiteMax;
  if (media >= ottimale) dose = 0;
  const rapportoAzoto = fabbisognoN > 0 ? azotoTot / fabbisognoN : 1;
  const statoAzoto = rapportoAzoto < 0.85
    ? "deficit"
    : rapportoAzoto > 1.15
    ? "surplus"
    : "allineato";
  const statoVariabilita = !stats.valoriValidi
    ? "non-valida"
    : stats.coefficienteVariazione <= 8
    ? "bassa"
    : stats.coefficienteVariazione <= 15
    ? "moderata"
    : "alta";

  return {
    ...stats,
    ottimale,
    discostamento,
    dose,
    giorniFenologici,
    fabbisognoN,
    rapportoAzoto,
    statoAzoto,
    statoVariabilita,
  };
}