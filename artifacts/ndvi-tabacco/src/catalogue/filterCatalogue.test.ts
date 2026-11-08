import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogueCrops, filterCatalogue } from "./filterCatalogue";
import { readFileSync } from "node:fs";
import { hasTranslation, setLanguage, t } from "../i18n/runtime";

const rows = [["Kiwi", "Hayward", "31,3"], ["Mele", "Gala", "45,0"], ["Kiwi", "Soreli", "28,1"]];

test("filters by crop and accent-insensitive terms, keeps values intact", () => {
  assert.deepEqual(catalogueCrops(rows), ["Kiwi", "Mele"]);
  assert.equal(filterCatalogue(rows, { query: "", crop: "Kiwi" }).length, 2);
  assert.deepEqual(filterCatalogue(rows, { query: "kiwi sorelì", crop: "" }), [rows[2]]);
  assert.deepEqual(filterCatalogue(rows, { query: "31,3", crop: "" })[0], ["Kiwi", "Hayward", "31,3"]);
  assert.equal(filterCatalogue(rows, { query: "apples", crop: "" }, s => (s === "Mele" ? "Apples" : s)).length, 1);
});

test("the actual catalogue is searchable in all languages without changing its identities or numeric values", () => {
  const catalogue = JSON.parse(readFileSync(new URL("../../../../lib/crop-calculations/src/catalogue.json", import.meta.url), "utf8")) as { columns: string[]; rows: string[][] };
  const before = JSON.stringify(catalogue);
  const displayIndexes = [0, 2, 3, 4, ...catalogue.columns.flatMap((c, i) => c.startsWith("Fase ") ? [i] : [])];
  for (const column of catalogue.columns) assert.ok(hasTranslation(column), column);
  for (const row of catalogue.rows) {
    for (const i of displayIndexes) assert.ok(hasTranslation(row[i]), row[i]);
  }
  for (const [language, query] of [["it", "Mele"], ["en", "Apples"], ["es", "Manzanas"]] as const) {
    setLanguage(language);
    const found = filterCatalogue(catalogue.rows, { query, crop: "" }, t);
    assert.equal(found.length, 55);
    assert.ok(found.every(row => row[0] === "Mele"));
    assert.equal(filterCatalogue(catalogue.rows, { query: "hayward 31,3", crop: "Kiwi" }, t).length, 1);
  }
  setLanguage("it");
  assert.equal(JSON.stringify(catalogue), before);
});
