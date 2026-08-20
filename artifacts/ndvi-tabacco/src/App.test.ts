import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FASI_GRANO,
  GRANO_DURO_DB,
  calcola,
  calcolaDensita,
  calcolaDensitaGrano,
  calcolaFabbisognoNGrano,
  calcolaQuotaNGrano,
  granoKgHaDaSemiMq,
  granoSemiMqDaKgHa,
  ndviOttimale,
  statisticheNdvi,
} from "./calculations";

const EPSILON = 1e-9;
const BURLEY_REFERENCE = {
  label: "Burley (Non Cimato)",
  categoria: "Light Air-Cured",
  resaDefault: 4.5,
  resaMin: 4,
  resaMax: 5.6,
  azotoDefault: 175,
  azotoMin: 150,
  azotoMax: 200,
  kgNPerTon: 36,
  densitaPianteDefault: 16_000,
  kgSemiDefault: 0.002,
};
const GRANO_CONVERSION_FIXTURES = [
  { variety: "Redidenari", semiMq: 215, pmg: 45, kgHa: 96.75 },
  { variety: "Telemaco", semiMq: 205, pmg: 45, kgHa: 92.25 },
  { variety: "President", semiMq: 192.5, pmg: 45, kgHa: 86.625 },
  { variety: "Federico II", semiMq: 180, pmg: 45, kgHa: 81 },
  { variety: "Egeo", semiMq: 215, pmg: 45, kgHa: 96.75 },
  { variety: "Minosse", semiMq: 225, pmg: 45, kgHa: 101.25 },
  { variety: "Spineto", semiMq: 240, pmg: 45, kgHa: 108 },
  { variety: "Farah", semiMq: 270, pmg: 45, kgHa: 121.5 },
  { variety: "Furio Camillo", semiMq: 215, pmg: 45, kgHa: 96.75 },
  { variety: "Marco Aurelio", semiMq: 215, pmg: 45, kgHa: 96.75 },
  { variety: "Nazareno", semiMq: 170, pmg: 45, kgHa: 76.5 },
  { variety: "Quadrato", semiMq: 240, pmg: 45, kgHa: 108 },
  { variety: "Giulio", semiMq: 205, pmg: 45, kgHa: 92.25 },
] as const;

function assertApproximately(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < EPSILON, `${message}: expected ${expected}, received ${actual}`);
}

describe("grano duro seed-rate conversions", () => {
  it("matches independent kg/ha fixtures for every listed variety PMG", () => {
    for (const fixture of GRANO_CONVERSION_FIXTURES) {
      const dati = GRANO_DURO_DB[fixture.variety];
      assert.ok(dati, `missing ${fixture.variety} from the variety database`);
      assert.equal(dati.pesoMilleSemiG, fixture.pmg, `${fixture.variety} PMG`);
      assert.equal(dati.densitaSemiMqDefault, fixture.semiMq, `${fixture.variety} default seeds/m²`);
      assertApproximately(
        granoKgHaDaSemiMq(fixture.semiMq, dati),
        fixture.kgHa,
        `${fixture.variety} seeds/m² → kg/ha`,
      );
      assertApproximately(
        granoSemiMqDaKgHa(fixture.kgHa, dati),
        fixture.semiMq,
        `${fixture.variety} kg/ha → seeds/m²`,
      );

      const fromKg = calcolaDensitaGrano(fixture.kgHa, "kg/ha", dati);
      const fromSemiHa = calcolaDensitaGrano(fixture.semiMq * 10_000, "semi/ha", dati);
      assertApproximately(fromKg.semiMqEquivalenti, fixture.semiMq, `${fixture.variety} planner kg/ha conversion`);
      assertApproximately(fromSemiHa.semiMqEquivalenti, fixture.semiMq, `${fixture.variety} planner seeds/ha conversion`);
      assert.equal(fromKg.semiHaEquivalenti, fromSemiHa.semiHaEquivalenti);
    }
  });

  it("uses the supplied PMG rather than assuming the current 45 g varietal value", () => {
    const fiftyGramPmg = {
      label: "Fixture 50 g PMG",
      densitaSemiMqMin: 200,
      densitaSemiMqMax: 240,
      densitaSemiMqDefault: 220,
      pesoMilleSemiG: 50,
    };

    assert.equal(granoKgHaDaSemiMq(220, fiftyGramPmg), 110);
    assert.equal(granoSemiMqDaKgHa(110, fiftyGramPmg), 220);
    assert.equal(calcolaDensitaGrano(110, "kg/ha", fiftyGramPmg).semiMqEquivalenti, 220);
  });
});

describe("grano duro nitrogen planning", () => {
  it("maps the disciplinary yield boundaries to 120, 150, and 180 kg N/ha", () => {
    assert.deepEqual(calcolaFabbisognoNGrano(40, 1), { base: 120, corretto: 120 });
    assert.deepEqual(calcolaFabbisognoNGrano(50, 1), { base: 150, corretto: 150 });
    assert.deepEqual(calcolaFabbisognoNGrano(60, 1), { base: 180, corretto: 180 });
  });

  it("matches the scaled phase quotas at the lowest and highest density corrections", () => {
    const quotaFixtures = [
      { resaQHa: 40, fattoreDensita: 0.9, expected: [27, 40, 40, 20] },
      { resaQHa: 60, fattoreDensita: 0.9, expected: [34, 48, 53, 27] },
      { resaQHa: 40, fattoreDensita: 1.1, expected: [27, 40, 44, 22] },
      { resaQHa: 60, fattoreDensita: 1.1, expected: [36, 50, 60, 30] },
    ];

    for (const fixture of quotaFixtures) {
      const fabbisognoN = calcolaFabbisognoNGrano(fixture.resaQHa, fixture.fattoreDensita).corretto;
      const quote = FASI_GRANO.map((fase) => calcolaQuotaNGrano(fabbisognoN, fase));
      assert.deepEqual(
        quote,
        fixture.expected,
        `${fixture.resaQHa} q/ha at density factor ${fixture.fattoreDensita}`,
      );
      for (const [index, quota] of quote.entries()) {
        const fase = FASI_GRANO[index];
        assert.ok(quota >= fase.azotoMin && quota <= fase.azotoMax, `${fase.label} remains in range`);
      }
    }
  });
});

describe("tobacco calculations", () => {
  it("preserves NDVI statistics and the standard nitrogen recommendation", () => {
    const stats = statisticheNdvi([0.5, 0.5, 0.5, 0.5, 0.5]);
    assert.equal(stats.media, 0.5);
    assert.equal(stats.varianza, 0);
    assert.equal(stats.coefficienteVariazione, 0);
    assert.equal(stats.valoriValidi, true);

    const result = calcola(4.5, 120, 42, 0.5, 0.5, 0.5, 0.5, 0.5, 120);
    assertApproximately(result.ottimale, 0.64, "tobacco NDVI optimum at 42 days");
    assertApproximately(result.dose, 60, "tobacco nitrogen dose cap");
    assert.equal(result.fabbisognoN, 120);
    assert.equal(result.rapportoAzoto, 1);
    assert.equal(result.statoAzoto, "allineato");
    assert.equal(result.statoVariabilita, "bassa");
  });

  it("keeps default tobacco density neutral in both supported units", () => {
    const variety = BURLEY_REFERENCE;
    const byPlants = calcolaDensita(variety.densitaPianteDefault, "piante/ha", variety);
    const bySeed = calcolaDensita(variety.kgSemiDefault, "kg/ha", variety);

    assert.equal(byPlants.pianteHaEquivalenti, variety.densitaPianteDefault);
    assert.equal(byPlants.rapportoDensita, 1);
    assert.equal(byPlants.fattoreAzoto, 1);
    assert.equal(bySeed.pianteHaEquivalenti, variety.densitaPianteDefault);
    assert.equal(bySeed.rapportoDensita, 1);
    assert.equal(bySeed.fattoreAzoto, 1);
  });

  it("does not recommend nitrogen when observed NDVI is already above target", () => {
    const result = calcola(4.5, 120, 42, 0.8, 0.8, 0.8, 0.8, 0.8, 120);
    assert.equal(result.dose, 0);
    assert.equal(result.statoAzoto, "allineato");
    assert.equal(result.valoriValidi, true);
  });

  it("keeps nursery age adjustments on the continuous NDVI curve", () => {
    assert.equal(ndviOttimale(0, "standard").ottimale, 0.28);
    assertApproximately(ndviOttimale(0, "avanzata").ottimale, 0.31, "advanced nursery curve adjustment");
    assert.equal(ndviOttimale(0, "extra").ottimale, 0.34);
  });
});