import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { calcolaPomodoro, erroreOsservazionePomodoro, PRIMO_POMODORO } from "@workspace/tomato-calculations";
import { CATALOGUE_CROPS, CROP_PROFILES, calculateCrop, catalogueObservationError, cropPhaseSource } from "@workspace/crop-calculations";
import type { Observation } from "../App";
import { formatRecordedDose } from "./observationDose";
import { buildObservationPdfRows } from "./observationPdf";
import { buildObservationWorkbook } from "./observationExcel";
import { groupObservations } from "./observationHistory";
import { serieDistribuzioneOsservazioni } from "../observationDistribution";
import { buildObservationsCsv } from "./geoUtils";

// Expectations are literal, not obtained by calling the implementation under test.
const cases = [
  { remaining: .01, expected: 0 }, { remaining: .04, expected: 0 },
  { remaining: .06, expected: 0 }, { remaining: .09, expected: 0 },
  { remaining: .11, expected: .1 }, { remaining: .16, expected: .1 },
  { remaining: .19, expected: .1 }, { remaining: .26, expected: .2 },
] as const;
const base = {
  id: "synthetic-precision", data: "2026-11-08", dataTrapianto: "2026-10-01",
  cliente: "Synthetic", appezzamento: "Synthetic", giorni: 0, etaPiantina: "standard",
  densitaValore: 30000, pianteHaEquivalenti: 30000, densitaUnita: "piante/ha",
  n1: 0, n2: 0, n3: 0, n4: 0, n5: 0, media: 0, bbch: null, lat: null, lng: null,
};

test("tomato: independent sub-tenth expectations, exact API dose and quota, unchanged deficit rounding", () => {
  for (const { remaining, expected } of cases) {
    const applied = 250 - remaining;
    const r = calcolaPomodoro({ varieta: PRIMO_POMODORO, fase: "Sviluppo", confermata: true,
      resa: 100, azotoGiaDistribuito: applied, letture: [0, 0, 0, 0, 0] });
    assert.equal(r.dose, expected, `residual ${remaining}`);
    assert.ok(Number(r.dose.toFixed(1)) <= r.residuo);
    const o = { ...base, coltura: "pomodoro", varieta: PRIMO_POMODORO, resa: 100,
      azotoTotale: 250, azotoGiaDistribuito: applied, dose: expected, quotaAzoto: expected,
      ottimale: .4, discostamento: .4, faseFenologica: "Sviluppo", faseFonte: "Fase osservata in campo" };
    assert.equal(erroreOsservazionePomodoro(o), null);
    for (const unsafe of [remaining, expected + .1, expected + .000001, -1]) {
      assert.ok(erroreOsservazionePomodoro({ ...o, dose: unsafe }));
      assert.ok(erroreOsservazionePomodoro({ ...o, quotaAzoto: unsafe }));
    }
  }
  // Binary subtraction is just below .1: no epsilon may lift it to .1.
  assert.equal(calcolaPomodoro({ varieta: PRIMO_POMODORO, fase: "Sviluppo", confermata: true,
    resa: 100, azotoGiaDistribuito: 249.9, letture: [0, 0, 0, 0, 0] }).dose, 0);
  // The phase quota (.075) can also be below a tenth, even with ample residual.
  assert.equal(calcolaPomodoro({ varieta: PRIMO_POMODORO, fase: "Sviluppo", confermata: true,
    resa: .2, azotoGiaDistribuito: 0, letture: [0, 0, 0, 0, 0] }).dose, 0);
});

test("all catalogue crops: literal fractional residual expectations and strict API guards", () => {
  for (const crop of CATALOGUE_CROPS) {
    const p = CROP_PROFILES.find(p => p.crop === crop)!;
    const phase = p.phases.find(ph => ph.azoto > 1)!;
    for (const { remaining, expected } of cases) {
      const applied = p.nitrogen - remaining;
      const r = calculateCrop({ crop, variety: p.name, phase: phase.id, confirmed: true,
        yield: p.yield, applied, readings: [0, 0, 0, 0, 0] });
      assert.equal(r.dose, expected, `${crop}: ${remaining}`);
      assert.ok(Number(r.dose.toFixed(1)) <= r.residuo);
      const o = { ...base, coltura: crop, varieta: p.name, resa: p.yield,
        azotoTotale: p.nitrogen, azotoGiaDistribuito: applied, dose: expected, quotaAzoto: expected,
        ottimale: phase.riferimento, discostamento: phase.riferimento,
        faseFenologica: `${phase.id} · ${phase.label}`, faseFonte: cropPhaseSource(crop, p.name) };
      assert.equal(catalogueObservationError(o), null);
      for (const unsafe of [remaining, expected + .1, expected + .000001, -1]) {
        assert.ok(catalogueObservationError({ ...o, dose: unsafe }));
        assert.ok(catalogueObservationError({ ...o, quotaAzoto: unsafe }));
      }
    }
    assert.equal(calculateCrop({ crop, variety: p.name, phase: phase.id, confirmed: true,
      yield: p.yield * .075 / phase.azoto, applied: 0, readings: [0, 0, 0, 0, 0] }).dose, 0);
  }
});

test("new tenths and legacy fractions agree across history, chart, localized PDF and numeric Excel", async () => {
  for (const coltura of ["pomodoro", ...CATALOGUE_CROPS] as const) {
    for (const dose of [0, .1, .2, .06, .09, .16, .006, .000006]) {
      const o = { ...base, coltura, varieta: "Synthetic", resa: 100, azotoTotale: 250,
        azotoGiaDistribuito: 249.84, ottimale: .4, discostamento: .4, dose, quotaAzoto: dose } as Observation;
      const before = JSON.stringify(o);
      const fractional = [ .06, .09, .16, .006, .000006 ].includes(dose);
      const display = fractional ? String(dose) : dose.toFixed(1);
      assert.equal(formatRecordedDose(coltura, dose), display);
      assert.equal(serieDistribuzioneOsservazioni([o])[0].azotoIndicato, dose);
      const csv = buildObservationsCsv([o]).split("\r\n")[1].split(",");
      assert.equal(csv[23], display);
      assert.equal(Number(csv[26]), dose);
      for (const locale of ["it-IT", "en-GB", "es-ES"]) {
        const decimal = locale === "en-GB" ? "." : ",";
        assert.equal(buildObservationPdfRows([o], locale)[0][14], display.replace(".", decimal));
      }
      const group = groupObservations([o])[0];
      const zip = await JSZip.loadAsync(await buildObservationWorkbook(group, s => s, { taurus: new Uint8Array([1]) }));
      const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      const style = fractional ? 0 : 3;
      for (const col of ["N", "Q"]) assert.ok(sheet.includes(`<c r="${col}7" s="${style}"><v>${dose}</v></c>`));
      assert.equal(JSON.stringify(o), before);
    }
  }
  assert.equal(formatRecordedDose("tabacco", .06), "0.1");
  assert.equal(formatRecordedDose("grano duro", .06), "0.1");
});
