import { createRoot } from "react-dom/client";
import { Link } from "wouter";
import { LanguageSelector } from "../src/i18n/LanguageSelector";
import { observations } from "./fixtures/idw";
import "../src/index.css";
import "../src/security/security.css";

if (!import.meta.env.DEV) throw new Error("Development-only synthetic deletion harness.");
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
  if (url.origin !== location.origin) throw new Error("External requests disabled.");
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
createRoot(document.getElementById("root")!).render(<>
  <header className="flex flex-wrap gap-4 bg-amber-100 p-4">
    <strong>QA — synthetic deletion only</strong><LanguageSelector />
    <Link href="?module=history">Storico Rilievi</Link><Link href="?module=survey">Rilievo e dati</Link>
  </header>
  <App storageScope="qa-deletion-synthetic-only" />
</>);
