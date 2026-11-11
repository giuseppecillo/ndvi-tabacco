/**
 * Offline preparation only. The owner explicitly authorized durum-wheat N/NDVI
 * means as a bread-wheat proxy. This module is not imported by the application,
 * does not create crop profiles, and does not copy density or yield to wheat.
 */
import {
  GRANO_DURO_DB, NDVI_GRANO_CURVA, fasiGranoPerVarieta,
  calcolaFabbisognoNGrano, calcolaQuotaNGrano,
} from "../../lib/grain-calculations/src/index";

const mean = (values: readonly number[]) => {
  if (!values.length || values.some(v => !Number.isFinite(v))) {
    throw new Error("WHEAT_PROXY_INVALID_DONOR_SAMPLE");
  }
  if (values.every(v => v === values[0])) return values[0];
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export function buildBreadWheatReference() {
  const donorVarieties = Object.keys(GRANO_DURO_DB).sort();
  if (!donorVarieties.length) throw new Error("WHEAT_PROXY_EMPTY_DONORS");
  const plans = donorVarieties.map(variety => {
    // This is the existing native form's reference-yield convention, NOT a
    // published measured yield and NOT a new bread-wheat yield estimate.
    const nativeYieldQHa = GRANO_DURO_DB[variety].resaDefault ?? 50;
    const nitrogenKgHa = calcolaFabbisognoNGrano(nativeYieldQHa, 1).corretto;
    return {
      variety, nativeYieldQHa, nitrogenKgHa,
      phases: fasiGranoPerVarieta(variety).map(phase => ({
        label: phase.label, bbch: phase.bbch,
        nitrogenKgHa: calcolaQuotaNGrano(nitrogenKgHa, phase),
      })),
    };
  });
  const cohorts = new Map<string, typeof plans>();
  for (const plan of plans) {
    const key = JSON.stringify(plan.phases.map(p => [p.label, p.bbch]));
    const cohort = cohorts.get(key) ?? [];
    cohort.push(plan);
    cohorts.set(key, cohort);
  }
  return {
    status: "offline-reference-not-an-operational-profile" as const,
    targetCrop: "Grano tenero",
    donorCrop: "grano duro",
    authorization: "Eccezione esplicita del titolare: NDVI e azoto medi del frumento duro",
    experimentallyValidatedForTarget: false,
    donorVarieties,
    nitrogen: {
      unit: "kg N/ha",
      meanNativeReferencePlan: mean(plans.map(p => p.nitrogenKgHa)),
      donorCount: plans.length,
      method: "Media aritmetica dei piani del modello nativo alle rese di riferimento dell'app, fattore densità 1",
      plans,
      phaseCohorts: [...cohorts.values()].map(cohort => ({
        donorVarieties: cohort.map(p => p.variety),
        phases: cohort[0].phases.map((phase, i) => ({
          label: phase.label, bbch: phase.bbch,
          meanDoseKgHa: mean(cohort.map(p => p.phases[i].nitrogenKgHa)),
          donorCount: cohort.length,
        })),
      })),
    },
    // Each native variety uses the same DAS curve: the arithmetic mean is
    // exactly that curve, not an average of its different developmental dates.
    ndvi: {
      axis: "days-after-sowing" as const,
      donorCount: donorVarieties.length,
      curve: NDVI_GRANO_CURVA.map(point => ({
        days: point.das,
        mean: mean(donorVarieties.map(() => point.ottimale)),
      })),
    },
    unresolved: [
      "Densità e resa del tenero da fonti della stessa coltura: non autorizzate al trasferimento",
      "Identità delle cultivar di tenero da ammettere",
      "Conservare distinti i due schemi fenologici nativi: non mediare codici BBCH incompatibili",
      "La curva NDVI nativa è per giorni dalla semina: non inventare un'associazione BBCH",
      "Le quote di fase native arrotondate non coincidono sempre con il totale del piano",
    ],
    catalogueActivationAllowed: false,
  };
}
