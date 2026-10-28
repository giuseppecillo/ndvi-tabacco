import { useSyncExternalStore } from "react";
import { common } from "./common";
import { agronomy } from "./agronomy";
import { maps } from "./maps";
import { privacy } from "./privacy";

export type Language = "it" | "en" | "es";
export type Translation = readonly [string, string, string];
export const LANGUAGE_KEY = "nitrocrop-language";
export const LOCALES = { it: "it-IT", en: "en-GB", es: "es-ES" } as const;
const entries: readonly Translation[] = [...common, ...agronomy, ...maps, ...privacy];
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const translations = new Map(entries.map(e => [normalize(e[0]), e]));
const patterns = entries.filter(e => /\{\d+\}/.test(e[0])).map(entry => ({
  entry,
  regex: new RegExp("^" + normalize(entry[0]).split(/(\{\d+\})/).map(p =>
    /^\{\d+\}$/.test(p) ? "(.*?)" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("") + "$"),
})).sort((a, b) => b.entry[0].length - a.entry[0].length);

let language: Language = "it";
try {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "it" || saved === "en" || saved === "es") language = saved;
} catch { /* Language switching works even when browser storage is disabled. */ }
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function getLanguage() { return language; }
export function getLocale() { return LOCALES[language]; }
export function setLanguage(next: Language) {
  if (next === language) return;
  language = next;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* optional persistence */ }
  listeners.forEach(listener => listener());
}
export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, () => "it" as const);
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key === LANGUAGE_KEY && ["it", "en", "es"].includes(event.newValue ?? "")) {
      setLanguage(event.newValue as Language);
    }
  });
}

/** Translate display copy only, never persisted values, form values or API keys. */
export function t(source: string): string {
  if (language === "it" || !source.trim()) return source;
  const key = normalize(source);
  const entry = translations.get(key);
  let translated = entry?.[language === "en" ? 1 : 2];
  if (!translated) {
    for (const pattern of patterns) {
      const match = key.match(pattern.regex);
      if (!match) continue;
      const preserveData = ["Durata abbonamento di {0}", 'ID "{0}" già utilizzato.'].includes(pattern.entry[0]);
      translated = pattern.entry[language === "en" ? 1 : 2].replace(/\{(\d+)\}/g, (_m, i) => {
        const captured = match[Number(i) + 1] ?? "";
        return preserveData ? captured : t(captured);
      });
      break;
    }
  }
  if (!translated) {
    // Composite captions combine static labels and numbers with these separators.
    const parts = key.split(/(\s·\s|\s→\s|\s—\s)/);
    if (parts.length > 1) {
      const result = parts.map(part => t(part)).join("");
      if (result !== key) translated = result;
    }
  }
  if (!translated) return source;
  return `${source.match(/^\s*/)?.[0] ?? ""}${translated}${source.match(/\s*$/)?.[0] ?? ""}`;
}

export function translateDisplay<T>(value: T): T {
  if (typeof value === "string") return t(value) as T;
  if (Array.isArray(value)) return value.map(v => translateDisplay(v)) as T;
  return value;
}

/** Used only for label objects such as Recharts axis labels, not business data. */
export function translateLabel<T>(value: T): T {
  if (value && typeof value === "object" && !Array.isArray(value) && !("$$typeof" in value)) {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, translateDisplay(v)])) as T;
  }
  return translateDisplay(value);
}

export function hasTranslation(source: string) { return translations.has(normalize(source)); }
