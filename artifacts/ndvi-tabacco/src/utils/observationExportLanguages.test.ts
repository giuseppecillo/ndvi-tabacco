import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import type { Observation } from "../App";
import { getLanguage, setLanguage, t } from "../i18n/runtime";
import { buildObservationPdf, buildObservationPdfRows } from "./observationPdf";
import { buildObservationWorkbook } from "./observationExcel";
import { buildObservationsCsv } from "./geoUtils";
import { groupObservations } from "./observationHistory";
import { formatRecordedDose } from "./observationDose";
// @ts-expect-error Synthetic JS fixture is shared with the browser reproduction.
import { doseExportRecords } from "../../tests/fixtures/dose-export-languages.mjs";

test("IT → EN → ES → IT preserves dose, quota, IDs and source data in localized exports", async () => {
  const observations = structuredClone(doseExportRecords) as Observation[];
  const before = JSON.stringify(observations);
  const csvBefore = buildObservationsCsv(observations);
  const previous = getLanguage();
  const expectations = [
    { language: "it", locale: "it-IT", doses: ["0,0", "0,1", "0,006"], header: "Dose N al punto (kg N/ha)", title: "Registro osservazioni NDVI" },
    { language: "en", locale: "en-GB", doses: ["0.0", "0.1", "0.006"], header: "Point N rate (kg N/ha)", title: "NDVI observation log" },
    { language: "es", locale: "es-ES", doses: ["0,0", "0,1", "0,006"], header: "Dosis N en el punto (kg N/ha)", title: "Registro de observaciones NDVI" },
    { language: "it", locale: "it-IT", doses: ["0,0", "0,1", "0,006"], header: "Dose N al punto (kg N/ha)", title: "Registro osservazioni NDVI" },
  ] as const;
  try {
    for (const expected of expectations) {
      setLanguage(expected.language);
      assert.equal(t("Registro osservazioni NDVI"), expected.title);
      const rows = buildObservationPdfRows(observations);
      const pdf = buildObservationPdf(observations, { exportedAt: new Date("2026-11-09T12:00:00Z") }).output();
      observations.forEach((o, index) => {
        assert.equal(rows[index][0], o.id);
        assert.equal(rows[index][14], expected.doses[index % 3]);
        assert.ok(pdf.includes(o.id));
        assert.ok(pdf.includes(expected.doses[index % 3]));
        // Existing on-screen consumers intentionally use non-localized decimal points.
        assert.equal(formatRecordedDose(o.coltura, o.dose), ["0.0", "0.1", "0.006"][index % 3]);
      });
      const csv = buildObservationsCsv(observations);
      assert.equal(csv, csvBefore, "machine CSV must be byte-identical across languages");
      csv.split("\r\n").slice(1).forEach((row, index) => {
        const cells = row.split(",");
        assert.equal(cells[0], observations[index].id);
        assert.equal(cells[1], observations[index].coltura);
        assert.equal(cells[23], ["0.0", "0.1", "0.006"][index % 3]);
        assert.equal(Number(cells[26]), observations[index].quotaAzoto);
      });
      const group = groupObservations(observations)[0];
      const zip = await JSZip.loadAsync(await buildObservationWorkbook(
        group, t, { taurus: new Uint8Array([1]) },
      ));
      const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      const stylesXml = await zip.file("xl/styles.xml")!.async("string");
      const stylesDoc = new DOMParser().parseFromString(stylesXml, "application/xml");
      const cellStyles = stylesDoc.getElementsByTagName("cellXfs")[0].getElementsByTagName("xf");
      const tenthsFormat = cellStyles[3].getAttribute("numFmtId");
      const formats = Array.from(stylesDoc.getElementsByTagName("numFmt"));
      assert.equal(formats.find(f => f.getAttribute("numFmtId") === tenthsFormat)?.getAttribute("formatCode"), "0.0");
      assert.equal(cellStyles[0].getAttribute("numFmtId"), "0", "legacy style is General");
      assert.ok(sheet.includes(expected.header), "Excel headers must follow selected language");
      group.observations.forEach((o, index) => {
        const row = index + 7;
        for (const column of ["N", "Q"]) {
          assert.ok(sheet.includes(`<c r="${column}${row}" s="${o.id.endsWith("LEGACY") ? 0 : 3}"><v>${o.dose}</v></c>`));
        }
        assert.ok(sheet.includes(`>${o.id}</t>`));
        assert.ok(sheet.includes(`>${o.coltura}</t>`));
        assert.ok(sheet.includes(`>${o.varieta}</t>`));
      });
      assert.equal(JSON.stringify(observations), before, "exports and language switches must never mutate observations");
    }
  } finally {
    setLanguage(previous);
  }
});
