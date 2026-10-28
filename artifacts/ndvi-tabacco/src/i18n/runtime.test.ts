import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLanguage, getLocale, setLanguage, t, translateDisplay } from "./runtime";
import { localizeUi } from "../../localize-ui";

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
      "Accedi a NitroCrop NDVI", "Password dimenticata?", "Supporto tecnico:",
      "Tabacco", "Grano duro", "Registro Osservazioni", "Parametri Colturali",
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

test("Updated privacy terms are available in English and Spanish", () => {
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const text of [
      "Informativa aggiornata", "Informazioni sul trattamento dei dati", "Milano", "5 anni",
      "Dati di account (nome e indirizzo email):",
      "Dati di cliente, azienda, appezzamento e coltura:",
      "Rilievi di campo, coordinate GPS, valori NDVI, date e parametri agronomici:",
      "Log di autenticazione, sessione, sicurezza e azioni amministrative:",
      "Richieste privacy e relative risposte:",
      "Il titolare dichiara che i rapporti con i responsabili del trattamento sono regolati da accordi ai sensi dell’art. 28 GDPR.",
      "Localizzazione prevista e trasferimenti extra UE",
      "La sede prevista dal titolare per il server dell’applicazione è il Regno Unito. Si tratta di una configurazione futura: questa indicazione non attesta che tutti i servizi attualmente utilizzati siano già configurati in tale Paese né che tutti i trattamenti avvengano lì. La sede legale del titolare resta a Milano, Italia.",
      "Il Regno Unito è un Paese esterno all’Unione europea. I trasferimenti verso tale Paese possono basarsi sulla decisione di adeguatezza della Commissione europea ai sensi dell’art. 45 GDPR, nei limiti del suo ambito di applicazione e finché rimane in vigore.",
      "La scelta di server nel Regno Unito non esclude ulteriori trattamenti in altri Paesi da parte dei fornitori o dei loro subfornitori. Prima della migrazione o dell’attivazione di nuovi servizi, il titolare verifica e documenta localizzazione effettiva, accessi di assistenza, backup e garanzie per ciascun servizio. Per eventuali trasferimenti non coperti da una decisione di adeguatezza devono essere individuate le garanzie applicabili previste dal Capo V GDPR, incluse, ove appropriate, le clausole contrattuali standard.",
      "Decisioni di adeguatezza della Commissione europea",
    ]) assert.notEqual(t(text), text, `${language}: ${text}`);
    assert.match(t("Il titolare dichiara che i rapporti con i responsabili del trattamento sono regolati da accordi ai sensi dell’art. 28 GDPR."), /28/);
  }
});

test("Privacy distinguishes planned UK processing from the Milan office and retains five years", () => {
  const page = readFileSync(new URL("../security/PublicPages.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /non sono previsti trasferimenti/);
  assert.match(page, /configurazione futura/);
  assert.match(page, /server dell’applicazione è il Regno Unito/);
  assert.match(page, /né che tutti i trattamenti avvengano lì/);
  assert.match(page, /sede legale del titolare resta a Milano, Italia/);
  assert.match(page, /art\. 45 GDPR/);
  assert.equal(page.match(/<strong>5 anni<\/strong>/g)?.length, 5);
  assert.doesNotMatch(page, /Supabase|Netlify/);
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
