import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translateDeck } from "./i18n";
import manifest from "./data/slides-manifest.json";
import uploadedFidelity from "./data/uploaded-deck-fidelity.json";
import { FIGURE_LABELS } from "./data/figure-labels";

test("All 13 imported slides have Italian, English and Spanish text", () => {
  assert.equal(manifest.length, 13);
  for (const slide of manifest) {
    const source = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    const literals = [
      ...source.matchAll(/\bt\(("(?:[^"\\]|\\.)*")\)/g),
      ...source.matchAll(/\bt\.part\(("(?:[^"\\]|\\.)*"), 0,/g),
    ];
    assert.ok(literals.length > 0, `Slide ${slide.position} has no translatable text`);
    for (const [, raw] of literals) {
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
});

const FIGURES: Record<number, [string, number][]> = {
  1: [["image_6", 3]], 5: [["image_6", 3]], 6: [["image_13", 5]], 7: [["image_14", 6]],
  9: [["image_19", 7]], 10: [["image_20", 8]], 11: [["image_21", 9]],
};

test("The authoritative uploaded 13-slide deck is the active deck", () => {
  assert.deepEqual(manifest.map((s) => s.position), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  for (const slide of manifest) {
    const n = slide.position;
    assert.equal(slide.filepath, `src/pages/slides/ImportedSlide${n}.tsx`);
    const active = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    const original = uploadedFidelity.find((entry) => entry.position === n);
    assert.ok(original, `Slide ${n} has a portable original-content fixture`);
    assert.ok(active.includes(`export default ImportedSlide${n};`));
    assert.ok(!active.includes("imported-presentation/"), `Slide ${n} still uses the previous deck assets`);
    assert.ok(!/transform: `scale|slide-inner-|"[\d.]+px"|pptx-font-scale/.test(active), `Slide ${n} not normalised`);
    // every uploaded image is referenced from the copied asset folder
    for (const file of original.images) {
      assert.ok(active.includes(`../../assets/uploaded-presentation/${file}`), `Slide ${n} lost ${file}`);
    }
    // every uploaded text run is preserved (Italian) in the active slide
    const activeStrings = new Set([...active.matchAll(/"(?:[^"\\]|\\.)*"/g)].flatMap(([literal]) => {
      try { return [JSON.parse(literal.replace(/\\x([0-9A-Fa-f]{2})/g, "\\u00$1"))]; }
      catch { return []; }
    }));
    for (const text of original.textRuns) {
      assert.ok(activeStrings.has(text), `Slide ${n} lost run ${text}`);
    }
  }
});

test("Uploaded app screenshots carry EN/ES label layers on the measured figures", () => {
  for (const slide of manifest) {
    const active = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    const expected = FIGURES[slide.position] ?? [];
    const found = [...active.matchAll(/<FigureLabels imageId=\{(\d+)\} \/>/g)].map((m) => Number(m[1]));
    assert.deepEqual(found, expected.map(([, id]) => id), `Slide ${slide.position} figure overlays`);
    for (const [file, id] of expected) {
      assert.ok(active.includes(`uploaded-presentation/${file}.`), `Slide ${slide.position} uses ${file}`);
      const f = FIGURE_LABELS[id];
      for (const r of f.regions) assert.ok(r.en.trim() && r.es.trim() && r.en !== undefined);
    }
  }
});

test("Module navigation names follow the app (Rilievo e dati) in IT/EN/ES", () => {
  assert.equal(translateDeck("Rilievo e dati", "it"), "Rilievo e dati");
  assert.equal(translateDeck("Rilievo e dati", "en"), "Field Survey and Data");
  assert.equal(translateDeck("Rilievo e dati", "es"), "Observaciones y datos");
  assert.equal(translateDeck("Elaborazioni e Mappe", "en"), "Processing and maps");
  assert.equal(translateDeck("Elaborazioni e Mappe", "es"), "Procesamiento y mapas");
  const nav = "Navigazione MENU’: il pulsante NitroCrop NDVI apre a sinistra lʼelenco dei moduli e riporta a Rilievo e dati.";
  assert.match(translateDeck(nav, "en"), /Field Survey and Data/);
  assert.match(translateDeck(nav, "es"), /Observaciones y datos/);
  for (const slide of manifest) {
    const active = readFileSync(new URL(`../${slide.filepath}`, import.meta.url), "utf8");
    assert.ok(!active.includes("Rilievo e Mappe"), `Slide ${slide.position} uses the old module name`);
    assert.ok(!active.includes("Nitro Crop NDVI"));
  }
  assert.equal(translateDeck("NitroCrop NDVI", "es"), "NitroCrop NDVI");
});
