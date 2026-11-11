import assert from "node:assert/strict";
import test from "node:test";
import { buildBreadWheatReference } from "./bread-wheat-reference";
import evidence from "./research-numeric-evidence.json";
import {
  GRANO_DURO_DB, NDVI_GRANO_CURVA, fasiGranoPerVarieta, calcolaQuotaNGrano,
} from "../../lib/grain-calculations/src/index";

test("authorized wheat proxy computes means over all fourteen native reference plans", () => {
  const reference = buildBreadWheatReference();
  assert.equal(reference.nitrogen.donorCount, 14);
  assert.deepEqual(reference.donorVarieties, Object.keys(GRANO_DURO_DB).sort());
  assert.equal(reference.nitrogen.meanNativeReferencePlan, (13 * 150 + 180) / 14);
  assert.equal(reference.experimentallyValidatedForTarget, false);
  assert.equal(reference.catalogueActivationAllowed, false);
});

test("mean native NDVI preserves every day and value without inventing stage mappings", () => {
  const reference = buildBreadWheatReference();
  assert.equal(reference.ndvi.axis, "days-after-sowing");
  assert.equal(reference.ndvi.curve.length, NDVI_GRANO_CURVA.length);
  reference.ndvi.curve.forEach((point, i) => {
    assert.equal(point.days, NDVI_GRANO_CURVA[i].das);
    assert.ok(Math.abs(point.mean - NDVI_GRANO_CURVA[i].ottimale) < 1e-14);
    assert.equal("bbch" in point, false);
  });
});

test("special RGT NATUR phases are never silently averaged into the thirteen-variety cohort", () => {
  const { phaseCohorts } = buildBreadWheatReference().nitrogen;
  assert.equal(phaseCohorts.length, 2);
  const special = phaseCohorts.find(c => c.donorVarieties.includes("RGT NATUR"))!;
  assert.deepEqual(special.donorVarieties, ["RGT NATUR"]);
  assert.deepEqual(special.phases.map(p => p.meanDoseKgHa), [30, 90, 60]);
  const common = phaseCohorts.find(c => c.donorVarieties.length === 13)!;
  assert.equal(common.phases.length, 4);
  common.phases.forEach((p, i) => assert.equal(p.meanDoseKgHa,
    calcolaQuotaNGrano(150, fasiGranoPerVarieta("Redidenari")[i])));
});

test("reference preparation neither mutates donor data nor transfers density/yield", () => {
  const before = JSON.stringify({ GRANO_DURO_DB, NDVI_GRANO_CURVA });
  const first = buildBreadWheatReference();
  first.ndvi.curve[0].mean = 0.99;
  assert.equal(JSON.stringify({ GRANO_DURO_DB, NDVI_GRANO_CURVA }), before);
  assert.ok(Math.abs(buildBreadWheatReference().ndvi.curve[0].mean - 0.2) < 1e-14);
  assert.equal("plants" in first, false);
  assert.equal("yield" in first, false);
});

test("millet means keep the same species, index and principal stage", () => {
  const study = evidence.studies.find(s => s.id === "millet-sentinel-2022")!;
  assert.equal(study.species, "Panicum miliaceum");
  const stages = study.observations!;
  assert.equal(stages.length, 9);
  for (const [stage, expectedCount, expectedMean] of [[3, 1, .58], [6, 3, .73], [7, 1, .8], [8, 3, .72], [9, 1, .63]]) {
    const values = stages.filter(s => s.bbchPrincipal === stage).map(s => s.ndvi);
    assert.equal(values.length, expectedCount);
    assert.ok(Math.abs(values.reduce((a, b) => a + b, 0) / values.length - expectedMean) < 1e-12);
  }
});

test("triticale evidence preserves named varieties, seed units and distinct early N applications", () => {
  const study = evidence.studies.find(s => s.id === "triticale-karaman-2023")!;
  assert.equal(study.sowing?.unit, "seeds/m2");
  assert.equal(study.sowing?.notMeasuredPlants, true);
  assert.equal(study.nitrogenApplications!.reduce((sum, p) => {
    assert.ok("kgHa" in p && Number.isFinite(p.kgHa));
    return sum + p.kgHa;
  }, 0), 90);
  assert.equal(study.namedVarieties!.length, 13);
  assert.equal(new Set(study.namedVarieties!.map(v => v.name)).size, 13);
  assert.equal(study.publishedMeans!.ndvi.find(p => p.stage === "GS83")!.value, .548);
  for (const variety of study.namedVarieties!) {
    assert.ok(variety.grainYieldKgHa > 0);
    for (const value of [variety.ndviGS49, variety.ndviGS60, variety.ndviGS70_1, variety.ndviGS83, variety.ndviGS85]) {
      assert.ok(Number.isFinite(value) && value > 0 && value < 1);
    }
  }
});

test("new numerical evidence remains offline and cannot substitute an operational profile", () => {
  assert.equal(evidence.operational, false);
  assert.equal(evidence.status, "research-only-not-catalogue");
  for (const study of evidence.studies) {
    assert.ok(study.source.startsWith("http"));
    assert.ok(study.unresolved.length > 0);
    assert.equal("profile" in study, false);
  }
});

test("Sunrise nitrogen and density marginal yields are not conflated into a fictitious treatment", () => {
  const study = evidence.studies.find(s => s.id === "millet-sunrise-nitrogen-2023")!;
  assert.equal(study.densityMarginalMeans!.find(p => p.plantsPerM2 === 222)!.grainYieldKgHa, 3211);
  assert.equal(study.nitrogenMarginalMeans!.find(p => p.nitrogenKgHa === 150)!.grainYieldKgHa, 3263);
  assert.equal("jointTreatments" in study, false);
  const density = evidence.studies.find(s => s.id === "triticale-povh-density-2008")!;
  assert.equal(density.plantsPerLinearM, 70);
  assert.equal(density.rowSpacingM, .17);
  assert.equal(density.mineralNitrogenAtSowingKgHa, 40);
  assert.deepEqual(density.testedTopdressNitrogenKgHa, [0, 40, 80, 120, 160]);
});

test("documented zero mineral N is retained for faba minor without inventing a positive dose", () => {
  const study = evidence.studies.find(s => s.id === "faba-minor-fixation-2023")!;
  assert.equal(study.species, "Vicia faba L. minor");
  assert.equal(study.mineralFertilizerNitrogenKgHa, 0);
  assert.deepEqual(study.sowingRates!.values, [25, 50]);
  assert.equal(study.sowingRates!.notMeasuredPlants, true);
  assert.equal("biologicalFixationKgHa" in study, false);
});
