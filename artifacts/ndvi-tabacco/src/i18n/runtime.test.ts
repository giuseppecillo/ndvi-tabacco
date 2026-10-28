import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLanguage, getLocale, setLanguage, t, translateDisplay } from "./runtime";
import { localizeUi } from "../../localize-ui";
import { privacy } from "./privacy";

afterEach(() => setLanguage("it"));

test("Spatialization, dose inspection and observation history are translated without changing stored data", () => {
  const copy = [
    ["Spazializza i tuoi dati", "Spatialize your data", "Espacializa tus datos"],
    ["Osservazioni salvate", "Saved observations", "Observaciones guardadas"],
    ["Salvata il", "Saved on", "Guardada el"],
    ["Ora di salvataggio non disponibile", "Save time not available", "Hora de guardado no disponible"],
    ["Cella della griglia interpolata", "Interpolated grid cell", "Celda de la malla interpolada"],
    ["Nessun valore interpolato: il punto è fuori dal poligono.", "No interpolated value: the point is outside the polygon.", "Sin valor interpolado: el punto está fuera del polígono."],
  ];
  for (const [language, index] of [["en", 1], ["es", 2]] as const) {
    setLanguage(language);
    for (const row of copy) assert.equal(t(row[0]), row[index]);
    assert.equal(t("Azienda Rossi - Campo 42"), "Azienda Rossi - Campo 42");
  }
});

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

test("Instructions controls follow English and Spanish, including identical translated words", () => {
  const reader = readFileSync(new URL("../security/InstructionsPage.tsx", import.meta.url), "utf8");
  const controls = [
    ["Istruzioni", "Instructions", "Instrucciones"],
    ["Precedente", "Previous", "Anterior"],
    ["Successiva", "Next", "Siguiente"],
    ["Diapositiva", "Slide", "Diapositiva"],
    ["Schermo intero", "Full screen", "Pantalla completa"],
    ["Esci da schermo intero", "Exit full screen", "Salir de pantalla completa"],
    ["Apri la presentazione in una nuova scheda", "Open the presentation in a new tab", "Abre la presentación en una pestaña nueva"],
    ["Impossibile caricare la presentazione.", "Unable to load the presentation.", "No se pudo cargar la presentación."],
    ["Ruota il dispositivo in orizzontale per leggere meglio le diapositive.", "Rotate your device to landscape to read the slides more easily.", "Gira el dispositivo en horizontal para leer mejor las diapositivas."],
  ] as const;
  for (const [source] of controls) assert.ok(reader.includes(source), source);
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const [source, en, es] of controls) assert.equal(t(source), language === "en" ? en : es, `${language}: ${source}`);
  }
  assert.ok(reader.includes("&lang=${language}"), "The embedded deck follows the app language");
});

test("Map and nitrogen savings widget labels are localized without changing units", () => {
  const labels = [
    ["Risparmio di azoto sull’intero poligono", "Nitrogen savings across the entire polygon", "Ahorro de nitrógeno en todo el polígono"],
    ["Risparmio stimato", "Estimated savings", "Ahorro estimado"],
    ["Risparmio %", "Savings %", "Ahorro %"],
    ["Azoto previsto dal piano", "Planned nitrogen", "Nitrógeno previsto en el plan"],
    ["Azoto distribuito + indicato dalla IDW", "Nitrogen applied + recommended by IDW", "Nitrógeno aplicado + recomendado por IDW"],
    ["kg N sul poligono", "kg N across the polygon", "kg N en el polígono"],
    ["Scenario", "Scenario", "Escenario"],
    ["Dose min", "Min. rate", "Dosis mín."],
    ["Dose media", "Mean rate", "Dosis media"],
    ["Dose max", "Max. rate", "Dosis máx."],
    ["Punti griglia", "Grid points", "Puntos de la malla"],
  ] as const;
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const [source, en, es] of labels) assert.equal(t(source), language === "en" ? en : es, `${language}: ${source}`);
    assert.equal(t("kg N/ha"), "kg N/ha");
    assert.equal(translateDisplay(125.4), 125.4);
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
  assert.ok(!page.includes('title="Servizi esterni"'));
  assert.ok(!page.includes("gestione del servizio, accordi privacy con i fornitori"));
  assert.ok(page.includes("Questa informativa riporta le informazioni confermate da Taurus Agriculture Solution SRL."));
  assert.ok(page.includes("entro 24 ore dalla cancellazione"));
  assert.ok(!page.includes("Non costituisce una certificazione di conformità né una verifica tecnica indipendente dei servizi."));
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
