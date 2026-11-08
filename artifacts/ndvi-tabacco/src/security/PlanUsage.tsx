import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyAccountQueryKey, getGetMyUsageQueryKey, getListManagedUsageQueryKey, getListManagedUsersQueryKey,
  getListPendingRegistrationsQueryKey, useAssignManagedPlan, useListManagedUsage, useListPendingRegistrations,
  type Account, type PendingRegistration, type PlanAssignmentPlan, type UserUsage,
} from "@workspace/api-client-react";
import { getLocale, t, useLanguage } from "../i18n/runtime";
import { Btn, Card, ErrorNote, OkNote, Skeleton, errStatus } from "./ui";

export const fieldCls = "w-full rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--nc-leaf)]";
const POLL = { refetchInterval: 15000, refetchOnWindowFocus: true } as const;

export function useInvalidatePlans() {
  const qc = useQueryClient();
  return () => {
    for (const queryKey of [getListManagedUsersQueryKey(), getListManagedUsageQueryKey(), getGetMyAccountQueryKey(), getGetMyUsageQueryKey(), getListPendingRegistrationsQueryKey()]) {
      void qc.invalidateQueries({ queryKey });
    }
  };
}

const num = (n: number) => new Intl.NumberFormat(getLocale()).format(n);
export function fmtMb(mb: number) {
  if (mb > 0 && mb < .001) return `<${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 3 }).format(.001)} MB`;
  return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: mb < 1 ? 3 : mb < 10 ? 2 : 1 }).format(mb)} MB`;
}
/** Decimal units: 50 GB = 50,000,000,000 bytes. */
export function fmtGb(bytes: number) {
  return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 0 }).format(bytes / 1e9)} GB`;
}
export function fmtDay(s: string | null | undefined) {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(s);
  return isNaN(d.getTime()) ? s : new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeZone: m ? "UTC" : "Europe/Rome" }).format(d);
}
/** True only when the server confirms the plan metadata store is writable. */
export function planReady(u: UserUsage | undefined | null): boolean {
  return (u as { planManagementReady?: boolean } | null | undefined)?.planManagementReady === true;
}
export function NotReadyNote() {
  useLanguage();
  return <div role="status" data-testid="status-plans-not-ready" className="rounded-xl border border-[#c9a24a]/70 bg-[#fbf3df] px-4 py-3 text-sm font-medium text-[#6b4e0f]">{t("Attivazione piani in attesa dell’aggiornamento autorizzato del database.")} <span className="font-normal">{t("Consumi e storico restano visibili; gli accessi esistenti non cambiano.")}</span></div>;
}
export function daysUntil(s: string | null) {
  if (!s) return null;
  const d = new Date(s).getTime();
  return isNaN(d) ? null : Math.ceil((d - Date.now()) / 86_400_000);
}

const PLAN_LABEL: Record<UserUsage["plan"], string> = { standard: "Standard", pro: "Pro", unassigned: "Non assegnato", admin: "Amministratore" };
const STATE_LABEL: Record<UserUsage["state"], string> = { unassigned: "Non assegnato", scheduled: "Programmato", active: "Attivo", expired: "Scaduto", exempt: "Esente" };
const STATE_TONE: Record<UserUsage["state"], string> = {
  active: "bg-[#e3eedb] text-[var(--nc-leaf)] border-[var(--nc-leaf)]/25",
  scheduled: "bg-[#eef0e2] text-[#55602b] border-[#55602b]/25",
  expired: "bg-[#f7e3dc] text-[var(--nc-danger)] border-[var(--nc-danger)]/30",
  unassigned: "bg-[#f6ecd4] text-[#7a5a14] border-[#c9a24a]/50 border-dashed",
  exempt: "bg-[var(--nc-paper-2)] text-[var(--nc-muted)] border-[var(--nc-line)]",
};

export function PlanBadge({ usage }: { usage: UserUsage }) {
  useLanguage();
  return (
    <span data-testid={`status-plan-${usage.userId}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATE_TONE[usage.state]}`}>
      <span className="nc-mono uppercase tracking-wide">{t(PLAN_LABEL[usage.plan])}</span>
      {usage.plan !== "admin" && usage.plan !== "unassigned" && <span className="opacity-75">· {t(STATE_LABEL[usage.state])}</span>}
    </span>
  );
}

function Meter({ label, used, limit, testId }: { label: string; used: number | null; limit: number | null; testId: string }) {
  const pct = used != null && limit ? Math.min(1, used / limit) : 0;
  const full = used != null && limit != null && used >= limit;
  return (
    <div data-testid={testId} className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs text-[var(--nc-muted)]"><span>{t(label)}</span>
        {limit != null && used != null && <span className={full ? "font-semibold text-[var(--nc-danger)]" : ""}>{full ? t("Limite raggiunto") : t(`${num(Math.max(0, limit - used))} rimanenti`)}</span>}
      </div>
      <p className="nc-mono mt-0.5 text-sm font-semibold">
        {used == null ? "—" : limit != null ? t(`${num(used)} di ${num(limit)}`) : <>{num(used)} <span className="font-normal text-[var(--nc-muted)]">· {t("senza limite numerico")}</span></>}
      </p>
      {limit != null && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--nc-line)]">
        <div className={`h-full origin-left rounded-full ${full ? "bg-[var(--nc-danger)]" : pct > .8 ? "bg-[var(--nc-wheat)]" : "bg-[var(--nc-leaf)]"}`} style={{ transform: `scaleX(${pct})` }} />
      </div>}
    </div>
  );
}

/** Status line for the contract state; used by both admin rows and the user summary. */
export function stateSentence(u: UserUsage) {
  if (u.state === "exempt") return t("Account amministratore: esente da piani e limiti.");
  if (u.state === "unassigned") return t("Nessun piano assegnato: accesso legacy finché l'amministratore non assegna un contratto.");
  if (u.state === "scheduled") return t(`Contratto programmato: inizia il ${fmtDay(u.startsOn)}.`);
  if (u.state === "expired") return t(`Contratto scaduto il ${fmtDay(u.expiresAt)}. I rilievi restano conservati. Contatta l'amministratore per il rinnovo.`);
  return null;
}

export function UsageDetails({ usage: u, showPeriods = true }: { usage: UserUsage; showPeriods?: boolean }) {
  useLanguage();
  const contract = u.state !== "unassigned" && u.state !== "exempt";
  const storagePct = u.storageLimitBytes ? Math.min(1, u.storageBytes / u.storageLimitBytes) : 0;
  return (
    <div className="space-y-3 text-sm">
      {contract && <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <div><dt className="text-xs text-[var(--nc-muted)]">{t("Inizio")}</dt><dd className="nc-mono" data-testid={`text-starts-${u.userId}`}>{fmtDay(u.startsOn)}</dd></div>
        <div><dt className="text-xs text-[var(--nc-muted)]">{t("Scadenza")}</dt><dd className="nc-mono" data-testid={`text-expires-${u.userId}`}>{fmtDay(u.expiresAt)}</dd></div>
      </dl>}
      <div className="grid gap-3 sm:grid-cols-3">
        {contract && <Meter label="Visite nell'anno" used={u.visitsUsed} limit={u.visitsLimit} testId={`meter-visits-${u.userId}`} />}
        {contract && <Meter label="Mappe IDW nell'anno" used={u.mapsUsed} limit={u.mapsLimit} testId={`meter-maps-${u.userId}`} />}
        <div className="min-w-0" data-testid={`meter-storage-${u.userId}`}>
          <div className="text-xs text-[var(--nc-muted)]">{t("Spazio occupato")}</div>
          <p className="nc-mono mt-0.5 text-sm font-semibold">{fmtMb(u.storageMb)}{u.storageLimitBytes != null && <span className="font-normal text-[var(--nc-muted)]"> / {fmtGb(u.storageLimitBytes)}</span>}</p>
          {u.storageLimitBytes != null && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--nc-line)]"><div className="h-full origin-left rounded-full bg-[var(--nc-leaf)]" style={{ transform: `scaleX(${storagePct})` }} /></div>}
        </div>
      </div>
      <div className="rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2">
        <p className="nc-mono text-[10px] uppercase tracking-[0.16em] text-[var(--nc-wheat)]">{t("Storico complessivo")}</p>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span>{t("Visite")}: <strong className="nc-mono">{num(u.visitsTotal)}</strong></span>
          <span>{t("Punti di osservazione")}: <strong className="nc-mono">{num(u.observationsTotal)}</strong></span>
          <span>{u.trackingSince ? <>{t(`Mappe registrate dal ${fmtDay(u.trackingSince)}`)}: <strong className="nc-mono">{num(u.mapsTotal)}</strong></> : t("Conteggio mappe non ancora attivo.")}</span>
        </div>
        <p className="mt-1 text-[11px] text-[var(--nc-muted)]">{t("Le mappe IDW precedenti non sono state conteggiate: il totale storico delle mappe non è noto.")}</p>
      </div>
      {showPeriods && u.periods.length > 0 && <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-[var(--nc-leaf)]">{t("Periodi contrattuali")} ({u.periods.length})</summary>
        <ul className="mt-2 divide-y divide-[var(--nc-line)] rounded-xl border border-[var(--nc-line)]">
          {[...u.periods].sort((a, b) => b.startsOn.localeCompare(a.startsOn)).map(p => (
            <li key={p.periodId} className={`flex flex-wrap justify-between gap-2 px-3 py-1.5 ${p.periodId === u.periodId ? "bg-[#e3eedb]/60" : ""}`}>
              <span className="nc-mono">{fmtDay(p.startsOn)} – {fmtDay(p.expiresAt)} · {t(PLAN_LABEL[p.plan])}</span>
              <span>{t(`${num(p.visitsUsed)} visite · ${num(p.mapsUsed)} mappe`)}</span>
            </li>
          ))}
        </ul>
      </details>}
    </div>
  );
}

function PlanChoice({ value, onChange, name }: { value: PlanAssignmentPlan | ""; onChange: (p: PlanAssignmentPlan) => void; name: string }) {
  useLanguage();
  const opts: [PlanAssignmentPlan, string][] = [["standard", "Standard · 50 visite e 50 mappe IDW per anno contrattuale"], ["pro", "Pro · 50 GB di dati, senza limiti numerici di visite o mappe"]];
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2" data-testid={`radio-plan-${name}`}>
      <legend className="mb-1 text-sm font-medium">{t("Piano")}</legend>
      {opts.map(([p, label]) => (
        <label key={p} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${value === p ? "border-[var(--nc-leaf)] bg-[#e3eedb]/60" : "border-[var(--nc-line)] bg-[var(--nc-paper)] hover:border-[var(--nc-leaf)]/50"}`}>
          <input type="radio" required name={`plan-${name}`} className="mt-1 accent-[var(--nc-leaf)]" checked={value === p} onChange={() => onChange(p)} data-testid={`radio-plan-${p}-${name}`} />
          <span>{t(label)}</span>
        </label>
      ))}
    </fieldset>
  );
}
export { PlanChoice };

/** Plan editor for one user. Draft is initialised once per user and never reset by polling. */
export function PlanForm({ user, usage, onDone }: { user: Account; usage: UserUsage; onDone?: () => void }) {
  useLanguage();
  const invalidate = useInvalidatePlans();
  const assigned = usage.state !== "unassigned";
  const [plan, setPlan] = useState<PlanAssignmentPlan | "">(usage.plan === "standard" || usage.plan === "pro" ? usage.plan : "");
  const [mode, setMode] = useState<"edit" | "renew" | "">(assigned ? "" : "renew");
  const [startsOn, setStartsOn] = useState("");
  // Captured when the draft opens: a newer period appearing via polling must be reviewed, never silently targeted.
  const opened = useRef({ periodId: usage.periodId, startsOn: usage.startsOn });
  const stale = usage.periodId !== opened.current.periodId;
  const writable = planReady(usage);
  const reqId = useRef<string | null>(null);
  const m = useAssignManagedPlan({ mutation: { onSuccess: () => { reqId.current = null; invalidate(); onDone?.(); } } });
  const needsDate = mode === "renew";
  const ready = !!plan && !!mode && (!needsDate || /^\d{4}-\d{2}-\d{2}$/.test(startsOn)) && (mode !== "edit" || !!opened.current.startsOn) && writable && !stale;
  const submit = () => {
    if (!ready || !plan) return;
    // Same requestId for retries of the same draft keeps the call idempotent.
    reqId.current ??= crypto.randomUUID();
    m.mutate({ id: user.id, data: {
      plan, renew: assigned && mode === "renew",
      startsOn: mode === "edit" ? opened.current.startsOn! : startsOn,
      expectedPeriodId: opened.current.periodId ?? null, requestId: reqId.current,
    } });
  };
  useEffect(() => { reqId.current = null; }, [plan, mode, startsOn]);
  return (
    <form className="space-y-3 rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper-2)]/50 p-3" onSubmit={e => { e.preventDefault(); submit(); }} data-testid={`form-plan-${user.id}`}>
      {!writable && <NotReadyNote />}
      {stale && <p role="alert" className="rounded-xl border border-[var(--nc-danger)]/40 bg-[#f7e3dc] px-3 py-2 text-sm text-[var(--nc-danger)]">{t("Il periodo contrattuale è cambiato dopo l’apertura del modulo. Chiudi e riapri per verificarlo prima di salvare.")}</p>}
      <PlanChoice value={plan} onChange={setPlan} name={user.id} />
      {assigned && <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">{t("Tipo di modifica")}</legend>
        {([["edit", "Modifica piano del periodo corrente", "Mantiene inizio, scadenza, periodo e contatori."], ["renew", "Rinnova con un nuovo anno contrattuale", "Apre un nuovo periodo dalla data scelta. Lo storico resta conservato."]] as const).map(([v, label, hint]) => (
          <label key={v} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${mode === v ? (v === "renew" ? "border-[var(--nc-wheat)] bg-[#f6ecd4]" : "border-[var(--nc-leaf)] bg-[#e3eedb]/60") : "border-[var(--nc-line)] bg-[var(--nc-paper)]"}`}>
            <input type="radio" name={`mode-${user.id}`} className="mt-1 accent-[var(--nc-leaf)]" checked={mode === v} onChange={() => setMode(v)} data-testid={`radio-mode-${v}-${user.id}`} />
            <span><span className="font-semibold">{t(label)}</span><span className="block text-xs text-[var(--nc-muted)]">{t(hint)}</span></span>
          </label>
        ))}
        {!mode && <p className="text-xs text-[var(--nc-muted)] sm:col-span-2">{t("Scegli esplicitamente se modificare o rinnovare.")}</p>}
      </fieldset>}
      {needsDate && <label className="block text-sm font-medium">{t("Data di inizio")}
        <input type="date" required className={`${fieldCls} mt-1 max-w-52`} value={startsOn} onChange={e => setStartsOn(e.target.value)} data-testid={`input-starts-${user.id}`} />
        <span className="mt-1 block text-xs font-normal text-[var(--nc-muted)]">{t("Il contratto dura un anno dalla data di inizio. Nessuna firma o fatturazione automatica.")}</span>
      </label>}
      <div className="flex flex-wrap items-center gap-2">
        <Btn type="submit" variant={mode === "renew" && assigned ? "wheat" : "primary"} disabled={!ready || m.isPending}>
          {m.isPending ? t("Salvataggio...") : mode === "renew" && assigned ? t("Conferma rinnovo") : assigned ? t("Salva piano") : t("Assegna piano")}
        </Btn>
        {onDone && <Btn variant="ghost" onClick={onDone}>{t("Chiudi")}</Btn>}
      </div>
      {m.isError && <ErrorNote error={m.error} />}
      {m.isError && errStatus(m.error) === 409 && <p className="text-xs text-[var(--nc-muted)]">{t("I dati sono cambiati nel frattempo: verifica il periodo aggiornato e riprova.")}</p>}
      {m.isSuccess && <OkNote>{t("Piano aggiornato.")}</OkNote>}
    </form>
  );
}

export function useManagedUsage() {
  return useListManagedUsage({ query: { queryKey: getListManagedUsageQueryKey(), ...POLL } });
}

export function UsageOverview({ users }: { users: Account[] | undefined }) {
  useLanguage();
  const q = useManagedUsage();
  const notReady = !!q.data && q.data.some(u => !planReady(u));
  const name = (id: string) => users?.find(u => u.id === id);
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="nc-display text-xl font-semibold">{t("Riepilogo consumi")}</h2>
        <p className="text-xs text-[var(--nc-muted)]">{t("Solo dati aggregati: non vedi osservazioni né coordinate GPS degli altri utenti.")}</p>
      </div>
      {notReady && <div className="mt-3"><NotReadyNote /></div>}
      <div className="mt-4">
        {q.isPending ? <Skeleton rows={2} /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">{t("Nessun dato di consumo.")}</p> : <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="stats-usage">
              {[
                ["Contratti attivi", q.data.filter(u => u.state === "active").length],
                ["Utenti senza piano", q.data.filter(u => u.state === "unassigned").length],
                ["In scadenza entro 30 giorni", q.data.filter(u => { const d = u.state === "active" ? daysUntil(u.expiresAt) : null; return d != null && d <= 30; }).length],
                ["Spazio totale", fmtMb(q.data.reduce((s, u) => s + u.storageMb, 0))],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2">
                  <p className="text-[11px] text-[var(--nc-muted)]">{t(String(l))}</p>
                  <p className="nc-mono text-lg font-semibold">{typeof v === "number" ? num(v) : v}</p>
                </div>
              ))}
            </div>
            <div className="nc-scroll-x mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs" data-testid="table-usage">
                <thead className="text-left text-[var(--nc-muted)]"><tr>
                  <th className="py-2 pr-2">{t("Utente")}</th><th className="pr-2">{t("Piano")}</th><th className="pr-2">{t("Scadenza")}</th>
                  <th className="pr-2 text-right">{t("Visite anno")}</th><th className="pr-2 text-right">{t("Mappe anno")}</th>
                  <th className="pr-2 text-right">{t("Visite totali")}</th><th className="text-right">{t("Spazio occupato")}</th>
                </tr></thead>
                <tbody className="nc-mono">{q.data.map(u => {
                  const acc = name(u.userId);
                  return (
                    <tr key={u.userId} className="border-t border-[var(--nc-line)]" data-testid={`row-usage-${u.userId}`}>
                      <td className="max-w-[12rem] truncate py-2 pr-2 font-sans">{acc?.name ?? u.userId}</td>
                      <td className="pr-2"><PlanBadge usage={u} /></td>
                      <td className="pr-2 whitespace-nowrap">{fmtDay(u.expiresAt)}</td>
                      <td className="pr-2 text-right">{u.visitsUsed == null ? "—" : `${num(u.visitsUsed)}${u.visitsLimit != null ? ` / ${num(u.visitsLimit)}` : ""}`}</td>
                      <td className="pr-2 text-right">{u.mapsUsed == null ? "—" : `${num(u.mapsUsed)}${u.mapsLimit != null ? ` / ${num(u.mapsLimit)}` : ""}`}</td>
                      <td className="pr-2 text-right">{num(u.visitsTotal)}</td>
                      <td className="text-right whitespace-nowrap">{fmtMb(u.storageMb)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[var(--nc-muted)]">{t("Una visita è un cliente in un giorno, non un singolo punto di osservazione.")} {t("Lo spazio misura le righe PostgreSQL di proprietà dell'utente (rilievi, conteggi, account e richieste). Esclude indici condivisi, backup e file scaricati solo sul dispositivo.")} {t("Lo storico non viene mai azzerato né cancellato al rinnovo.")}</p>
          </>}
      </div>
    </Card>
  );
}

export function PendingRegistrationsCard({ onApprove, canApprove }: { onApprove: (r: PendingRegistration) => void; canApprove: boolean }) {
  useLanguage();
  const [offsets, setOffsets] = useState<number[]>([0]);
  const offset = offsets[offsets.length - 1];
  const q = useListPendingRegistrations({ offset }, { query: { queryKey: getListPendingRegistrationsQueryKey({ offset }), ...POLL } });
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">{t("Registrazioni in attesa")}</h2>
      <p className="mt-1 text-sm text-[var(--nc-muted)]">{t("Identità registrate ma non ancora autorizzate. Nessun accesso finché non approvi con un piano.")}</p>
      <div className="mt-3">
        {q.isPending ? <Skeleton rows={2} /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.items.length === 0 && offset === 0 ? <p className="rounded-xl border border-dashed border-[var(--nc-line)] px-4 py-3 text-sm text-[var(--nc-muted)]">{t("Nessuna registrazione in attesa.")}</p> : <>
            <ul className="divide-y divide-[var(--nc-line)]">{q.data.items.map(r => (
              <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid={`row-pending-${r.email}`}>
                <div className="min-w-0"><p className="font-semibold">{r.name || "—"}</p>
                  <p className="nc-mono break-all text-xs text-[var(--nc-muted)]">{r.email} · {t(`Registrato il ${fmtDay(r.registeredAt)}`)}</p></div>
                <Btn variant="ghost" className="!px-4 !py-1.5" disabled={!canApprove} onClick={() => onApprove(r)}><span data-testid={`button-approve-${r.email}`}>{t("Approva")}</span></Btn>
              </li>
            ))}</ul>
            {(offsets.length > 1 || q.data.nextOffset != null) && <div className="mt-2 flex justify-end gap-2">
              <Btn variant="ghost" className="!px-3 !py-1.5" disabled={offsets.length < 2} onClick={() => setOffsets(o => o.slice(0, -1))}>{t("Precedenti")}</Btn>
              <Btn variant="ghost" className="!px-3 !py-1.5" disabled={q.data.nextOffset == null} onClick={() => { const n = q.data.nextOffset; if (n != null) setOffsets(o => [...o, n]); }}>{t("Successivi")}</Btn>
            </div>}
          </>}
      </div>
    </Card>
  );
}
