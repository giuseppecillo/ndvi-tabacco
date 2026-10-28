import { useSyncExternalStore } from "react";
import { deckTranslations } from "./data/deck-translations";

export type DeckLanguage = "it" | "en" | "es";
const valid = (value: string | null): value is DeckLanguage =>
  value === "it" || value === "en" || value === "es";
const requested = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("lang");
let language: DeckLanguage = valid(requested) ? requested : "it";
if (!valid(requested)) {
  try {
    const saved = localStorage.getItem("nitrocrop-language");
    if (valid(saved)) language = saved;
  } catch { /* The explicit URL language also works without local storage. */ }
}
if (typeof document !== "undefined") document.documentElement.lang = language;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
if (typeof window !== "undefined") window.addEventListener("storage", event => {
  if (!valid(requested) && event.key === "nitrocrop-language" && valid(event.newValue)) {
    language = event.newValue;
    document.documentElement.lang = language;
    listeners.forEach(listener => listener());
  }
});
export function useDeckLanguage() {
  return useSyncExternalStore(subscribe, () => language);
}

const normalize = (source: string) => source.replace(/\s+/g, " ").trim();
const translations = new Map(deckTranslations.map(row => [normalize(row[0]), row]));
export function translateDeck(source: string, lang: DeckLanguage): string {
  const normalized = normalize(source);
  if (!normalized || normalized === "5" || normalized === "NDVI" ||
      normalized === "GIS" || normalized === "Taurus Agriculture Solution") return normalized;
  if (normalized === "NitroCrop NDVI") return "Nitro Crop NDVI";
  const page = normalized.match(/^Pagina (\d+)$/);
  if (page) return `${{ it: "Pagina", en: "Page", es: "Página" }[lang]} ${page[1]}`;
  const row = translations.get(normalized);
  if (!row) throw new Error(`Missing deck translation: ${normalized}`);
  if (lang === "it") {
    const corrections: Record<string, string> = {
      "Densità in piante/ha o": "Densità in piante/ha",
      "Esempio operativo:grano duro": "Esempio operativo: grano duro",
      "Export tabellari, PDF e Geotiff e Shapefile": "Export tabellari, PDF, GeoTIFF e Shapefile",
      "strumenti GDAl. Importa la mappa in Farm 2.0 VRT di Taurus Agriculture Solution Srl": "strumenti GDAL. Importa la mappa in Farm 2.0 VRT di Taurus Agriculture Solution Srl",
    };
    return corrections[normalized] ?? row[0];
  }
  return row[{ it: 0, en: 1, es: 2 }[lang]];
}
export function useDeckText() {
  const lang = useDeckLanguage();
  return Object.assign((source: string) => translateDeck(source, lang), {
    font: (size: string, source: string) => {
      const value = size.match(/^([\d.]+)vw$/);
      if (lang === "it" || !value || !source.trim()) return size;
      const translated = translateDeck(source, lang);
      // Allow longer translations to fit the original PowerPoint text boxes.
      const ratio = Math.min(1, Math.max(0.82, source.length / Math.max(1, translated.length)));
      return `${Number(value[1]) * ratio}vw`;
    },
  });
}
