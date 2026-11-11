import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { catalogueRecords, digest, type CatalogueRecord } from "./catalogue-manifest";
import { assessVerifiedCatalogueScope, assertVerifiedCatalogueScope, assertStoredLegacyCatalogue, VERIFIED_CATALOGUE_ADDITIONS } from "./catalogue-verified-scope";

const rehash = (r: CatalogueRecord): CatalogueRecord => ({
  ...r, record_hash: digest({ crop: r.crop, variety: r.variety, model: r.model, parameters: r.parameters }),
});
const isAddition = (r: CatalogueRecord) =>
  VERIFIED_CATALOGUE_ADDITIONS.some(a => a.crop === r.crop && a.variety === r.variety);

test("narrowed scope admits exactly the unchanged baseline and three reviewed same-crop means", () => {
  const report = assertVerifiedCatalogueScope(catalogueRecords);
  assert.equal(report.totalProfiles, 1399);
  assert.equal(report.legacyProfiles, 1396);
  assert.equal(report.additions.length, 3);
  assert.ok(report.additions.every(a => a.verified));
  assert.equal(report.excludedResearchCrops.length, 23);
  assert.equal(report.experimentalCalibrationClaimed, false);
});

test("a complete-looking new identity still needs an explicit evidence review", () => {
  const original = catalogueRecords.find(isAddition)!;
  const unreviewed = rehash({ ...original, variety: "Not reviewed" });
  assert.throws(() => assertVerifiedCatalogueScope([...catalogueRecords, unreviewed]), /VERIFIED_SCOPE_MISMATCH/);
  const replaced = catalogueRecords.map(r => r === original ? unreviewed : r);
  assert.throws(() => assertVerifiedCatalogueScope(replaced), /VERIFIED_SCOPE_MISMATCH/);
});

test("altering reviewed parameters or removing a reviewed variety blocks insertion", () => {
  const original = catalogueRecords.find(isAddition)!;
  const changed = rehash({ ...original, parameters: { changed: true } });
  assert.throws(() => assertVerifiedCatalogueScope(catalogueRecords.map(r => r === original ? changed : r)), /VERIFIED_SCOPE_MISMATCH/);
  assert.throws(() => assertVerifiedCatalogueScope(catalogueRecords.filter(r => r !== original)), /VERIFIED_SCOPE_MISMATCH/);
});

test("legacy changes, duplicate records and invalid hashes are rejected", () => {
  const original = catalogueRecords.find(r => !isAddition(r))!;
  const changed = rehash({ ...original, parameters: { changed: true } });
  assert.throws(() => assertVerifiedCatalogueScope(catalogueRecords.map(r => r === original ? changed : r)), /LEGACY_CONTENT_CHANGED/);
  assert.equal(assessVerifiedCatalogueScope([...catalogueRecords, catalogueRecords[0]]).verifiedScopeComplete, false);
  assert.equal(assessVerifiedCatalogueScope(catalogueRecords.map((r, i) => i ? r : { ...r, record_hash: "bad" })).verifiedScopeComplete, false);
});

test("stored baseline requires all original records and no additions, regardless of row order", () => {
  const baseline = catalogueRecords.filter(r => !isAddition(r));
  assert.doesNotThrow(() => assertStoredLegacyCatalogue([...baseline].reverse()));
  assert.throws(() => assertStoredLegacyCatalogue(baseline.slice(1)), /STORED_LEGACY_MISMATCH/);
  assert.throws(() => assertStoredLegacyCatalogue(catalogueRecords), /STORED_LEGACY_MISMATCH/);
});

test("manual verified import checks approval before secrets and stored baseline before insertion", () => {
  const source = readFileSync("src/tools/apply-catalogue.ts", "utf8");
  assert.ok(source.indexOf("assertVerifiedCatalogueScope(catalogueRecords)") < source.indexOf("process.env.SUPABASE_QA_ADMIN_URL"));
  assert.ok(source.indexOf("assertStoredLegacyCatalogue(legacy.rows)") < source.indexOf("INSERT INTO agronomy_catalogue.model_profiles"));
  assert.match(source, /--check-verified-catalogue/);
  assert.match(source, /--apply-approved-verified-catalogue/);
  assert.match(source, /else if\(!verifyOnly\).*assertCompleteCatalogueScope/);
});
