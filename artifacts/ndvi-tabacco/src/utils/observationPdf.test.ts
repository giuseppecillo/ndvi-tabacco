import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Observation } from "../App";
import { LOCALES, setLanguage } from "../i18n/runtime";
import { buildObservationPdf, buildObservationPdfRows } from "./observationPdf";

afterEach(() => setLanguage("it"));

// Deliberately fictional, with names matching translation keys and Spanish glyphs.
const fixture: Observation = {
  id: "SYN-ñ-01", coltura: "tabacco", data: "2026-11-06", dataTrapianto: "2026-09-02",
  giorni: 65, etaPiantina: "standard", cliente: "Media", appezzamento: "Fioritura",
  resa: 4.5, varieta: "Burley (Non Cimato)",
  n1: 0.51, n2: 0.62, n3: 0.73, n4: 0.64, n5: 0.55,
  media: 0.610, ottimale: 0.790, discostamento: 0.180, dose: 39.9,
  azotoTotale: 175, azotoGiaDistribuito: 80, lat: -34.123456, lng: -58.654321,
};
const accented = {
  ...fixture, id: "SYN-02", cliente: "Peña áéíóúü ¡Sí!",
  appezzamento: "Parcela ¿Niño? · Caffè", dose: 0, lat: null, lng: null,
};
const outputDir = process.env.REPORT_PDF_DIR;

for (const language of ["it", "en", "es"] as const) {
  test(`PDF ${language}: local dates/numbers, accents, unchanged source data and pagination`, () => {
    setLanguage(language);
    const rows = [fixture, accented];
    const original = JSON.stringify(rows);
    const cells = buildObservationPdfRows(rows);
    assert.equal(cells[0][0], fixture.id);
    // ICU versions differ on optional leading zeros for it-IT. Check against
    // the selected locale, not a hardcoded padding convention.
    assert.equal(cells[0][1], new Intl.DateTimeFormat(LOCALES[language])
      .format(new Date(2026, 10, 6)));
    assert.match(String(cells[0][1]), /^0?6\/11\/2026$/);
    assert.equal(cells[0][3], "Media");
    assert.equal(cells[0][4], "Fioritura");
    assert.equal(cells[1][3], accented.cliente);
    assert.equal(cells[1][4], accented.appezzamento);
    for (const [column, value] of [[6, .51], [11, .610], [12, .790], [13, .180], [14, 39.9], [15, -34.123456], [16, -58.654321]]) {
      assert.equal(Number(String(cells[0][column]).replace(",", ".")), value);
    }
    assert.equal(cells[1][15], "—");
    const wheat = { ...fixture, coltura: "grano duro" as const, dataSemina: "2026-10-01", dataTrapianto: "" };
    assert.equal(buildObservationPdfRows([wheat])[0][2],
      new Date(2026, 9, 1).toLocaleDateString(LOCALES[language]));

    for (const [scenario, observations] of [
      ["empty", []], ["single", [fixture]], ["accents", rows],
      ["multipage", Array.from({ length: 90 }, (_, i) => ({
        ...accented, id: `SYN-${String(i).padStart(3, "0")}`,
      }))],
    ] as const) {
      const pdf = buildObservationPdf(observations, {
        exportedAt: new Date(2026, 10, 6, 12),
        logo: `data:image/png;base64,${readFileSync(new URL("../../public/taurus-logo.png", import.meta.url)).toString("base64")}`,
      });
      assert.ok(pdf.output("arraybuffer").byteLength > 1000);
      assert.equal(pdf.getNumberOfPages() > 1, scenario === "multipage");
      if (outputDir) {
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(join(outputDir, `${language}-${scenario}.pdf`), Buffer.from(pdf.output("arraybuffer")));
      }
    }
    assert.equal(JSON.stringify(rows), original, "No source field may be mutated by export");
  });
}
