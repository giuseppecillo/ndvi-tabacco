import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App, { type Observation } from "../src/App";
import { catalogueObservationError, cropCatalogue } from "@workspace/crop-calculations";
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
  throw new Error(`Network disabled in synthetic catalogue harness: ${method} ${url.pathname}`);
};
Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
  getCurrentPosition(success: PositionCallback) {
    success({ coords: { latitude: 45.123456, longitude: 12.345678 } } as GeolocationPosition);
  },
} });
function Harness() {
  useLanguage();
  return <><nav className="flex flex-wrap gap-2 bg-green-100 p-3" aria-label="Synthetic test controls">
    {(["it", "en", "es"] as Language[]).map(l =>
      <button type="button" key={l} data-testid={`test-language-${l}`} onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>)}
    <a href="?module=history">Storico Rilievi</a><a href="?module=home">Rilievo e dati</a>
  </nav><App storageScope="synthetic-catalogue" /></>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}><Harness /></QueryClientProvider>,
);
