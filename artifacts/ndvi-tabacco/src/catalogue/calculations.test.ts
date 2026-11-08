import assert from "node:assert/strict";
import test from "node:test";
import { CROP_PROFILES, CATALOGUE_CROPS, cropCatalogue, completeProfile, cropCompleteness,
  parseProfiles, resolveReference, calculateCrop, cropPhaseSource, catalogueObservationError } from "@workspace/crop-calculations";
import { serieDistribuzioneOsservazioni } from "../observationDistribution";
import { catalogue } from "../i18n/catalogue";
import { setLanguage, t, hasTranslation } from "../i18n/runtime";

test("all 848 profiles of fifteen crops are complete before enabling calculation", () => {
  assert.equal(CROP_PROFILES.length, 848);
  assert.equal(CATALOGUE_CROPS.length, 15);
  assert.equal(new Set(CROP_PROFILES.map(p => `${p.crop}/${p.name}`)).size, 848);
  assert.ok(CROP_PROFILES.every(completeProfile));
  assert.ok(cropCompleteness.every(p => p.reference?.kind === "direct"));
  for (const crop of CATALOGUE_CROPS) assert.ok(CROP_PROFILES.some(p => p.crop === crop));
  assert.ok(!CROP_PROFILES.some(p => p.crop === "Kiwi" && /^(Tomuri|Matua|Chieftain|Belen|Bounty 71)$/i.test(p.name)));
});

test("numeric intervals use their arithmetic mean, never an endpoint", () => {
  for (const interval of ["0,4-0,6", "0.4–0.6", "0,4 - 0,6"]) {
    const row = [...cropCatalogue.rows[0]];
    row[cropCatalogue.columns.indexOf("NDVI F1")] = interval;
    assert.equal(parseProfiles([row])[0].phases[0].riferimento, .5);
  }
});

test("missing parameters resolve to a named, complete, agronomically similar profile of the same crop only", () => {
  const original = CROP_PROFILES[0];
  const incomplete = structuredClone(original);
  incomplete.phases[0].riferimento = NaN;
  const resolved = resolveReference(incomplete, CROP_PROFILES);
  assert.ok(resolved);
  assert.equal(resolved.kind, "affine");
  assert.equal(resolved.selected.name, original.name);
  assert.notEqual(resolved.reference.name, original.name);
  assert.equal(resolved.reference.crop, original.crop);
  assert.equal(resolved.reference.destination, original.destination);
  assert.equal(resolved.reference.use, original.use);
  assert.equal(resolved.reference.earliness, original.earliness);
  assert.ok(completeProfile(resolved.reference));
  assert.equal(resolveReference(incomplete, CROP_PROFILES.filter(p => p.crop !== original.crop)), null);
  assert.equal(resolveReference(incomplete, []), null);
});

test("every variety, all four stages: quota/yield scaling, zero at or above NDVI, residual caps and confirmation", () => {
  for (const profile of CROP_PROFILES) for (const phase of profile.phases) {
    const input = { crop: profile.crop, variety: profile.name, phase: phase.id, confirmed: true,
      yield: profile.yield, applied: 0, readings: Array(5).fill(phase.riferimento / 2) };
    const result = calculateCrop(input);
    assert.equal(result.pronta, true, `${profile.crop}/${profile.name}/${phase.id}`);
    assert.equal(result.ottimale, phase.riferimento);
    assert.equal(result.azotoTotale, profile.nitrogen);
    assert.equal(result.quota, phase.azoto);
    assert.equal(result.dose, Math.min(phase.azoto, Math.round(phase.azoto * .5 * 10) / 10));
    const scaled = calculateCrop({ ...input, yield: profile.yield * 1.5 });
    assert.ok(Math.abs(scaled.azotoTotale - result.azotoTotale * 1.5) < 1e-10);
    for (const ndvi of [phase.riferimento, 1]) {
      assert.equal(calculateCrop({ ...input, readings: Array(5).fill(ndvi) }).dose, 0);
    }
    assert.equal(calculateCrop({ ...input, confirmed: false }).pronta, false);
    assert.equal(calculateCrop({ ...input, confirmed: false }).dose, 0);
    assert.equal(calculateCrop({ ...input, applied: profile.nitrogen + 1 }).dose, 0);
    const capped = calculateCrop({ ...input, applied: profile.nitrogen - .01 });
    assert.ok(capped.dose >= 0 && capped.dose <= capped.residuo && capped.dose <= capped.quota);
    assert.equal(capped.dose, 0, `${profile.crop}/${profile.name}/${phase.id}: sub-tenth residual`);
    assert.ok(!calculateCrop({ ...input, variety: "not-a-variety" }).pronta);
    assert.ok(!calculateCrop({ ...input, readings: [NaN, 0, 0, 0, 0] }).pronta);
    assert.ok(!calculateCrop({ ...input, yield: 0 }).pronta);
    assert.ok(!calculateCrop({ ...input, applied: -1 }).pronta);
  }
});

test("API validation independently recalculates every crop, rejects forged values and keeps identities in history", () => {
  for (const crop of CATALOGUE_CROPS) {
    const p = CROP_PROFILES.find(p => p.crop === crop)!;
    const r = calculateCrop({ crop, variety: p.name, phase: "F1", confirmed: true, yield: p.yield,
      applied: 0, readings: [.2, .2, .2, .2, .2] });
    const o = { id: "synthetic", coltura: crop, data: "2026-11-09", cliente: "synthetic", appezzamento: "synthetic", varieta: p.name, resa: p.yield,
      giorni: 0, densitaValore: p.plants, densitaUnita: "piante/ha", pianteHaEquivalenti: p.plants,
      n1: .2, n2: .2, n3: .2, n4: .2, n5: .2, media: r.media, ottimale: r.ottimale,
      discostamento: r.discostamento, dose: r.dose, quotaAzoto: r.dose, azotoTotale: r.azotoTotale,
      azotoGiaDistribuito: 0, bbch: null, faseFenologica: `F1 · ${r.attiva!.label}`,
      faseFonte: cropPhaseSource(crop, p.name) };
    assert.equal(catalogueObservationError(o), null);
    for (const field of ["dose", "quotaAzoto", "media", "ottimale", "discostamento", "azotoTotale"] as const) {
      assert.ok(catalogueObservationError({ ...o, [field]: o[field] + 1 }), field);
    }
    for (const invalid of [{ varieta: "missing" }, { faseFonte: "unconfirmed" }, { bbch: "65" },
      { phase: "F1", faseFenologica: "F5" }, { n1: null }, { n1: Infinity }, { densitaValore: NaN },
      { densitaUnita: "kg/ha" }, { azotoGiaDistribuito: -1 }, { data: "2026-02-31" },
      { cliente: "" }, { appezzamento: null }, { lat: 91, lng: 12 }, { lat: 45, lng: Infinity }]) {
      assert.ok(catalogueObservationError({ ...o, ...invalid }));
    }
    const points = serieDistribuzioneOsservazioni([o]);
    assert.equal(points[0].coltura, crop);
    assert.equal(points[0].azotoIndicato, r.dose);
    assert.equal(points[0].varieta, p.name);
  }
});

test("new copy is translated in EN/ES without translating cultivar identities", () => {
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const [it, en, es] of catalogue) assert.equal(t(it), language === "en" ? en : es, it);
    for (const p of CROP_PROFILES) {
      assert.ok(hasTranslation(p.crop));
      assert.equal(t(`Riferimento: ${p.name}`), `${language === "en" ? "Reference" : "Referencia"}: ${p.name}`);
    }
  }
  setLanguage("it");
});
