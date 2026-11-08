import {
  FASI_GRANO, faseGranoDaBbch, calcolaDoseNGrano,
  ndviOttimaleGrano, type DensitaUnita, type FaseGrano, type FaseGranoLabel,
} from "@workspace/grain-calculations";
export {
  FASI_GRANO, faseGranoDaBbch, fasiGranoPerVarieta,
  calcolaFabbisognoNGrano, calcolaQuotaNGrano, ndviOttimaleGrano,
  GRANO_DURO_DB, granoSemiMqDaKgHa, granoKgHaDaSemiMq, calcolaDensitaGrano,
  type DensitaUnita, type GranoVarietaDati,
  type FaseGrano, type FaseGranoLabel,
} from "@workspace/grain-calculations";

import { riferimentoNdviTabacco, calcolaDoseNTabacco, type EtaPiantina } from "@workspace/tobacco-calculations";
export { ETA_GIORNI_EQUIVALENTI, type EtaPiantina } from "@workspace/tobacco-calculations";
export type Coltura = "tabacco" | "grano duro" | "pomodoro";

export type FinestraDasLocale = {
  fase: FaseGranoLabel;
  dasMin: number;
  dasMax: number | null;
};

// Modello iniziale solo per stimare la fase nei contesti di semina autunnale.
// È un consiglio locale iniziale e deve essere confermato dall'azienda.
export const FINESTRE_DAS_LOCALI_TEMPLATE: FinestraDasLocale[] = [
  { fase: "Semina / emergenza", dasMin: 0, dasMax: 20 },
  // 21–50 DAS è sviluppo fogliare (BBCH 10–20), non ancora una quota
  // azotata della tabella FASI_GRANO. La stima propone quindi l'accestimento
  // solo nella sua finestra locale 51–135 DAS.
  { fase: "Accestimento", dasMin: 51, dasMax: 135 },
  { fase: "Inizio levata", dasMin: 136, dasMax: 165 },
  { fase: "Foglia a bandiera", dasMin: 166, dasMax: 190 },
];

export type ProfiloFenologicoGrano = {
  bbch: string;
  label: string;
  dasMin: number;
  dasMax: number;
  ndviMin: number;
  ndviMax: number;
  quotaAzotoPrevista: boolean;
};

// Calendario fenologico locale di riferimento ricavato dalla tavola allegata:
// semina 30 ottobre e maturazione cerosa/fisiologica attorno al 7 luglio.
// I DAS sono una stima per semina autunnale, non sostituiscono il BBCH osservato.
export const PROFILO_FENOLOGICO_GRANO: ProfiloFenologicoGrano[] = [
  { bbch: "00–09", label: "Semina / emergenza", dasMin: 0, dasMax: 20, ndviMin: 0.20, ndviMax: 0.34, quotaAzotoPrevista: true },
  { bbch: "10–20", label: "Sviluppo fogliare", dasMin: 21, dasMax: 50, ndviMin: 0.34, ndviMax: 0.40, quotaAzotoPrevista: false },
  { bbch: "20–29", label: "Accestimento", dasMin: 51, dasMax: 135, ndviMin: 0.40, ndviMax: 0.55, quotaAzotoPrevista: true },
  { bbch: "30–32", label: "Inizio levata", dasMin: 136, dasMax: 165, ndviMin: 0.65, ndviMax: 0.72, quotaAzotoPrevista: true },
  { bbch: "37–39", label: "Foglia a bandiera", dasMin: 166, dasMax: 190, ndviMin: 0.73, ndviMax: 0.85, quotaAzotoPrevista: true },
  { bbch: "51–59", label: "Spigatura", dasMin: 191, dasMax: 205, ndviMin: 0.80, ndviMax: 0.83, quotaAzotoPrevista: false },
  { bbch: "61–69", label: "Fioritura", dasMin: 206, dasMax: 220, ndviMin: 0.72, ndviMax: 0.80, quotaAzotoPrevista: false },
  { bbch: "71–89", label: "Riempimento / maturazione cerosa", dasMin: 221, dasMax: 250, ndviMin: 0.42, ndviMax: 0.72, quotaAzotoPrevista: false },
];

export function profiloFenologicoGranoDaDas(das: number): ProfiloFenologicoGrano | null {
  return PROFILO_FENOLOGICO_GRANO.find((profilo) => das >= profilo.dasMin && das <= profilo.dasMax) ?? null;
}

export function profiloFenologicoGranoDaBbch(bbch: string): ProfiloFenologicoGrano | null {
  return PROFILO_FENOLOGICO_GRANO.find((profilo) => profilo.bbch === bbch) ?? null;
}

export function faseGranoConfermataDaBbch(bbch: string, confermataInCampo: boolean, varieta?: string): FaseGrano | null {
  return confermataInCampo ? faseGranoDaBbch(bbch, varieta) : null;
}

export function stimaFaseGranoDaDas(giorni: number, finestre: FinestraDasLocale[]): FaseGrano | null {
  const finestra = finestre.find((item) =>
    giorni >= item.dasMin && (item.dasMax === null || giorni <= item.dasMax)
  );
  return finestra ? FASI_GRANO.find((fase) => fase.label === finestra.fase) ?? null : null;
}

// Compatibilità con le chiamate precedenti: usa soltanto il modello locale
// esplicito, non una finestra DAS dichiarata da una fonte generale.
export function faseGranoDaDas(giorni: number, finestre = FINESTRE_DAS_LOCALI_TEMPLATE): FaseGrano | null {
  return stimaFaseGranoDaDas(giorni, finestre);
}

export function calcolaPianoNGrano(input: {
  fabbisognoN: number;
  azotoGiaDistribuito: number;
  fase: FaseGrano | null;
  das: number;
  lettureNdvi: number[];
}): NdviStats & {
  ndviOttimale: number;
  scostamentoNdvi: number;
  deficitNdvi: number;
  deficitRelativo: number;
  quotaBase: number;
  quotaDaDeficitNdvi: number;
  residuoPiano: number;
  quotaProposta: number;
  profiloDAS: ProfiloFenologicoGrano | null;
  profiloBbch: ProfiloFenologicoGrano | null;
  ndviFaseCoerente: boolean;
  verificaCampo: boolean;
} {
  const stats = statisticheNdvi(input.lettureNdvi);
  const ndviOttimale = ndviOttimaleGrano(input.das);
  const dose = calcolaDoseNGrano({
    ...input, media: stats.media, ndviOttimale, valoriValidi: stats.valoriValidi,
  });
  const profiloDAS = profiloFenologicoGranoDaDas(input.das);
  const profiloBbch = input.fase ? profiloFenologicoGranoDaBbch(input.fase.bbch) : null;
  // I nuovi BBCH riusano gli intervalli vegetativi del modello generale:
  // non costituiscono una calibrazione NDVI varietale o un calendario NATUR.
  const intervallo = input.fase?.bbch === "30–39"
    ? { ndviMin: 0.65, ndviMax: 0.85 }
    : input.fase?.bbch === "41–49"
    ? { ndviMin: 0.73, ndviMax: 0.85 }
    : profiloBbch;
  const ndviFaseCoerente = !intervallo
    || (ndviOttimale >= intervallo.ndviMin - 0.02 && ndviOttimale <= intervallo.ndviMax + 0.02);
  return {
    ...stats,
    ndviOttimale,
    ...dose,
    profiloDAS,
    profiloBbch,
    ndviFaseCoerente,
    verificaCampo: !stats.valoriValidi || stats.coefficienteVariazione > 15 || dose.deficitRelativo > 0.12,
  };
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

export const NDVI_FASI: Array<{ giorni: number; label: string }> = [
  { giorni: 0,  label: "Trapianto" },
  { giorni: 20, label: "Ripresa (20 gg)" },
  { giorni: 35, label: "Sviluppo vegetativo (35 gg)" },
  { giorni: 55, label: "Espansione chioma (55 gg)" },
  { giorni: 65, label: "Piena copertura (65 gg)" },
  { giorni: 75, label: "Massimo vigore (75–85 gg)" },
  { giorni: 95, label: "Fioritura / regressione (95 gg)" },
  { giorni: 110, label: "Fioritura avanzata (110 gg)" },
  { giorni: 130, label: "Maturazione avanzata (130 gg)" },
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
  const { ottimale, giorniFenologici } = riferimentoNdviTabacco(giorni, etaPiantina);
  const fase = [...NDVI_FASI].reverse().find((item) => giorniFenologici >= item.giorni) ?? NDVI_FASI[0];
  const label = giorniFenologici >= 130 ? "Maturazione avanzata" : fase.label;
  return { ottimale, label, giorniFenologici };
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
  etaPiantina: EtaPiantina = "standard",
  azotoGiaDistribuito = 0,
) {
  const stats = statisticheNdvi([n1, n2, n3, n4, n5]);
  const { ottimale, giorniFenologici } = ndviOttimale(giorni, etaPiantina);
  const { discostamento, deficitRelativo, quotaDaDeficitNdvi, residuoPiano, dose } = calcolaDoseNTabacco({
    media: stats.media, ottimale, fabbisognoN, azotoTotale: azotoTot, azotoGiaDistribuito,
  });
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
    deficitRelativo,
    quotaDaDeficitNdvi,
    residuoPiano,
    dose,
    giorniFenologici,
    fabbisognoN,
    rapportoAzoto,
    statoAzoto,
    statoVariabilita,
  };
}