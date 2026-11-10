import assert from "node:assert/strict";
import test from "node:test";
import { catalogueRecords, digest, type CatalogueRecord } from "./catalogue-manifest";
import { assessCatalogueExpansion, assertCompleteCatalogueScope, REQUIRED_NEW_CROPS } from "./catalogue-expansion-readiness";

const rehash = (record: CatalogueRecord) => ({
  ...record,
  record_hash: digest({ crop: record.crop, variety: record.variety, model: record.model, parameters: record.parameters }),
});

test("all 1,396 legacy profiles retain the exact previously applied parameters", () => {
  const report = assessCatalogueExpansion(catalogueRecords);
  assert.equal(report.legacyPreserved, true);
  assert.equal(report.legacyProfiles, 1396);
  assert.equal(report.totalProfiles, 1399);
});

test("current three eggplant additions never count as coverage of the 23 missing crops", () => {
  const report = assessCatalogueExpansion(catalogueRecords);
  assert.equal(report.coveredNewCropGroups, 0);
  assert.deepEqual(report.missingCrops, [...REQUIRED_NEW_CROPS]);
  assert.equal(report.structuralScopeComplete, false);
  assert.equal(report.evidenceReviewRequired, true);
  assert.throws(() => assertCompleteCatalogueScope(catalogueRecords), /CATALOGUE_EXPANSION_INCOMPLETE/);
});

test("removing, renaming or changing a legacy parameter fails even if total counts match", () => {
  const source = catalogueRecords.find(r => r.crop === "Aglio")!;
  for (const replacement of [
    { ...source, variety: `${source.variety} changed` },
    { ...source, parameters: { changed: true } },
  ]) {
    const records = catalogueRecords.map(r => r === source ? rehash(replacement) : r);
    assert.equal(records.length, catalogueRecords.length);
    assert.equal(assessCatalogueExpansion(records).legacyPreserved, false);
    assert.throws(() => assertCompleteCatalogueScope(records), /CATALOGUE_LEGACY_CONTENT_CHANGED/);
  }
  assert.equal(assessCatalogueExpansion(catalogueRecords.filter(r => r !== source)).legacyPreserved, false);
});

test("a name without complete model parameters is not operational crop coverage", () => {
  const partial = rehash({
    crop: "Orzo", variety: "QA synthetic incomplete",
    model: "phase-ndvi-v1", parameters: { profile: { crop: "Orzo" } }, record_hash: "",
  });
  const report = assessCatalogueExpansion([...catalogueRecords, partial]);
  assert.equal(report.legacyPreserved, true);
  assert.equal(report.coverage.find(c => c.crop === "Orzo")?.profiles, 1);
  assert.deepEqual(report.coverage.find(c => c.crop === "Orzo")?.incomplete, [partial.variety]);
  assert.equal(report.coveredNewCropGroups, 0);
  assert.equal(report.structuralScopeComplete, false);
});

test("duplicates and invalid record hashes block the scope check without mutating inputs", () => {
  const before = JSON.stringify(catalogueRecords);
  assert.equal(assessCatalogueExpansion([...catalogueRecords, catalogueRecords[0]]).duplicateIdentities, true);
  const altered = catalogueRecords.map((r, i) => i === 0 ? { ...r, record_hash: "invalid" } : r);
  assert.equal(assessCatalogueExpansion(altered).invalidHashes.length, 1);
  assert.equal(JSON.stringify(catalogueRecords), before);
});

test("manual apply checks complete scope before opening a database connection", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/tools/apply-catalogue.ts", "utf8");
  assert.ok(source.indexOf("assertCompleteCatalogueScope(catalogueRecords)") < source.indexOf("process.env.SUPABASE_QA_ADMIN_URL"));
  assert.match(source, /--check-complete-catalogue/);
  assert.match(source, /--apply-approved-complete-catalogue/);
});
