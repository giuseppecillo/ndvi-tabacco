import { completeProfile, type CropProfile } from "@workspace/crop-calculations";
import type { CatalogueRecord } from "./catalogue-manifest";
import { assessCatalogueExpansion, LEGACY_VERSION, REQUIRED_NEW_CROPS } from "./catalogue-expansion-readiness";

/**
 * Owner narrowed the release to complete, reviewed profiles only.
 * These hashes include parameters, display data and the same-crop donor trace.
 * A new identity or changed parameter requires a new explicit evidence review.
 */
export const VERIFIED_CATALOGUE_ADDITIONS = [
  { crop: "Melanzana", variety: "Egle F1", record_hash: "539b47e57416924828bb3476fc98b2d028fd3b26de2dddba254e0db4cada6590" },
  { crop: "Melanzana", variety: "Melana F1", record_hash: "466b32721a277edfe0ffb34e2f39c0265ac6d8e58e348d513615fd2e0c15a1ec" },
  { crop: "Melanzana", variety: "Tasca F1", record_hash: "d2de1a554d2ead963f9a779a89c394165bfdd398964e44a5c171215219042a93" },
] as const;

export function assessVerifiedCatalogueScope(records: readonly CatalogueRecord[]) {
  const baseline = assessCatalogueExpansion(records);
  const additions = VERIFIED_CATALOGUE_ADDITIONS.map(expected => {
    const record = records.find(r => r.crop === expected.crop && r.variety === expected.variety);
    const profile = (record?.parameters as { profile?: CropProfile } | undefined)?.profile;
    return {
      crop: expected.crop,
      variety: expected.variety,
      verified: record?.record_hash === expected.record_hash
        && record.model === "phase-ndvi-v1" && !!profile && completeProfile(profile),
    };
  });
  return {
    scope: "verified-only" as const,
    baselineVersion: LEGACY_VERSION,
    legacyPreserved: baseline.legacyPreserved,
    legacyProfiles: baseline.legacyProfiles,
    totalProfiles: records.length,
    additions,
    excludedResearchCrops: [...REQUIRED_NEW_CROPS],
    verifiedScopeComplete: baseline.legacyPreserved && !baseline.duplicateIdentities
      && !baseline.invalidHashes.length && records.length === 1396 + additions.length
      && additions.every(a => a.verified),
    experimentalCalibrationClaimed: false,
  };
}

export function assertVerifiedCatalogueScope(records: readonly CatalogueRecord[]) {
  const result = assessVerifiedCatalogueScope(records);
  if (!result.legacyPreserved) throw new Error("CATALOGUE_LEGACY_CONTENT_CHANGED");
  if (!result.verifiedScopeComplete) throw new Error("CATALOGUE_VERIFIED_SCOPE_MISMATCH");
  return result;
}

/** Before any insert, also confirm the unchanged baseline actually stored in Supabase. */
export function assertStoredLegacyCatalogue(rows: readonly CatalogueRecord[]) {
  if (rows.length !== 1396 || !assessCatalogueExpansion(rows).legacyPreserved) {
    throw new Error("CATALOGUE_STORED_LEGACY_MISMATCH");
  }
}
