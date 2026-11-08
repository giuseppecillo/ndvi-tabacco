import { catalogue } from "./catalogue";

export const FASI_POMODORO = ["Sviluppo", "Fioritura", "Ingrossamento", "Maturazione"] as const;
export type FasePomodoro = typeof FASI_POMODORO[number];
export type ProfiloPomodoro = {
  id: string;
  nome: string;
  destinazione: string;
  impiego: string;
  precocita: string;
  pianteHa: number;
  resa: number;
  azotoTotale: number;
  fasi: readonly (readonly [number, number, number])[];
};

// Keep source values, excluding only the two homonymous profiles selected by the user.
export const POMODORO_DB: Readonly<Record<string, ProfiloPomodoro>> = Object.fromEntries(
  catalogue.map(([nome, destinazione, impiego, precocita, pianteHa, resa, azotoTotale, ...fasi]) => {
    const id = `${nome} — ${destinazione} · ${impiego}`;
    return [id, { id, nome, destinazione, impiego, precocita, pianteHa, resa, azotoTotale, fasi }];
  }),
);
export const PRIMO_POMODORO = Object.keys(POMODORO_DB)[0];

/** No epsilon: even binary subtraction boundaries must never overrun the raw cap. */
function tenthsBelow(value: number) {
  let tenths = Math.floor(value * 10);
  if (tenths / 10 > value) tenths--;
  return tenths / 10;
}

export function calcolaPomodoro(input: {
  varieta: string;
  fase: string;
  confermata: boolean;
  resa: number;
  azotoGiaDistribuito: number;
  letture: number[];
}) {
  const profilo = POMODORO_DB[input.varieta];
  const faseIndex = FASI_POMODORO.findIndex((fase) => fase === input.fase);
  const valida = !!profilo && Number.isFinite(input.resa) && input.resa > 0
    && Number.isFinite(input.azotoGiaDistribuito) && input.azotoGiaDistribuito >= 0
    && input.letture.length === 5
    && input.letture.every((value) => Number.isFinite(value) && value >= 0 && value <= 1);
  const media = input.letture.reduce((sum, value) => sum + value, 0) / input.letture.length;
  const varianza = input.letture.reduce((sum, value) => sum + (value - media) ** 2, 0) / input.letture.length;
  const deviazioneStandard = Math.sqrt(varianza);
  const coefficienteVariazione = media > 0 ? deviazioneStandard / media * 100 : 0;
  const scalaResa = profilo && input.resa > 0 ? input.resa / profilo.resa : 0;
  const azotoTotale = profilo ? profilo.azotoTotale * scalaResa : 0;
  const piano = profilo ? profilo.fasi.map(([azoto, min, max], index) => ({
    fase: FASI_POMODORO[index],
    quota: azoto * scalaResa,
    min, max,
    // User-approved rule: arithmetic mean of each supplied NDVI range.
    riferimento: (min + max) / 2,
  })) : [];
  const attiva = piano[faseIndex];
  const ottimale = attiva?.riferimento ?? 0;
  const discostamento = ottimale - media;
  const deficitRelativo = ottimale > 0 ? Math.max(0, discostamento) / ottimale : 0;
  const residuo = Math.max(0, azotoTotale - input.azotoGiaDistribuito);
  const quota = attiva?.quota ?? 0;
  const dose = valida && input.confermata && attiva
    ? Math.max(0, Math.min(tenthsBelow(residuo), tenthsBelow(quota), Math.round(quota * deficitRelativo * 10) / 10))
    : 0;
  return {
    valida, profilo, media, varianza, deviazioneStandard, coefficienteVariazione,
    ottimale, discostamento, deficitRelativo,
    azotoTotale, residuo, quota, dose, piano, attiva,
    pronta: valida && input.confermata && !!attiva,
  };
}

/** Pure API guard: no connection, queries or writes. Never trust client doses. */
export function erroreOsservazionePomodoro(o: Record<string, unknown>): string | null {
  const numeri = ["resa", "densitaValore", "pianteHaEquivalenti", "azotoGiaDistribuito",
    "azotoTotale", "quotaAzoto", "media", "ottimale", "discostamento", "dose", "giorni",
    "n1", "n2", "n3", "n4", "n5"] as const;
  if (numeri.some((key) => typeof o[key] !== "number" || !Number.isFinite(o[key]))) {
    return "Parametri pomodoro incompleti o non validi.";
  }
  if (o.densitaUnita !== "piante/ha" || (o.densitaValore as number) <= 0
    || o.pianteHaEquivalenti !== o.densitaValore || (o.giorni as number) < 0
    || !Number.isInteger(o.giorni) || o.bbch != null) {
    return "Densità o fase pomodoro non valida.";
  }
  const risultato = calcolaPomodoro({
    varieta: String(o.varieta), fase: String(o.faseFenologica),
    confermata: o.faseFonte === "Fase osservata in campo",
    resa: o.resa as number, azotoGiaDistribuito: o.azotoGiaDistribuito as number,
    letture: [o.n1, o.n2, o.n3, o.n4, o.n5] as number[],
  });
  if (!risultato.pronta) return "Seleziona una varietà e conferma la fase del pomodoro in campo.";
  // Doses are canonical tenths, not approximate measurements. Tolerance here
  // would admit tiny overruns or nonzero doses when the safe indication is zero.
  if (o.dose !== risultato.dose || o.quotaAzoto !== risultato.dose) {
    return "Il piano azoto pomodoro non coincide con la resa e il residuo.";
  }
  for (const key of ["media", "ottimale", "discostamento", "dose"] as const) {
    if (Math.abs((o[key] as number) - risultato[key]) > 0.00001) {
      return "Il calcolo pomodoro non coincide con i parametri varietali e NDVI.";
    }
  }
  if (Math.abs((o.azotoTotale as number) - risultato.azotoTotale) > 0.00001
    || Math.abs((o.quotaAzoto as number) - risultato.dose) > 0.00001) {
    return "Il piano azoto pomodoro non coincide con la resa e il residuo.";
  }
  return null;
}
