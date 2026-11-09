import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { cropCatalogue } from "@workspace/crop-calculations";
import { POMODORO_DB } from "@workspace/tomato-calculations";
import { GRANO_DURO_DB } from "@workspace/grain-calculations";
import type { VarietaDati } from "../calculations";
import { completeCatalogue } from "../catalogue/completeCatalogue";
import { buildCatalogueWorkbook, catalogueExportTables } from "./catalogueExcel";
import { getLocale, setLanguage, t } from "../i18n/runtime";

// Read only the existing literal: never import the running UI or access a database.
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const literal = app.match(/export const VARIETA_DB[^=]*=\s*(\{[\s\S]*?\n\});/)?.[1];
assert.ok(literal);
const tobacco = Object.values(runInNewContext(`(${literal})`)) as VarietaDati[];

test("the displayed catalogue contains every operational variety exactly once and retains all original values", () => {
  const original = JSON.stringify(cropCatalogue);
  const complete = completeCatalogue(cropCatalogue, tobacco);
  assert.equal(complete.rows.length, 1396);
  assert.equal(new Set(complete.rows.map(r => r[0])).size, 18);
  assert.equal(complete.rows.filter(r => r[0] === "Pomodoro").length, Object.keys(POMODORO_DB).length);
  assert.equal(complete.rows.filter(r => r[0] === "Grano duro").length, Object.keys(GRANO_DURO_DB).length);
  assert.equal(complete.rows.filter(r => r[0] === "Tabacco").length, tobacco.length);
  assert.equal(new Set(complete.rows.map(r => `${r[0]}\0${r[1]}`)).size, complete.rows.length);
  assert.ok(complete.rows.every(r => r.length === complete.columns.length));
  cropCatalogue.rows.forEach((r, i) => assert.deepEqual(complete.rows[i].slice(0, r.length), r));
  const grain = complete.rows.find(r => r[1] === "RGT NATUR")!;
  assert.equal(grain[complete.columns.indexOf("Resa media (t/ha)")], "6");
  assert.equal(grain[complete.columns.indexOf("Resa di riferimento (unità originale)")], "60");
  assert.equal(grain[complete.columns.indexOf("Unità resa di riferimento")], "q/ha");
  assert.equal(grain[complete.columns.indexOf("Proteine obiettivo (%)")], "14");
  const tomato = complete.rows.find(r => r[0] === "Pomodoro" && r[1] === Object.values(POMODORO_DB)[0].nome)!;
  const [, min, max] = Object.values(POMODORO_DB)[0].fasi[0];
  assert.equal(Number(tomato[complete.columns.indexOf("NDVI F1")]), (min + max) / 2);
  assert.equal(Number(tomato[complete.columns.indexOf("NDVI F1 min")]), min);
  assert.equal(Number(tomato[complete.columns.indexOf("NDVI F1 max")]), max);
  const tobaccoRow = complete.rows.find(r => r[0] === "Tabacco" && r[1] === tobacco[0].label)!;
  assert.equal(Number(tobaccoRow[complete.columns.indexOf("Seme di riferimento (kg/ha)")]), tobacco[0].kgSemiDefault);
  assert.equal(JSON.stringify(cropCatalogue), original);
});

test("complete Excel workbook is valid OOXML in Italian, English and Spanish, with all 1396 varieties", async () => {
  try {
    for (const language of ["it", "en", "es"] as const) {
      setLanguage(language);
      const tables = catalogueExportTables(cropCatalogue, tobacco, t, getLocale());
      assert.equal(tables.length, 1);
      assert.equal(tables[0].rows.length, 1396);
      const collator = new Intl.Collator(getLocale(), { sensitivity: "base", numeric: true });
      assert.deepEqual(tables[0].rows, [...tables[0].rows].sort((a, b) =>
        collator.compare(String(a[0]), String(b[0])) || collator.compare(String(a[1]), String(b[1]))));
      const bytes = await buildCatalogueWorkbook(cropCatalogue, tobacco, t, getLocale());
      const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
      for (const file of Object.values(zip.files).filter(f => !f.dir)) {
        const content = await file.async("string");
        const parser = new DOMParser({ onError: (level, message) => { throw new Error(`${level}: ${message}`); } });
        const doc = parser.parseFromString(content, "application/xml");
        assert.ok(doc.documentElement);
      }
      const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      assert.equal((sheet.match(/<row /g) ?? []).length, 1398);
      assert.ok(sheet.includes(t("Tutti i diritti Riservati")));
      assert.ok(sheet.includes(t("Tabacco")) && sheet.includes(t("Pomodoro")) && sheet.includes(t("Grano duro")));
      assert.ok(sheet.includes("<v>0.4</v>"));
      assert.ok(!sheet.includes("<f>"));
    }
  } finally {
    setLanguage("it");
  }
});

test("Excel treats formula-like names as literal text and exports the complete catalogue without search filters", async () => {
  const snapshot = { columns: cropCatalogue.columns, rows: [cropCatalogue.rows[0].map((v, i) => i === 1 ? '=HYPERLINK("https://example.invalid")' : v)] };
  const zip = await JSZip.loadAsync(await buildCatalogueWorkbook(snapshot, tobacco, s => s, "it-IT"));
  const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  assert.ok(sheet.includes("=HYPERLINK(&quot;https://example.invalid&quot;)"));
  assert.ok(!sheet.includes("<f>"));
  const ui = readFileSync(new URL("../components/CropCatalogue.tsx", import.meta.url), "utf8");
  assert.ok(ui.includes('account.data?.role === "admin" && account.data.status === "active"'));
  assert.ok(ui.includes("if (!canExport"));
  assert.ok(ui.includes("downloadCatalogueWorkbook(q.data, tobaccoVarieties"));
  assert.ok(!ui.includes("downloadCatalogueWorkbook(filtered"));
});
