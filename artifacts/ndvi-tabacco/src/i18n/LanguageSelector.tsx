import { setLanguage, t, useLanguage, type Language } from "./runtime";

export function LanguageSelector() {
  const language = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--nc-leaf)]">
      <span>{t("Lingua")}</span>
      <select aria-label={t("Lingua")} value={language}
        onChange={event => setLanguage(event.target.value as Language)}
        className="rounded-full border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2">
        <option value="it" lang="it">Italiano</option>
        <option value="en" lang="en">English</option>
        <option value="es" lang="es">Español</option>
      </select>
    </label>
  );
}
