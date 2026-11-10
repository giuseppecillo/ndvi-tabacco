import { completeProfile, type CropProfile } from "@workspace/crop-calculations";
import { canonical, digest, type CatalogueRecord } from "./catalogue-manifest";

/** Scope requested by the owner. This is not a list of enabled crops. */
export const REQUIRED_NEW_CROPS = [
  "Grano tenero", "Orzo", "Avena", "Triticale", "Melone", "Carciofo",
  "Cavolo cappuccio", "Cavolo verza", "Cavolo nero", "Cavolini di Bruxelles",
  "Cavolfiore", "Patata", "Carota", "Rucola", "Fragola", "Pesco", "Albicocco",
  "Peperone", "Miglio", "Fagiolino", "Fava", "Favino", "Erba medica",
] as const;

// Frozen identity/parameter digest of the previously applied, 1,396-profile
// release. It was independently matched against its saved application report.
// Do not regenerate this baseline from whichever data happens to be current.
const LEGACY_DIGEST = "d28bdc2a58ae971aa9b7d95bf79aad98d0f18028ff8d0d5c333aaeab616fbd25";
export const LEGACY_VERSION = `models-${LEGACY_DIGEST.slice(0, 32)}`;
const LEGACY_CROPS = new Set([
  "Aglio", "Broccoli", "Ciliegio", "Cipolla", "Kiwi", "Lattuga", "Melanzana",
  "Mele", "Olivo", "Pere", "Spinacino (4 gamma)", "Spinacio", "Vite da tavola",
  "Vite da vino", "Zucchino", "grano duro", "pomodoro", "tabacco",
]);
// The only additions to legacy crops at the time this baseline was frozen.
// These exclusions are fixed, not caller-supplied: otherwise a removed legacy
// profile could be disguised as an addition and silently escape the comparison.
const LEGACY_ADDITIONS = new Set(["Melana F1", "Tasca F1", "Egle F1"]);
const order = (a: CatalogueRecord, b: CatalogueRecord) =>
  a.crop === b.crop
    ? a.variety < b.variety ? -1 : a.variety > b.variety ? 1 : 0
    : a.crop < b.crop ? -1 : 1;

export function assessCatalogueExpansion(records: readonly CatalogueRecord[]) {
  const identities = records.map(r => canonical([r.crop, r.variety]));
  const duplicateIdentities = identities.length !== new Set(identities).size;
  const invalidHashes = records.filter(r =>
    r.record_hash !== digest({ crop: r.crop, variety: r.variety, model: r.model, parameters: r.parameters })
  ).map(r => ({ crop: r.crop, variety: r.variety }));
  const legacy = records.filter(r => LEGACY_CROPS.has(r.crop)
    && !(r.crop === "Melanzana" && LEGACY_ADDITIONS.has(r.variety))).sort(order);
  const legacyPreserved = legacy.length === 1396 && digest(legacy) === LEGACY_DIGEST;
  const coverage = REQUIRED_NEW_CROPS.map(crop => {
    const profiles = records.filter(r => r.crop === crop);
    const incomplete = profiles.filter(r => {
      if (r.model !== "phase-ndvi-v1" || !r.parameters || typeof r.parameters !== "object") return true;
      const profile = (r.parameters as { profile?: CropProfile }).profile;
      return !profile || profile.crop !== r.crop || profile.name !== r.variety
        || !Array.isArray(profile.phases) || !completeProfile(profile);
    }).map(r => r.variety);
    return { crop, profiles: profiles.length, incomplete };
  });
  const missingCrops = coverage.filter(c => !c.profiles).map(c => c.crop);
  const structuralScopeComplete = legacyPreserved && !duplicateIdentities && !invalidHashes.length
    && !missingCrops.length && coverage.every(c => !c.incomplete.length);
  return {
    baselineVersion: LEGACY_VERSION,
    legacyProfiles: legacy.length,
    legacyPreserved,
    totalProfiles: records.length,
    requestedNewCropGroups: REQUIRED_NEW_CROPS.length,
    coveredNewCropGroups: coverage.filter(c => c.profiles > 0 && !c.incomplete.length).length,
    missingCrops,
    coverage,
    duplicateIdentities,
    invalidHashes,
    structuralScopeComplete,
    // Coverage is necessary, not a claim of scientific validation. A successful
    // check cannot turn missing or unreviewed agronomic evidence into facts.
    evidenceReviewRequired: true,
  };
}

export function assertCompleteCatalogueScope(records: readonly CatalogueRecord[]) {
  const result = assessCatalogueExpansion(records);
  if (!result.legacyPreserved) throw new Error("CATALOGUE_LEGACY_CONTENT_CHANGED");
  if (!result.structuralScopeComplete) throw new Error("CATALOGUE_EXPANSION_INCOMPLETE");
  return result;
}
