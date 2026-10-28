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

test("Requested figures use the current-app illustrative chrome in every language", async () => {
  const { CHROME_FIGURES, chromeGeometry } = await import("./data/figure-chrome");
  const comp = readFileSync(new URL("./components/LocalizedFigure.tsx", import.meta.url), "utf8");
  for (const label of ["Schema dell\\u2019interfaccia", "Interface illustration", "Esquema de la interfaz",
    "Rilievo e dati", "Elaborazioni e Mappe", "Field Survey and Data", "Processing and maps",
    "Observaciones y datos", "Procesamiento y mapas", "NitroCrop NDVI", "#F6B42C", "#F09A1F", "#1F3D2B"]) {
    assert.ok(comp.includes(label), `chrome missing ${label}`);
  }
  assert.ok(!comp.includes("Nitro Crop NDVI"));
  assert.deepEqual(Object.keys(CHROME_FIGURES).map(Number), [3, 5, 6, 7, 8, 9]);
  const expected: Record<number, [number, string][]> = {
    1: [[3, "survey"]], 5: [[3, "survey"]], 6: [[5, "maps"]], 7: [[6, "survey"]],
    9: [[7, "survey"]], 10: [[8, "maps"]], 11: [[9, "maps"]],
  };
  for (const slide of manifest) {
    const source = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    assert.ok(!/chrome=\{false\}/.test(source), `Slide ${slide.position} opts out of chrome`);
    assert.ok(!/top: "-\d/.test(source.slice(source.indexOf("<LocalizedFigure"))), `Slide ${slide.position} negative crop`);
    for (const [id, mod] of expected[slide.position] ?? []) {
      assert.ok(source.includes(`imageId={${id}} module="${mod}"`), `Slide ${slide.position} figure ${id} ${mod}`);
    }
  }
  for (const [id, cfg] of Object.entries(CHROME_FIGURES)) {
    const f = FIGURE_LABELS[Number(id)];
    const g = chromeGeometry(f.viewW, f.viewH, cfg.cropTop, cfg.rail);
    assert.ok(g.k > 0 && g.k <= 1 && g.bodyX + g.bodyW <= f.viewW + 0.01, `Figure ${id} body fits`);
    if (cfg.rail) assert.ok(g.H >= g.bar + 330 * g.s, `Figure ${id} rail fits`);
    for (const lang of ["it", "en", "es"] as const) assert.ok(f.alt[lang]);
  }
  assert.equal(translateDeck("NitroCrop NDVI", "en"), "NitroCrop NDVI");
  assert.equal(translateDeck("NitroCrop NDVI", "es"), "NitroCrop NDVI");
});
