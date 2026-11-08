/**
 * DEV-only synthetic fixture for the real admin plans/usage UI (AdminWorkspace).
 * Every /api request is intercepted in memory: no Clerk, no database, no real auth.
 * scenario=not-ready: planManagementReady=false everywhere, plan writes refused (UI should not send them).
 * Query params: view=admin|self, self=<synthetic user id>, email errore@... forces invite failure,
 * ?scenario=default|empty|error|loading  &lang=it|en|es  &delay=ms
 * Recorded requests: window.__adminRequests (method, path, body) for browser assertions.
 */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Account, UserUsage, PendingRegistration } from "@workspace/api-client-react";
import { AdminWorkspace } from "../src/security/AdminPage";
import { SubscriptionSummary } from "../src/security/SubscriptionSummary";
import { t } from "../src/i18n/runtime";
import { setLanguage, useLanguage, type Language } from "../src/i18n/runtime";
import "../src/index.css";
import "../src/security/security.css";

if (!import.meta.env.DEV) throw new Error("Synthetic admin harness is development-only.");
const params = new URLSearchParams(location.search);
const scenario = params.get("scenario") ?? "default";
const delay = Number(params.get("delay") ?? 150);
const lang = params.get("lang");
if (lang === "it" || lang === "en" || lang === "es") setLanguage(lang);

const acc = (id: string, name: string, email: string, extra: Partial<Account> = {}): Account => ({
  id, name, email, role: "user", status: "active", privacyAcknowledged: true, privacyVersion: "2024-1", activated: true,
  createdAt: "2024-02-11T09:12:00Z", subscriptionExpiresAt: null, subscriptionDurationDays: null, subscriptionDaysRemaining: null,
  subscriptionExpired: false, subscriptionExempt: false, ...extra,
});
const me = acc("u-admin", "Giulia Ferraresi", "g.ferraresi@taurusagsolution.com", { role: "admin", subscriptionExempt: true });
let users: Account[] = [
  me,
  acc("u-std", "Marco Bellandi", "m.bellandi@agrivalle.it"),
  acc("u-pro", "Elena Scarpellini", "elena.scarpellini@consorziobrenta.it"),
  acc("u-legacy", "Paolo Tognazzi", "p.tognazzi@studioagro.it", { activated: false, subscriptionExpiresAt: "2026-01-31T23:00:00Z", subscriptionDurationDays: 365, subscriptionDaysRemaining: 61 }),
  acc("u-exp", "Sara Manfredonia", "sara.m@tabacchibenevento.it", { status: "suspended" }),
];
const base = (userId: string): UserUsage => ({ planManagementReady: scenario !== "not-ready", userId, plan: "unassigned", state: "unassigned", periodId: null, startsOn: null, expiresAt: null,
  visitsUsed: null, mapsUsed: null, visitsTotal: 0, observationsTotal: 0, mapsTotal: 0, storageBytes: 0, storageMb: 0,
  visitsLimit: null, mapsLimit: null, storageLimitBytes: null, trackingSince: "2025-03-04", periods: [] }) as UserUsage;
let usage: UserUsage[] = [
  { ...base("u-admin"), plan: "admin", state: "exempt", visitsTotal: 12, observationsTotal: 61, mapsTotal: 3, storageBytes: 412_300, storageMb: 0.41 },
  { ...base("u-std"), plan: "standard", state: "active", periodId: "p-std-2025", startsOn: "2025-04-01", expiresAt: "2026-04-01T00:00:00+02:00",
    visitsUsed: 43, mapsUsed: 17, visitsTotal: 128, observationsTotal: 702, mapsTotal: 24, storageBytes: 3_870_000, storageMb: 3.87, visitsLimit: 50, mapsLimit: 50,
    periods: [{ periodId: "p-std-2024", plan: "standard", startsOn: "2024-04-01", expiresAt: "2025-04-01T00:00:00+02:00", visitsUsed: 85, mapsUsed: 7 },
      { periodId: "p-std-2025", plan: "standard", startsOn: "2025-04-01", expiresAt: "2026-04-01T00:00:00+02:00", visitsUsed: 43, mapsUsed: 17 }] },
  { ...base("u-pro"), plan: "pro", state: "active", periodId: "p-pro-1", startsOn: "2025-09-15", expiresAt: "2026-09-15T00:00:00+02:00",
    visitsUsed: 214, mapsUsed: 96, visitsTotal: 389, observationsTotal: 2177, mapsTotal: 131, storageBytes: 1_284_600_000, storageMb: 1284.6, storageLimitBytes: 50_000_000_000,
    periods: [{ periodId: "p-pro-1", plan: "pro", startsOn: "2025-09-15", expiresAt: "2026-09-15T00:00:00+02:00", visitsUsed: 214, mapsUsed: 96 }] },
  { ...base("u-legacy"), visitsTotal: 57, observationsTotal: 233, mapsTotal: 0, storageBytes: 912_000, storageMb: 0.91 },
  { ...base("u-exp"), plan: "standard", state: "expired", periodId: "p-exp-1", startsOn: "2024-03-01", expiresAt: "2025-03-01T00:00:00+01:00",
    visitsUsed: 50, mapsUsed: 12, visitsTotal: 50, observationsTotal: 318, mapsTotal: 12, storageBytes: 1_402_000, storageMb: 1.4, visitsLimit: 50, mapsLimit: 50,
    periods: [{ periodId: "p-exp-1", plan: "standard", startsOn: "2024-03-01", expiresAt: "2025-03-01T00:00:00+01:00", visitsUsed: 50, mapsUsed: 12 }] },
];
let pending: PendingRegistration[] = [
  { email: "l.rinaldi@aziendacolle.it", name: "Lorenzo Rinaldi", registeredAt: "2025-11-02T08:40:00Z" },
  { email: "chiara.vitale@agronomiveneti.it", name: "Chiara Vitale", registeredAt: "2025-11-04T16:05:00Z" },
  { email: "f.desantis@tabacchicampani.it", name: "Federico De Santis", registeredAt: "2025-11-05T10:22:00Z" },
];
if (scenario === "not-ready") usage = usage.map(u => u.state === "unassigned" || u.state === "exempt" ? u
  : ({ ...base(u.userId), visitsTotal: u.visitsTotal, observationsTotal: u.observationsTotal, mapsTotal: u.mapsTotal, storageBytes: u.storageBytes, storageMb: u.storageMb, trackingSince: u.trackingSince }));
if (scenario === "empty") { users = [me]; usage = [usage[0]]; pending = []; }

const addYear = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}T00:00:00+01:00`;
const requests: { method: string; path: string; body: unknown }[] = [];
(window as unknown as { __adminRequests: typeof requests }).__adminRequests = requests;
const json = (v: unknown, status = 200) => new Promise<Response>(r => setTimeout(() => r(Response.json(v, { status })), delay));

window.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const p = url.pathname;
  requests.push({ method, path: p + url.search, body });
  if (!p.startsWith("/api/")) throw new Error(`Network disabled in synthetic admin harness: ${method} ${p}`);
  if (scenario === "loading") return new Promise<Response>(() => {});
  if (scenario === "error" && method === "GET") return json({ error: "Servizio temporaneamente non disponibile." }, 503);
  if (p === "/api/auth/me") return json(params.get("view") === "self" ? selfAccount : me);
  if (p === "/api/auth/usage") return json(usage.find(u => u.userId === (params.get("view") === "self" ? selfAccount.id : me.id)));
  if (p === "/api/admin/users" && method === "GET") return json(users);
  if (p === "/api/admin/usage") return json(usage);
  if (p === "/api/admin/registrations") {
    const off = Number(url.searchParams.get("offset") ?? 0);
    return json({ items: pending.slice(off, off + 2), nextOffset: off + 2 < pending.length ? off + 2 : null });
  }
  if (scenario === "not-ready" && (method === "PUT" || (p === "/api/admin/users" && method === "POST"))) return json({ error: "Attivazione piani in attesa dell’aggiornamento autorizzato del database." }, 503);
  if (p === "/api/admin/users" && method === "POST") {
    if (body.email.startsWith("errore@")) return json({ error: "Invio dell’invito non riuscito. Riprova." }, 502);
    if (users.some(u => u.email === body.email)) return json({ error: "Utente già esistente." }, 409);
    const id = `u-${users.length + 1}`;
    const a = acc(id, body.name, body.email, { activated: false });
    users = [...users, a];
    pending = pending.filter(r => r.email !== body.email);
    usage = [...usage, { ...base(id), plan: body.plan, state: body.startsOn > new Date().toISOString().slice(0, 10) ? "scheduled" : "active",
      periodId: `p-${id}`, startsOn: body.startsOn, expiresAt: addYear(body.startsOn), visitsUsed: 0, mapsUsed: 0,
      visitsLimit: body.plan === "standard" ? 50 : null, mapsLimit: body.plan === "standard" ? 50 : null, storageLimitBytes: body.plan === "pro" ? 50_000_000_000 : null,
      periods: [{ periodId: `p-${id}`, plan: body.plan, startsOn: body.startsOn, expiresAt: addYear(body.startsOn), visitsUsed: 0, mapsUsed: 0 }] }];
    return json(a, 201);
  }
  const plan = /^\/api\/admin\/users\/([^/]+)\/plan$/.exec(p);
  if (plan && method === "PUT") {
    const cur = usage.find(u => u.userId === plan[1]);
    if (!cur) return json({ error: "Utente non trovato." }, 404);
    if (cur.periodId !== body.expectedPeriodId) return json({ error: "Il piano è stato aggiornato. Ricarica prima di riprovare." }, 409);
    const limits = { visitsLimit: body.plan === "standard" ? 50 : null, mapsLimit: body.plan === "standard" ? 50 : null, storageLimitBytes: body.plan === "pro" ? 50_000_000_000 : null };
    let next: UserUsage;
    if (cur.periodId && !body.renew && body.startsOn !== cur.startsOn) return json({ error: "Per cambiare la decorrenza seleziona esplicitamente il rinnovo annuale." }, 400);
    if (cur.periodId && !body.renew) {
      next = { ...cur, ...limits, plan: body.plan, periods: cur.periods.map(x => x.periodId === cur.periodId ? { ...x, plan: body.plan } : x) };
    } else {
      const id = `p-${plan[1]}-${body.startsOn}`;
      next = { ...cur, ...limits, plan: body.plan, state: body.startsOn > new Date().toISOString().slice(0, 10) ? "scheduled" : "active", periodId: id,
        startsOn: body.startsOn, expiresAt: addYear(body.startsOn), visitsUsed: 0, mapsUsed: 0,
        periods: [...cur.periods, { periodId: id, plan: body.plan, startsOn: body.startsOn, expiresAt: addYear(body.startsOn), visitsUsed: 0, mapsUsed: 0 }] };
    }
    usage = usage.map(u => u.userId === cur.userId ? next : u);
    return json(next);
  }
  const user = /^\/api\/admin\/users\/([^/]+)$/.exec(p);
  if (user && method === "PATCH") { users = users.map(u => u.id === user[1] ? { ...u, ...body } : u); return json(users.find(u => u.id === user[1])); }
  if (user && method === "DELETE") { users = users.filter(u => u.id !== user[1]); usage = usage.filter(u => u.userId !== user[1]); return json({ message: "Eliminato." }); }
  if (/\/invite$/.test(p) && method === "POST") return json({ message: "Invito reinviato (sintetico)." });
  if (p === "/api/admin/privacy-requests") return json([]);
  if (p === "/api/admin/security-events" || p.startsWith("/api/admin/audit")) return json([{ id: "e1", action: "plan.assign", targetId: "u-std", createdAt: "2025-04-01T07:00:00Z" }]);
  return json({ error: `Synthetic harness: no handler for ${method} ${p}` }, 404);
};

// ?view=self&self=u-std|u-pro|u-legacy|u-exp renders the self subscription summary as that synthetic user.
const selfId = params.get("self") ?? "u-std";
const selfAccount = users.find(u => u.id === selfId) ?? me;
function Harness() {
  useLanguage();
  return <>
    <nav className="flex flex-wrap gap-2 bg-[#f6ecd4] p-3 text-xs" aria-label="Synthetic test controls">
      <strong>SYNTHETIC · {scenario}</strong>
      {(["it", "en", "es"] as Language[]).map(l => <button type="button" key={l} data-testid={`test-language-${l}`} onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>)}
    </nav>
    {params.get("view") === "self" ? <main className="mx-auto max-w-3xl space-y-3 p-4" data-testid="view-self">
      <h1 className="nc-display text-2xl font-semibold">{t("Il mio contratto")}</h1>
      <SubscriptionSummary account={selfAccount} />
    </main> : <AdminWorkspace account={me} />}
  </>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Harness /></QueryClientProvider>,
);
