import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FASI_GRANO,
  FINESTRE_DAS_LOCALI_TEMPLATE,
  GRANO_DURO_DB,
  PROFILO_FENOLOGICO_GRANO,
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
  profiloFenologicoGranoDaBbch,
  profiloFenologicoGranoDaDas,
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
  it("keeps seed density and seed dose reference ranges separate", () => {
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
    assert.equal(stimaFaseGranoDaDas(30, FINESTRE_DAS_LOCALI_TEMPLATE), null);
    assert.equal(stimaFaseGranoDaDas(60, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Accestimento");
    assert.equal(stimaFaseGranoDaDas(140, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Inizio levata");
    assert.equal(stimaFaseGranoDaDas(260, FINESTRE_DAS_LOCALI_TEMPLATE), null);
  });

  it("covers every DAS from autumn sowing to maturity with one BBCH profile", () => {
    assert.equal(PROFILO_FENOLOGICO_GRANO[0].dasMin, 0);
    assert.equal(PROFILO_FENOLOGICO_GRANO.at(-1)?.dasMax, 250);
    for (const [index, fase] of PROFILO_FENOLOGICO_GRANO.entries()) {
      const precedente = PROFILO_FENOLOGICO_GRANO[index - 1];
      if (precedente) assert.equal(fase.dasMin, precedente.dasMax + 1);
      assert.equal(profiloFenologicoGranoDaDas(fase.dasMin)?.bbch, fase.bbch);
      assert.equal(profiloFenologicoGranoDaDas(fase.dasMax)?.bbch, fase.bbch);
      assert.equal(profiloFenologicoGranoDaBbch(fase.bbch)?.label, fase.label);
    }
    for (let das = 0; das <= 250; das++) {
      assert.ok(profiloFenologicoGranoDaDas(das), `DAS ${das} must belong to a phenological profile`);
    }
  });
});

describe("grano duro nitrogen planning", () => {
  it("maps the yield reference boundaries to 120, 150, and 180 kg N/ha", () => {
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
    assert.equal(ndviOttimaleGrano(135), 0.55);
    assert.equal(ndviOttimaleGrano(136), 0.65);
    assert.equal(ndviOttimaleGrano(165), 0.72);
    assert.equal(ndviOttimaleGrano(166), 0.73);
    assert.equal(ndviOttimaleGrano(190), 0.85);
    assert.equal(ndviOttimaleGrano(250), 0.42);
    for (const fase of PROFILO_FENOLOGICO_GRANO) {
      const riferimentoInizio = ndviOttimaleGrano(fase.dasMin);
      const riferimentoFine = ndviOttimaleGrano(fase.dasMax);
      assert.ok(riferimentoInizio >= fase.ndviMin - 0.02 && riferimentoInizio <= fase.ndviMax + 0.02);
      assert.ok(riferimentoFine >= fase.ndviMin - 0.02 && riferimentoFine <= fase.ndviMax + 0.02);
    }
  });

  it("keeps the requested NDVI reference ranges for the three nitrogen phases", () => {
    assert.deepEqual(profiloFenologicoGranoDaBbch("20–29") && {
      min: profiloFenologicoGranoDaBbch("20–29")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("20–29")?.ndviMax,
    }, { min: 0.4, max: 0.55 });
    assert.deepEqual(profiloFenologicoGranoDaBbch("30–32") && {
      min: profiloFenologicoGranoDaBbch("30–32")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("30–32")?.ndviMax,
    }, { min: 0.65, max: 0.72 });
    assert.deepEqual(profiloFenologicoGranoDaBbch("37–39") && {
      min: profiloFenologicoGranoDaBbch("37–39")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("37–39")?.ndviMax,
    }, { min: 0.73, max: 0.85 });
  });

  it("indicates N only for the proportional NDVI deficit and never above the residual plan", () => {
    const fase = faseGranoDaBbch("20–29");
    assert.ok(fase);

    const adequate = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.49, 0.49, 0.49, 0.49, 0.49],
    });
    assert.equal(adequate.quotaBase, 45);
    assert.equal(adequate.deficitNdvi, 0);
    assert.equal(adequate.quotaProposta, 0);
    assert.equal(adequate.residuoPiano, 90);
    assert.equal(adequate.verificaCampo, false);

    const deficit = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.ok(Math.abs(deficit.deficitRelativo - 0.5903614457831325) < 0.000001);
    assert.equal(deficit.quotaDaDeficitNdvi, 27);
    assert.equal(deficit.quotaProposta, 27);
    assert.equal(deficit.verificaCampo, true);

    const residualExhausted = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.equal(residualExhausted.residuoPiano, 10);
    assert.equal(residualExhausted.quotaProposta, 10);

    const decimalResidual = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140.4,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.equal(decimalResidual.residuoPiano, 10);
    assert.equal(decimalResidual.quotaProposta, 10);

    const aboveReference = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.6, 0.6, 0.6, 0.6, 0.6],
    });
    assert.equal(aboveReference.deficitNdvi, 0);
    assert.equal(aboveReference.quotaProposta, 0);
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
    assertApproximately(result.dose, 26.3, "tobacco nitrogen indication from NDVI deficit");
    assertApproximately(result.deficitRelativo, 0.21875, "tobacco relative NDVI deficit");
    assertApproximately(result.quotaDaDeficitNdvi, 26.3, "tobacco proportional N quota");
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

  it("uses zero N at the reference and proportional N below it", () => {
    const atReference = calcola(4.5, 120, 42, 0.64, 0.64, 0.64, 0.64, 0.64, 120);
    assert.equal(atReference.discostamento, 0);
    assert.equal(atReference.dose, 0);

    const belowReference = calcola(4.5, 120, 42, 0.5, 0.5, 0.5, 0.5, 0.5, 120);
    assertApproximately(belowReference.dose, 26.3, "tobacco deficit dose");
    assert.ok(belowReference.dose <= 120 / 2);
  });

  it("keeps nursery age adjustments on the continuous NDVI curve", () => {
    assert.equal(ndviOttimale(0, "standard").ottimale, 0.28);
    assertApproximately(ndviOttimale(0, "avanzata").ottimale, 0.31, "advanced nursery curve adjustment");
    assert.equal(ndviOttimale(0, "extra").ottimale, 0.34);
  });
});