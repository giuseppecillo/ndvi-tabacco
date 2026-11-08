import { createRoot } from "react-dom/client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App, { type Observation } from "../src/App";
import { catalogueObservationError, cropCatalogue, CROP_PROFILES, isCatalogueCrop, calculateCrop } from "@workspace/crop-calculations";
import { CatalogueCropParameters } from "../src/components/CatalogueCropParameters";
import { setLanguage, useLanguage, type Language } from "../src/i18n/runtime";
import "../src/index.css";
import "../src/security/security.css";

if (!import.meta.env.DEV) throw new Error("Synthetic catalogue harness is development-only.");
const storage = "nitrocrop-catalogue-synthetic-only";
const records = (): Observation[] => JSON.parse(localStorage.getItem(storage) ?? "[]");
// No request from this harness can reach a real API or a customer database.
window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  const method = init?.method ?? "GET";
  if (url.pathname === "/api/osservazioni" && method === "GET") return Response.json(records());
  if (url.pathname === "/api/osservazioni" && method === "POST") {
    const observation = JSON.parse(String(init?.body));
    const error = catalogueObservationError(observation);
    if (error) return Response.json({ error }, { status: 400 });
    const createdAt = new Date().toISOString();
    localStorage.setItem(storage, JSON.stringify([{ ...observation, createdAt }, ...records().filter(r => r.id !== observation.id)]));
    return Response.json({ ok: true, createdAt }, { status: 201 });
  }
  if (url.pathname.startsWith("/api/osservazioni/") && method === "DELETE") {
    const id = decodeURIComponent(url.pathname.slice("/api/osservazioni/".length));
    localStorage.setItem(storage, JSON.stringify(records().filter(r => r.id !== id)));
    return Response.json({ ok: true });
  }
  if (url.pathname === "/api/catalogo-colture" && method === "GET") return Response.json(cropCatalogue);
  if ((url.pathname === "/api/auth/usage" && method === "GET") || (url.pathname === "/api/usage/maps" && method === "POST")) {
    // Legacy unassigned test account: keep this fixture network-isolated even
    // after the real map component starts consulting the metering endpoints.
    return Response.json({ userId:"synthetic",planManagementReady:false,plan:"unassigned",state:"unassigned",
      periodId:null,startsOn:null,expiresAt:null,visitsUsed:null,mapsUsed:null,
      visitsTotal:0,observationsTotal:records().length,mapsTotal:0,storageBytes:0,storageMb:0,
      visitsLimit:null,mapsLimit:null,storageLimitBytes:null,trackingSince:null,periods:[] });
  }
  throw new Error(`Network disabled in synthetic catalogue harness: ${method} ${url.pathname}`);
};
Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
  getCurrentPosition(success: PositionCallback) {
    success({ coords: { latitude: 45.123456, longitude: 12.345678 } } as GeolocationPosition);
  },
} });
/** Direct component view for cheap visual checks, without login or real data. */
function DetailsPreview() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("crop");
  const crop = isCatalogueCrop(requested) ? requested : "Kiwi";
  const first = CROP_PROFILES.find(p => p.crop === crop)!;
  const [varieta, setVarieta] = useState(first.name);
  const [resa, setResa] = useState(first.yield);
  const [densita, setDensita] = useState(first.plants);
  const [fase, setFase] = useState("F1");
  const [confermata, setConfermata] = useState(true);
  const [distribuito, setDistribuito] = useState(0);
  const piano = calculateCrop({ crop, variety: varieta, phase: fase, confirmed: confermata,
    yield: resa, applied: distribuito, readings: [.42, .38, .41, .39, .4] });
  return <main className="mx-auto max-w-3xl p-4 sm:p-6">
    <div className="grid min-w-0 grid-cols-2 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
      <CatalogueCropParameters crop={crop} varieta={varieta} onVarieta={name => {
        setVarieta(name);
        const profile = CROP_PROFILES.find(p => p.crop === crop && p.name === name)!;
        setResa(profile.yield); setDensita(profile.plants); setFase("");
      }} resa={resa} onResa={setResa} densita={densita} onDensita={setDensita}
        fase={fase} onFase={setFase} confermata={confermata} onConferma={setConfermata}
        distribuito={distribuito} onDistribuito={setDistribuito} piano={piano} />
    </div>
  </main>;
}
function Harness() {
  useLanguage();
  return <><nav className="flex flex-wrap gap-2 bg-green-100 p-3" aria-label="Synthetic test controls">
    {(["it", "en", "es"] as Language[]).map(l =>
      <button type="button" key={l} data-testid={`test-language-${l}`} onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>)}
    <a href="?module=history">Storico Rilievi</a><a href="?module=home">Rilievo e dati</a>
  </nav><App storageScope="synthetic-catalogue" /></>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    {new URLSearchParams(location.search).get("preview") === "details" ? <DetailsPreview /> : <Harness />}
  </QueryClientProvider>,
);
