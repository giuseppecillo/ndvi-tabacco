import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FASI_GRANO,
  FINESTRE_DAS_LOCALI_TEMPLATE,
  GRANO_DURO_DB,
  calcola,
  calcolaDensita,
  calcolaDensitaGrano,
  calcolaFabbisognoNGrano,
  calcolaPianoNGrano,
  calcolaQuotaNGrano,
  faseGranoConfermataDaBbch,
  faseGranoDaBbch,
  granoKgHaDaSemiMq,
  granoSemiMqDaKgHa,
  ndviOttimaleGrano,
  ndviOttimale,
  statisticheNdvi,
  stimaFaseGranoDaDas,
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
  { variety: "Redidenari", semiMq: [360, 410], kgHa: [200, 230] },
  { variety: "Telemaco", semiMq: [360, 410], kgHa: [190, 220] },
  { variety: "President", semiMq: [300, 350], kgHa: [165, 220] },
  { variety: "Federico II", semiMq: [350, 350], kgHa: [170, 190] },
  { variety: "Egeo", semiMq: [360, 410], kgHa: [200, 230] },
  { variety: "Minosse", semiMq: [380, 430], kgHa: [210, 240] },
  { variety: "Spineto", semiMq: [400, 450], kgHa: [240, 240] },
  { variety: "Farah", semiMq: [450, 500], kgHa: [270, 270] },
  { variety: "Furio Camillo", semiMq: [400, 450], kgHa: [200, 230] },
  { variety: "Marco Aurelio", semiMq: [400, 450], kgHa: [200, 230] },
  { variety: "Nazareno", semiMq: [350, 400], kgHa: [170, 170] },
  { variety: "Quadrato", semiMq: [400, 450], kgHa: [220, 260] },
  { variety: "Giulio", semiMq: [370, 400], kgHa: [190, 220] },
] as const;

function assertApproximately(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < EPSILON, `${message}: expected ${expected}, received ${actual}`);
}

describe("grano duro seed-rate conversions", () => {
  it("keeps disciplinary seed density and seed dose as separate ranges", () => {
    for (const fixture of GRANO_CONVERSION_FIXTURES) {
      const dati = GRANO_DURO_DB[fixture.variety];
      assert.ok(dati, `missing ${fixture.variety} from the variety database`);
      assert.equal(dati.densitaSemiMqMin, fixture.semiMq[0], `${fixture.variety} minimum seeds/m²`);
      assert.equal(dati.densitaSemiMqMax, fixture.semiMq[1], `${fixture.variety} maximum seeds/m²`);
      assert.equal(dati.doseSemeKgHaMin, fixture.kgHa[0], `${fixture.variety} minimum seed kg/ha`);
      assert.equal(dati.doseSemeKgHaMax, fixture.kgHa[1], `${fixture.variety} maximum seed kg/ha`);

      const fromDose = calcolaDensitaGrano(fixture.kgHa[0], "kg/ha", dati);
      assert.equal(fromDose.fuoriRange, false, `${fixture.variety} lower seed dose remains valid`);
      assert.equal(fromDose.fuoriRangeDose, false, `${fixture.variety} lower seed dose range`);

      const fromDensity = calcolaDensitaGrano(fixture.semiMq[0], "semi/m²", dati);
      assert.equal(fromDensity.fuoriRange, false, `${fixture.variety} lower seed density remains valid`);
      assert.equal(fromDensity.fuoriRangeDensita, false, `${fixture.variety} lower seed density range`);

      const midDose = dati.doseSemeKgHaDefault;
      const convertedDensity = granoSemiMqDaKgHa(midDose, dati);
      assertApproximately(
        granoKgHaDaSemiMq(convertedDensity, dati),
        midDose,
        `${fixture.variety} kg/ha conversion round-trip`,
      );
      assertApproximately(
        calcolaDensitaGrano(midDose, "kg/ha", dati).doseKgHaEquivalente,
        midDose,
        `${fixture.variety} planner dose conversion`,
      );
    }
  });

  it("uses the supplied PMG rather than assuming a generic varietal value", () => {
    const fiftyGramPmg = {
      label: "Fixture 50 g PMG",
      densitaSemiMqMin: 200,
      densitaSemiMqMax: 240,
      densitaSemiMqDefault: 220,
      doseSemeKgHaMin: 100,
      doseSemeKgHaMax: 120,
      doseSemeKgHaDefault: 110,
      pesoMilleSemiG: 50,
    };

    assert.equal(granoKgHaDaSemiMq(220, fiftyGramPmg), 110);
    assert.equal(granoSemiMqDaKgHa(110, fiftyGramPmg), 220);
    assert.equal(calcolaDensitaGrano(110, "kg/ha", fiftyGramPmg).semiMqEquivalenti, 220);
  });
});

describe("grano duro BBCH and local DAS estimate", () => {
  it("uses BBCH as the authoritative phase selection", () => {
    assert.equal(faseGranoDaBbch("20–29")?.label, "Accestimento");
    assert.equal(faseGranoDaBbch("37–39")?.label, "Foglia a bandiera");
    assert.equal(faseGranoDaBbch("99"), null);
  });

  it("does not activate a BBCH phase from a DAS prefill until it is explicitly confirmed", () => {
    assert.equal(faseGranoConfermataDaBbch("20–29", false), null);
    assert.equal(faseGranoConfermataDaBbch("20–29", true)?.label, "Accestimento");
  });

  it("keeps the DAS estimate separate and configurable", () => {
    assert.equal(stimaFaseGranoDaDas(60, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Accestimento");
    assert.equal(stimaFaseGranoDaDas(140, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Inizio levata");
    assert.equal(stimaFaseGranoDaDas(260, FINESTRE_DAS_LOCALI_TEMPLATE), null);
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

  it("uses a grain-specific NDVI reference across the autumn-to-wax-maturity calendar", () => {
    assert.equal(ndviOttimaleGrano(0), 0.2);
    assert.equal(ndviOttimaleGrano(165), 0.82);
    assert.equal(ndviOttimaleGrano(250), 0.42);
  });

  it("modulates a confirmed phase quota by NDVI without exceeding the phase range or residual plan", () => {
    const fase = faseGranoDaBbch("20–29");
    assert.ok(fase);

    const adequate = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.7, 0.7, 0.7, 0.7, 0.7],
    });
    assert.equal(adequate.quotaBase, 45);
    assert.equal(adequate.quotaProposta, 45);
    assert.equal(adequate.residuoPiano, 90);
    assert.equal(adequate.verificaCampo, false);

    const deficit = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.4, 0.4, 0.4, 0.4, 0.4],
    });
    assert.equal(deficit.fattoreNdvi, 1.15);
    assert.equal(deficit.quotaProposta, fase.azotoMax);
    assert.equal(deficit.verificaCampo, true);

    const residualExhausted = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140,
      fase,
      das: 100,
      lettureNdvi: [0.4, 0.4, 0.4, 0.4, 0.4],
    });
    assert.equal(residualExhausted.residuoPiano, 10);
    assert.equal(residualExhausted.quotaProposta, 10);

    const decimalResidual = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140.4,
      fase,
      das: 100,
      lettureNdvi: [0.4, 0.4, 0.4, 0.4, 0.4],
    });
    assert.equal(decimalResidual.residuoPiano, 10);
    assert.equal(decimalResidual.quotaProposta, 10);
  });

  it("does not produce a grain dose without a confirmed phase or valid NDVI readings", () => {
    const noPhase = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 0,
      fase: null,
      das: 100,
      lettureNdvi: [0.7, 0.7, 0.7, 0.7, 0.7],
    });
    assert.equal(noPhase.quotaProposta, 0);

    const invalidNdvi = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 0,
      fase: faseGranoDaBbch("20–29"),
      das: 100,
      lettureNdvi: [1.1, 0.7, 0.7, 0.7, 0.7],
    });
    assert.equal(invalidNdvi.quotaProposta, 0);
    assert.equal(invalidNdvi.verificaCampo, true);
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