import source from "./catalogue.json";

export const cropCatalogue = source;
export const CATALOGUE_CROPS = ["Kiwi", "Vite da vino", "Vite da tavola", "Pere", "Mele",
  "Lattuga", "Spinacio", "Spinacino (4 gamma)", "Broccoli"] as const;
export type CatalogueCrop = typeof CATALOGUE_CROPS[number];
export const isCatalogueCrop = (value: unknown): value is CatalogueCrop =>
  typeof value === "string" && (CATALOGUE_CROPS as readonly string[]).includes(value);
export const CATALOGUE_PHASE_SOURCE = "Fase osservata in campo · modello di coltura";
export const PHASE_IDS = ["F1", "F2", "F3", "F4"] as const;

export type CataloguePhase = {
  id: typeof PHASE_IDS[number]; label: string; azoto: number; bbch: string; riferimento: number;
};
export type CropProfile = {
  crop: CatalogueCrop; name: string; destination: string; use: string; earliness: string;
  plants: number; yield: number; nitrogen: number; phases: CataloguePhase[];
};
const numeric = (value: string | undefined) => {
  if (value === undefined || !value.trim()) return NaN;
  const parts = value.trim().split(/(?<=\d)\s*[-–—]\s*(?=\d)/).map(v => Number(v.replace(",", ".")));
  return parts.length <= 2 && parts.every(Number.isFinite)
    ? parts.reduce((a, b) => a + b, 0) / parts.length : NaN;
};
const column = (row: readonly string[], name: string) => row[source.columns.indexOf(name)] ?? "";
export function parseProfiles(rows: readonly (readonly string[])[]): CropProfile[] {
  return rows.map(row => {
    const crop = column(row, "Coltura");
    if (!isCatalogueCrop(crop)) throw new Error("Coltura di catalogo sconosciuta.");
    return {
      crop, name: column(row, "Varietà"), destination: column(row, "Destinazione"),
      use: column(row, "Impiego"), earliness: column(row, "Precocità"),
      plants: numeric(column(row, "Piante/ha")), yield: numeric(column(row, "Resa media (t/ha)")),
      nitrogen: numeric(column(row, "Azoto Totale (kg/ha)")),
      phases: PHASE_IDS.map(id => ({
        id, label: column(row, `Fase ${id}`), azoto: numeric(column(row, `N ${id} (kg/ha)`)),
        bbch: column(row, `BBCH ${id}`), riferimento: numeric(column(row, `NDVI ${id}`)),
      })),
    };
  });
}
export const completeProfile = (p: CropProfile) => !!p.name
  && [p.plants, p.yield, p.nitrogen].every(v => Number.isFinite(v) && v > 0)
  && p.phases.length === 4 && p.phases.every((phase, i) =>
    phase.id === PHASE_IDS[i] && !!phase.label && /^\d{2}(?:-\d{2})?$/.test(phase.bbch)
    && Number.isFinite(phase.azoto) && phase.azoto >= 0 && phase.azoto <= p.nitrogen
    && Number.isFinite(phase.riferimento) && phase.riferimento > 0 && phase.riferimento <= 1)
  && Math.abs(p.phases.reduce((n, phase) => n + phase.azoto, 0) - p.nitrogen) <= .21;

/** Deterministic whole-profile substitution; never cross crop/use/earliness.
 * Retain both identities instead of presenting a proxy as a measured cultivar curve.
 */
export function resolveReference(profile: CropProfile, profiles: readonly CropProfile[]) {
  if (completeProfile(profile)) return { selected: profile, reference: profile, kind: "direct" as const };
  const distance = (p: CropProfile) =>
    (Number.isFinite(profile.yield) && profile.yield > 0 ? Math.abs(p.yield / profile.yield - 1) : 0)
    + (Number.isFinite(profile.plants) && profile.plants > 0 ? Math.abs(p.plants / profile.plants - 1) : 0);
  const candidates = profiles.filter(p => p !== profile && p.name !== profile.name
    && p.crop === profile.crop && p.destination === profile.destination && p.use === profile.use
    && p.earliness === profile.earliness && completeProfile(p)
    && p.phases.every((phase, i) => (!profile.phases[i]?.bbch || profile.phases[i].bbch === phase.bbch)
      && (!profile.phases[i]?.label || profile.phases[i].label === phase.label)))
    .sort((a, b) => distance(a) - distance(b) || a.name.localeCompare(b.name));
  return candidates[0] ? { selected: profile, reference: candidates[0], kind: "affine" as const } : null;
}

export const CROP_PROFILES = parseProfiles(source.rows);
const byIdentity = new Map(CROP_PROFILES.map(p => [JSON.stringify([p.crop, p.name]), p]));
export function getCropReference(crop: string, variety: string) {
  const profile = byIdentity.get(JSON.stringify([crop, variety]));
  return profile ? resolveReference(profile, CROP_PROFILES) : null;
}
export function cropPhaseSource(crop: string, variety: string): string {
  const resolved = getCropReference(crop, variety);
  return resolved
    ? `${CATALOGUE_PHASE_SOURCE} · ${resolved.kind === "affine" ? "Varietà affine" : "Riferimento"}: ${resolved.reference.name}`
    : "";
}
export const cropCompleteness = CROP_PROFILES.map(profile => ({
  crop: profile.crop, variety: profile.name, reference: resolveReference(profile, CROP_PROFILES),
}));
// Fail before an incomplete catalogue can be enabled in the form/API.
if (byIdentity.size !== CROP_PROFILES.length || cropCompleteness.some(p => !p.reference)) {
  throw new Error("Catalogo incompleto: manca un riferimento della stessa coltura.");
}

export function calculateCrop(input: {
  crop: string; variety: string; phase: string; confirmed: boolean;
  yield: number; applied: number; readings: number[];
}) {
  const resolved = getCropReference(input.crop, input.variety);
  const reference = resolved?.reference;
  const readingsValid = input.readings.length === 5
    && input.readings.every(v => Number.isFinite(v) && v >= 0 && v <= 1);
  // Centering keeps five identical readings exactly equal to their reference.
  const first = input.readings[0] ?? 0;
  const media = readingsValid
    ? Math.max(0, Math.min(1, first + input.readings.reduce((sum, v) => sum + (v - first) / 5, 0))) : 0;
  const varianza = readingsValid ? input.readings.reduce((a, b) => a + (b - media) ** 2, 0) / 5 : 0;
  const deviazioneStandard = Math.sqrt(varianza);
  const coefficienteVariazione = media > 0 ? deviazioneStandard / media * 100 : 0;
  const scale = reference && input.yield > 0 ? input.yield / reference.yield : NaN;
  const azotoTotale = reference ? reference.nitrogen * scale : NaN;
  const piano = reference?.phases.map(p => ({ ...p, quota: p.azoto * scale })) ?? [];
  const valida = !!resolved && readingsValid && Number.isFinite(input.yield) && input.yield > 0
    && Number.isFinite(input.applied) && input.applied >= 0
    && Number.isFinite(azotoTotale) && azotoTotale > 0
    && piano.every(p => Number.isFinite(p.quota));
  const attiva = piano.find(p => p.id === input.phase || `${p.id} · ${p.label}` === input.phase);
  const ottimale = attiva?.riferimento ?? 0;
  const discostamento = ottimale - media;
  const deficitRelativo = ottimale > 0 ? Math.max(0, discostamento) / ottimale : 0;
  const residuo = valida ? Math.max(0, azotoTotale - input.applied) : 0;
  const quota = attiva?.quota ?? 0;
  const pronta = valida && input.confirmed && !!attiva;
  const rawDose = quota * deficitRelativo;
  const roundedDose = Math.round((rawDose + Number.EPSILON * Math.abs(rawDose) * 4) * 10) / 10;
  const dose = pronta ? Math.max(0, Math.min(residuo, quota, roundedDose)) : 0;
  return { resolved, reference, valida, pronta, media, varianza, deviazioneStandard, coefficienteVariazione,
    azotoTotale: valida ? azotoTotale : 0, piano, attiva, ottimale, discostamento, deficitRelativo, residuo, quota, dose };
}

/** Same implementation on browser/API. No database access, no trusted client doses. */
export function catalogueObservationError(o: Record<string, unknown>): string | null {
  const dateValid = typeof o.data === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(o.data)
    && Number(o.data.slice(0, 4)) > 0 && Number.isFinite(Date.parse(o.data))
    && new Date(o.data).toISOString().slice(0, 10) === o.data;
  const positionValid = (o.lat == null && o.lng == null)
    || (typeof o.lat === "number" && Number.isFinite(o.lat) && Math.abs(o.lat) <= 90
      && typeof o.lng === "number" && Number.isFinite(o.lng) && Math.abs(o.lng) <= 180);
  if (!dateValid || !positionValid || typeof o.cliente !== "string" || !o.cliente.trim()
    || typeof o.appezzamento !== "string" || !o.appezzamento.trim()) {
    return "Parametri della coltura incompleti o non validi.";
  }
  const keys = ["resa", "azotoGiaDistribuito", "azotoTotale", "quotaAzoto", "dose", "media",
    "ottimale", "discostamento", "densitaValore", "pianteHaEquivalenti", "giorni",
    "n1", "n2", "n3", "n4", "n5"] as const;
  if (!isCatalogueCrop(o.coltura) || keys.some(k => typeof o[k] !== "number" || !Number.isFinite(o[k]))
    || o.densitaUnita !== "piante/ha" || (o.densitaValore as number) <= 0
    || o.pianteHaEquivalenti !== o.densitaValore || (o.giorni as number) < 0
    || !Number.isInteger(o.giorni) || o.bbch != null) return "Parametri della coltura incompleti o non validi.";
  const result = calculateCrop({
    crop: o.coltura, variety: String(o.varieta), phase: String(o.faseFenologica),
    confirmed: o.faseFonte === cropPhaseSource(o.coltura, String(o.varieta)),
    yield: o.resa as number, applied: o.azotoGiaDistribuito as number,
    readings: [o.n1, o.n2, o.n3, o.n4, o.n5] as number[],
  });
  if (!result.pronta || o.faseFenologica !== `${result.attiva?.id} · ${result.attiva?.label}`) {
    return "Seleziona una varietà e conferma la fase della coltura in campo.";
  }
  for (const key of ["media", "ottimale", "discostamento", "dose", "azotoTotale"] as const) {
    if (Math.abs((o[key] as number) - result[key]) > .00001) return "La dose non coincide con il modello della coltura.";
  }
  if (Math.abs((o.quotaAzoto as number) - result.dose) > .00001) return "La dose non coincide con il modello della coltura.";
  return null;
}
