import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLanguage, getLocale, setLanguage, t, translateDisplay } from "./runtime";
import { localizeUi } from "../../localize-ui";
import { privacy } from "./privacy";

afterEach(() => setLanguage("it"));

test("Italian remains the default and unsupported copy remains unchanged", () => {
  assert.equal(getLanguage(), "it");
  assert.equal(t("Tabacco"), "Tabacco");
  setLanguage("en");
  assert.equal(t("Farm Rossi 42"), "Farm Rossi 42");
  assert.equal(t("support@taurusagsolution.com"), "support@taurusagsolution.com");
});

test("English and Spanish cover access, app, map savings and administration", () => {
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const source of [
      "Accedi a NitroCrop NDVI", "Password dimenticata?", "Supporto tecnico:", "Scrivi al supporto tecnico",
      "Tabacco", "Grano duro", "Registro Osservazioni", "Parametri Colturali", "Rilievo e dati", "Istruzioni",
      "Precedente", "Successiva", "Apri la presentazione in una nuova scheda",
      "Risparmio di azoto sull’intero poligono", "Autorizza un nuovo utente",
      "Durata abbonamento (giorni)", "Informativa privacy e cookie",
    ]) assert.notEqual(t(source), source, `${language}: ${source}`);
    assert.equal(getLocale(), language === "en" ? "en-GB" : "es-ES");
  }
});

test("Dynamic subscriptions and guidance preserve their exact numbers", () => {
  setLanguage("en");
  assert.equal(t("12 giorni rimanenti"), "12 days remaining");
  assert.equal(t("1 giorno rimanente"), "1 day remaining");
  assert.equal(t("Range consigliato: 4.2–5.6 t/ha"), "Recommended range: 4.2–5.6 t/ha");
  assert.equal(t("20–29 · Accestimento"), "20–29 · Tillering");
  assert.equal(t('ID "Media" già utilizzato.'), 'ID "Media" is already in use.');
  setLanguage("es");
  assert.equal(t("12 giorni rimanenti"), "12 días restantes");
  assert.equal(t("Abbonamento scaduto · 0 giorni rimanenti"), "Suscripción vencida · 0 días restantes");
  assert.equal(t("Scadenza: 28 oct 2026, 14:00 (ora italiana)."), "Vencimiento: 28 oct 2026, 14:00 (hora italiana).");
  assert.equal(t("Account non disponibile. Accedi nuovamente."), "Cuenta no disponible. Vuelve a acceder.");
  assert.equal(t("Accesso non autorizzato o account sospeso. Contatta l’amministratore."), "Acceso no autorizado o cuenta suspendida. Contacta con el administrador.");
  assert.equal(translateDisplay(125.4), 125.4);
});

test("Owner-confirmed privacy terms are available in English and Spanish", () => {
  const publicPage = readFileSync(new URL("../security/PublicPages.tsx", import.meta.url), "utf8");
  const currentCopy = privacy.filter(([source]) => publicPage.includes(source));
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const text of [
      "Informazioni confermate dal titolare", "Informazioni sul trattamento dei dati", "Viale Giustiniano n. 8, Milano", "5 anni",
      "Dati di account (nome e indirizzo email):",
      "Dati di cliente, azienda, appezzamento e coltura:",
      "Rilievi di campo, coordinate GPS, valori NDVI, date e parametri agronomici:",
      "Log di autenticazione, sessione, sicurezza e azioni amministrative:",
      "Richieste privacy e relative risposte:",
      ...currentCopy.map(([source]) => source).filter((source) => source !== "Privacy"),
    ]) assert.notEqual(t(text), text, `${language}: ${text}`);
    for (const [source] of currentCopy) {
      const translated = t(source);
      if (source.includes("art. 28")) assert.match(translated, /28/);
      if (source.includes("Esri")) assert.match(translated, /Esri/);
    }
  }
});

test("The public privacy version matches the API acknowledgment version", () => {
  const page = readFileSync(new URL("../security/PublicPages.tsx", import.meta.url), "utf8");
  const server = readFileSync(new URL("../../../api-server/src/lib/security-db.ts", import.meta.url), "utf8");
  const version = server.match(/PRIVACY_VERSION = "([^"]+)"/)?.[1];
  assert.ok(version);
  assert.ok(page.includes(`>${version}</span>`));
  assert.ok(!page.includes("Bozza — verifiche da completare"));
  assert.ok(page.includes("Regno Unito"));
  assert.ok(page.includes("entro 24 ore dalla cancellazione"));
  assert.ok(page.includes("Non costituisce una certificazione"));
  assert.ok(page.includes("La presa visione di questa informativa non è un consenso marketing."));
  assert.ok(!page.includes("Il titolare dichiara che i rapporti con i responsabili"));
  assert.ok(!page.includes("non sono previsti trasferimenti"));
});

test("The display compiler does not translate form values, data keys or free text fields", () => {
  const plugin = localizeUi();
  const transform = plugin.transform as (code: string, id: string) => { code: string };
  const result = transform(
    'export function View(){return <><option value="grano duro">Grano duro</option><input name="cliente" value={customer.name} placeholder="Cliente" /><span>{obs.cliente}</span><span>{obs.id}</span><span>{req.message}</span><Chart dataKey="dose" name="Tabacco" label={{value:"Azoto indicato"}} /></>}',
    "/workspace/artifacts/ndvi-tabacco/src/Test.tsx",
  ).code;
  assert.match(result, /value="grano duro"/);
  assert.match(result, /name="cliente"/);
  assert.match(result, /value=\{customer.name\}/);
  assert.match(result, /dataKey="dose"/);
  assert.match(result, /placeholder=\{__ncLabel\("Cliente"\)\}/);
  assert.match(result, /\{obs.cliente\}/);
  assert.match(result, /\{obs.id\}/);
  assert.match(result, /\{req.message\}/);
  assert.match(result, /__ncDisplay\("Grano duro"\)/);
});
