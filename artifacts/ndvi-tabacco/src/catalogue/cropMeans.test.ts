import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCropMeanProfiles, cropMeanExpansion, cropCatalogue, CROP_PROFILES,
  completeProfile, calculateCrop, parseProfiles,
} from "@workspace/crop-calculations";

const original = JSON.parse(readFileSync(new URL("../../../../lib/crop-calculations/src/catalogue.json", import.meta.url), "utf8"));
const extra = JSON.parse(readFileSync(new URL("../../../../lib/crop-calculations/src/extra-catalogue.json", import.meta.url), "utf8"));
const base = { columns: original.columns as string[], rows: [...original.rows, ...extra.rows] as string[][] };
const request = {
  crop: "Melanzana", name: "QA synthetic", destination: "Mercato fresco",
  use: "Consumo diretto", earliness: "Media", identitySource: "https://example.test/synthetic",
};

test("whole-crop averages add only the three sourced identities without changing the original 848 rows", () => {
  assert.deepEqual(cropCatalogue.rows.slice(0, 848), base.rows);
  assert.equal(cropMeanExpansion.rows.length, 3);
  assert.deepEqual(cropMeanExpansion.excluded, []);
  assert.deepEqual(cropMeanExpansion.trace.map(t => t.name), ["Melana F1", "Tasca F1", "Egle F1"]);
  for (const trace of cropMeanExpansion.trace) {
    assert.equal(trace.donorVarieties.length, 60);
    assert.equal(trace.experimentallyValidated, false);
    assert.ok(!trace.donorVarieties.some(name => /^(Melana|Tasca|Egle) F1$/.test(name)));
    for (const [column, meta] of Object.entries(trace.values)) {
      const values = base.rows.filter(r => r[0] === "Melanzana").map(r => Number(r[base.columns.indexOf(column)]));
      const digits = column.startsWith("NDVI") ? 3 : 2;
      assert.equal(meta.value, Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(digits)), column);
      assert.equal(meta.count, 60);
      assert.equal(meta.min, Math.min(...values));
      assert.equal(meta.max, Math.max(...values));
    }
    const profile = CROP_PROFILES.find(p => p.crop === trace.crop && p.name === trace.name)!;
    assert.ok(completeProfile(profile));
    for (const phase of profile.phases) {
      const r = calculateCrop({ crop: profile.crop, variety: profile.name, phase: phase.id,
        confirmed: true, yield: profile.yield, applied: 0, readings: Array(5).fill(phase.riferimento) });
      assert.equal(r.pronta, true);
      assert.equal(r.dose, 0);
    }
  }
});

test("means use a frozen whole-crop cohort, never recursive newly generated varieties", () => {
  const before = JSON.stringify(base);
  const result = buildCropMeanProfiles(base, [request, { ...request, name: "QA second" }]);
  assert.deepEqual(result.rows[0].slice(2), result.rows[1].slice(2));
  assert.equal(result.trace[0].donorVarieties.length, 60);
  assert.equal(result.trace[1].donorVarieties.length, 60);
  assert.equal(JSON.stringify(base), before);
  assert.ok(parseProfiles(result.rows).every(completeProfile));
});

test("a crop with no real donors stays excluded: a mean of an empty sample is not invented", () => {
  for (const crop of ["Grano tenero", "Orzo", "Avena", "Triticale", "Melone", "Carciofo",
    "Cavolo cappuccio", "Cavolo verza", "Cavolo nero", "Cavolini di Bruxelles",
    "Cavolfiore", "Patata", "Carota", "Rucola", "Fragola", "Pesco", "Albicocco",
    "Peperone", "Miglio", "Fagiolino", "Fava", "Favino", "Erba medica"]) {
    const result = buildCropMeanProfiles(base, [{ ...request, crop }]);
    assert.deepEqual(result.rows, []);
    assert.equal(result.excluded[0].reason, "CROP_MEAN_NO_SAME_CROP_DATA", crop);
  }
});

test("production uses and incompatible phase schemes are not mixed or numerically averaged", () => {
  assert.equal(buildCropMeanProfiles(base, [{ ...request, destination: "Foraggio" }]).rows.length, 0);
  const changed = structuredClone(base);
  const donor = changed.rows.find(r => r[0] === "Melanzana")!;
  donor[changed.columns.indexOf("BBCH F2")] = "60-69";
  assert.equal(buildCropMeanProfiles(changed, [request]).excluded[0].reason, "CROP_MEAN_INCOMPATIBLE_PHASES");
});

test("empty, incomplete and duplicate identities are not published", () => {
  assert.equal(buildCropMeanProfiles(base, [{ ...request, earliness: "" }]).rows.length, 0);
  assert.equal(buildCropMeanProfiles(base, [{ ...request, identitySource: "" }]).rows.length, 0);
  assert.equal(buildCropMeanProfiles(base, [{ ...request, name: "Epic" }]).rows.length, 0);
  const twice = buildCropMeanProfiles(base, [request, request]);
  assert.equal(twice.rows.length, 1);
  assert.equal(twice.excluded[0].reason, "CROP_MEAN_IDENTITY_EXISTS");
  assert.throws(() => buildCropMeanProfiles({ ...base, rows: [...base.rows, base.rows[0]] }, [request]), /DUPLICATE_DONOR/);
  assert.throws(() => buildCropMeanProfiles({ columns: [], rows: [] }, [request]), /COLUMNS_MISSING/);
});

test("rows with missing or invalid numerical evidence cannot provide averages", () => {
  const noData = { ...base, rows: base.rows.filter(r => r[0] === "Melanzana").map(r => {
    const row = [...r]; row[base.columns.indexOf("NDVI F1")] = ""; return row;
  }) };
  assert.equal(buildCropMeanProfiles(noData, [request]).excluded[0].reason, "CROP_MEAN_NO_SAME_CROP_DATA");
});
