import type { FaseGrano } from "./index";
import { FASI_RGT_NATUR } from "./varietal-phases";

export function fattoreAzotoGrano(rapportoDensita: number): number {
  return Math.max(0.90, Math.min(1.10, 0.75 + rapportoDensita * 0.25));
}

export type DensitaUnita = "piante/ha" | "semi/ha" | "semi/m²" | "kg/ha";

export type GranoVarietaDati = {
  label: string;
  densitaSemiMqMin: number;
  densitaSemiMqMax: number;
  densitaSemiMqDefault: number;
  doseSemeKgHaMin: number;
  doseSemeKgHaMax: number;
  doseSemeKgHaDefault: number;
  pesoMilleSemiG: number;
  resaDefault?: number;
  proteineObiettivo?: number;
  fasiAzoto?: FaseGrano[];
};

// Dati dalla tabella varietale di riferimento De Matteis 2023–2024.
// La tabella di riferimento riporta separatamente densità (semi/m²) e dose (kg/ha).
// Non dichiara il PMG: quello indicato è un riferimento di conversione
// ricavato dai valori centrali delle due colonne, non un dato certificato.
function varietaGrano(
  label: string,
  densitaSemiMqMin: number,
  densitaSemiMqMax: number,
  doseSemeKgHaMin: number,
  doseSemeKgHaMax: number,
): GranoVarietaDati {
  const densitaSemiMqDefault = (densitaSemiMqMin + densitaSemiMqMax) / 2;
  const doseSemeKgHaDefault = (doseSemeKgHaMin + doseSemeKgHaMax) / 2;
  return {
    label,
    densitaSemiMqMin,
    densitaSemiMqMax,
    densitaSemiMqDefault,
    doseSemeKgHaMin,
    doseSemeKgHaMax,
    doseSemeKgHaDefault,
    pesoMilleSemiG: Math.round((doseSemeKgHaDefault * 100 / densitaSemiMqDefault) * 10) / 10,
  };
}

export const GRANO_DURO_DB: Record<string, GranoVarietaDati> = {
  Redidenari: varietaGrano("Redidenari", 360, 410, 200, 230),
  Telemaco: varietaGrano("Telemaco", 360, 410, 190, 220),
  President: varietaGrano("President", 300, 350, 165, 220),
  "Federico II": varietaGrano("Federico II", 350, 350, 170, 190),
  Egeo: varietaGrano("Egeo", 360, 410, 200, 230),
  Minosse: varietaGrano("Minosse", 380, 430, 210, 240),
  Spineto: varietaGrano("Spineto", 400, 450, 240, 240),
  Farah: varietaGrano("Farah", 450, 500, 270, 270),
  "Furio Camillo": varietaGrano("Furio Camillo", 400, 450, 200, 230),
  "Marco Aurelio": varietaGrano("Marco Aurelio", 400, 450, 200, 230),
  Nazareno: varietaGrano("Nazareno", 350, 400, 170, 170),
  Quadrato: varietaGrano("Quadrato", 400, 450, 220, 260),
  Giulio: varietaGrano("Giulio", 370, 400, 190, 220),
  // Parametri forniti dal titolare, non dalla tabella De Matteis.
  // 220 kg/ha e 440 semi/m² implicano un PMG di conversione di 50 g.
  "RGT NATUR": {
    ...varietaGrano("RGT NATUR", 440, 440, 220, 220),
    resaDefault: 60,
    proteineObiettivo: 14,
    fasiAzoto: FASI_RGT_NATUR,
  },
};

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
): {
  semiMqEquivalenti: number;
  semiHaEquivalenti: number;
  doseKgHaEquivalente: number;
  rapportoDensita: number;
  fattoreAzoto: number;
  fuoriRangeDensita: boolean;
  fuoriRangeDose: boolean;
  fuoriRange: boolean;
} {
  const semiMqEquivalenti = unita === "semi/ha"
    ? valore / 10_000
    : unita === "semi/m²"
    ? valore
    : unita === "kg/ha"
    ? granoSemiMqDaKgHa(valore, dati)
    : valore / 10_000;
  const doseKgHaEquivalente = granoKgHaDaSemiMq(semiMqEquivalenti, dati);
  const rapportoDensita = dati.densitaSemiMqDefault > 0
    ? semiMqEquivalenti / dati.densitaSemiMqDefault
    : 1;
  const fattoreAzoto = fattoreAzotoGrano(rapportoDensita);
  const densitaDaVerificare = unita === "semi/m²" ? valore : semiMqEquivalenti;
  const doseDaVerificare = unita === "kg/ha" ? valore : doseKgHaEquivalente;
  const fuoriRangeDensita = densitaDaVerificare < dati.densitaSemiMqMin || densitaDaVerificare > dati.densitaSemiMqMax;
  const fuoriRangeDose = doseDaVerificare < dati.doseSemeKgHaMin || doseDaVerificare > dati.doseSemeKgHaMax;
  return {
    semiMqEquivalenti,
    semiHaEquivalenti: semiMqEquivalenti * 10_000,
    doseKgHaEquivalente,
    rapportoDensita,
    fattoreAzoto,
    fuoriRangeDensita,
    fuoriRangeDose,
    fuoriRange: unita === "kg/ha" ? fuoriRangeDose : fuoriRangeDensita,
  };
}
