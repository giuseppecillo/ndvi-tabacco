import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translateDeck } from "./i18n";
import manifest from "./data/slides-manifest.json";
import { FIGURE_LABELS } from "./data/figure-labels";

test("All 13 imported slides have Italian, English and Spanish text", () => {
  assert.equal(manifest.length, 13);
  for (const slide of manifest) {
    const source = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    for (const [, raw] of source.matchAll(/\bt\(("(?:[^"\\]|\\.)*")\)/g)) {
      const text = JSON.parse(raw);
      for (const language of ["it", "en", "es"] as const) {
        const translated = translateDeck(text, language);
        assert.equal(typeof translated, "string");
        if (text.trim()) assert.ok(translated.trim(), `${slide.position}/${language}: ${text}`);
      }
    }
    assert.ok(source.includes("w-screen h-screen overflow-hidden relative"));
    assert.ok(!source.includes("layout.s"));
    assert.ok(!source.includes("pt * var("));
  }
});

test("Agronomic meaning, technical identifiers and numbering remain explicit", () => {
  assert.match(translateDeck("Dose nulla quando il NDVI è pari o superiore al riferimento", "en"), /Zero rate/);
  assert.match(translateDeck("Dose nulla quando il NDVI è pari o superiore al riferimento", "es"), /Dosis nula/);
  assert.equal(translateDeck("Pagina 13", "en"), "Page 13");
  assert.equal(translateDeck("Pagina 13", "es"), "Página 13");
  assert.equal(translateDeck("NDVI", "es"), "NDVI");
  assert.equal(translateDeck("Taurus Agriculture Solution", "en"), "Taurus Agriculture Solution");
  assert.throws(() => translateDeck("Untranslated text", "en"), /Missing deck translation/);
});

test("All six original screenshots have bounded English and Spanish label layers", () => {
  assert.deepEqual(Object.keys(FIGURE_LABELS).map(Number), [3, 5, 6, 7, 8, 9]);
  for (const [id, figure] of Object.entries(FIGURE_LABELS)) {
    assert.ok(figure.regions.length >= 8, `Figure ${id}`);
    assert.ok(figure.alt.en && figure.alt.es && figure.alt.it);
    assert.ok(Math.abs(figure.viewW / figure.viewH - figure.native.w / figure.native.h) < 0.002);
    for (const region of figure.regions) {
      assert.ok(region.en.trim() && region.es.trim(), `Figure ${id} has an untranslated region`);
      assert.ok(region.w > 0 && region.h > 0 && region.x >= 0 && region.y >= 0);
      assert.ok(region.x + region.w <= figure.viewW + 1, `Figure ${id}: horizontal mask overflow`);
      assert.ok(region.y + region.h <= figure.viewH + 1, `Figure ${id}: vertical mask overflow`);
    }
  }
  for (const slide of manifest) {
    const source = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    if (/imported-presentation\/image_[356789]\.webp/.test(source)) {
      assert.ok(source.includes("<LocalizedFigure"), `Slide ${slide.position} retains an untranslated screenshot`);
    }
  }
});
