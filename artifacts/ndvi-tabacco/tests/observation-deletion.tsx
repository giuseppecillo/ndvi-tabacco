import { createRoot } from "react-dom/client";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import { Link } from "wouter";
import { LanguageSelector } from "../src/i18n/LanguageSelector";
import { observations } from "./fixtures/idw";
import "../src/index.css";
import "../src/security/security.css";

if (!import.meta.env.DEV) throw new Error("Development-only synthetic deletion harness.");
// Optional browser-runner binding: both isolated contexts share invented state
// in the runner, never via an API, account, localStorage or database.
declare global {
  interface Window {
    qaObservationTransport?: (request: {
      method: string; pathname: string; seed: typeof records;
    }) => Promise<{ status: number; body?: unknown; rawBody?: string }>;
  }
}
const now = Date.now();
let records = [
  { ...observations[0], id: "QA-recent", createdAt: new Date(now - 3600000).toISOString() },
  { ...observations[0], id: "QA-recent-bulk", createdAt: new Date(now - 7200000).toISOString() },
  { ...observations[0], id: "QA-expired", createdAt: new Date(now - 90000000).toISOString() },
  { ...observations[0], id: "QA-legacy", createdAt: null },
  { ...observations[0], id: "QA-denied", createdAt: new Date(now - 1000).toISOString() },
].map(o => ({ ...o, cliente: "QA deletion", appezzamento: "QA synthetic" }));
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if(method==="GET"&&["/api/variety-proposals","/api/variety-templates"].includes(url.pathname))return Response.json([]);
  if (url.origin !== location.origin) throw new Error("External requests disabled.");
  if (window.qaObservationTransport && /^\/api\/osservazioni(?:\/|$)/.test(url.pathname)) {
    const result = await window.qaObservationTransport({ method, pathname: url.pathname, seed: records });
    // Deliberately do not honor AbortSignal here: a delayed stale response must
    // still be rejected by the real registry hook after a deletion.
    return result.rawBody !== undefined
      ? new Response(result.rawBody, { status: result.status, headers: { "Content-Type": "text/html" } })
      : Response.json(result.body, { status: result.status });
  }
  if (url.pathname === "/api/osservazioni" && method === "GET") return Response.json(records);
  if (url.pathname.startsWith("/api/osservazioni") && method === "DELETE") {
    const id = url.pathname === "/api/osservazioni" ? null : decodeURIComponent(url.pathname.split("/").pop()!);
    if (id === "QA-denied") return Response.json({ code: "DELETION_WINDOW_CLOSED" }, { status: 403 });
    const selected = records.filter(o => (!id || o.id === id) && o.createdAt
      && Date.now() - Date.parse(o.createdAt) <= 86400000);
    records = records.filter(o => !selected.includes(o));
    return Response.json({ ok: true, deletedIds: selected.map(o => o.id) });
  }
  throw new Error(`Network disabled in deletion harness: ${method} ${url.pathname}`);
};
const { default: App } = await import("../src/App");
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
  <header className="flex flex-wrap gap-4 bg-amber-100 p-4">
    <strong>QA — synthetic deletion only</strong><LanguageSelector />
    <Link href="?module=history">Storico Rilievi</Link><Link href="?module=survey">Rilievo e dati</Link>
  </header>
  <App storageScope="qa-deletion-synthetic-only" />
</QueryClientProvider>);
