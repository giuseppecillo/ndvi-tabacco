import { useState } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  getListManagedPrivacyRequestsQueryKey, getListManagedUsersQueryKey, getListSecurityEventsQueryKey,
  useDeleteManagedUser, useInviteManagedUser, useListManagedPrivacyRequests, useListManagedUsers,
  useListSecurityEvents, useResendManagedInvitation, useUpdateManagedPrivacyRequest, useUpdateManagedUser,
  type Account, type PendingRegistration, type PlanAssignmentPlan, type PrivacyRequest, type UserUsage, type UpdateManagedPrivacyRequestBodyStatus,
} from "@workspace/api-client-react";
import { Btn, Card, ErrorNote, Eyebrow, OkNote, Skeleton, TopBar, fmtDate } from "./ui";
import { ModuleHeading } from "./ModuleHeading";
import { REQ_LABEL, STATUS_LABEL } from "./AccountPage";
import { SubscriptionSummary } from "./SubscriptionSummary";
import { NotReadyNote, PendingRegistrationsCard, PlanChoice, planReady, PlanForm, UsageOverview, useInvalidatePlans, useManagedUsage } from "./PlanUsage";
import { t, useLanguage } from "../i18n/runtime";

const input = "w-full rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--nc-leaf)]";

function InviteForm({ prefill, onClearPrefill, writable }: { prefill: PendingRegistration | null; onClearPrefill: () => void; writable: "loading" | "error" | boolean }) {
  useLanguage();
  const invalidate = useInvalidatePlans();
  const [email, setEmail] = useState(prefill?.email ?? ""); const [name, setName] = useState(prefill?.name ?? "");
  const [plan, setPlan] = useState<PlanAssignmentPlan | "">("");
  const [startsOn, setStartsOn] = useState("");
  const m = useInviteManagedUser({ mutation: { onSuccess: () => { setEmail(""); setName(""); setPlan(""); setStartsOn(""); invalidate(); if (prefill) onClearPrefill(); }, onError: () => invalidate() } });
  const ok = writable === true && !!email.trim() && !!name.trim() && !!plan && /^\d{4}-\d{2}-\d{2}$/.test(startsOn);
  return (
    <Card className={prefill ? "ring-2 ring-[var(--nc-wheat)]" : ""}>
      <div id="nc-invite" className="scroll-mt-24" />
      <h2 className="nc-display text-xl font-semibold">{prefill ? t("Approva registrazione") : t("Autorizza un nuovo utente")}</h2>
      <p className="mt-1 text-sm text-[var(--nc-muted)]">{t("L'utente riceve un invito via email. Piano e data di inizio vanno scelti esplicitamente.")} {t("L'invito scade dopo 7 giorni e può essere reinviato al massimo ogni 15 minuti.")}</p>
      {writable === false && <div className="mt-3"><NotReadyNote /></div>}
      {writable === "loading" && <p className="mt-3 text-xs text-[var(--nc-muted)]">{t("Verifica dello stato dei piani in corso...")}</p>}
      {writable === "error" && <p role="alert" className="mt-3 text-sm text-[var(--nc-danger)]">{t("Stato dei piani non verificabile: invito disattivato finché i consumi non si caricano.")}</p>}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="form-invite" onSubmit={e => { e.preventDefault(); if (ok && plan) m.mutate({ data: { email: email.trim(), name: name.trim(), plan, startsOn } }); }}>
        <input className={input} placeholder="Nome e cognome" value={name} maxLength={120} required onChange={e => setName(e.target.value)} data-testid="input-invite-name" />
        <input className={input} type="email" placeholder="email@azienda.it" value={email} maxLength={254} required readOnly={!!prefill} onChange={e => setEmail(e.target.value)} data-testid="input-invite-email" />
        <div className="sm:col-span-2"><PlanChoice value={plan} onChange={setPlan} name="invite" /></div>
        <label className="text-sm font-medium">{t("Data di inizio")}
          <input className={`${input} mt-1`} type="date" value={startsOn} required onChange={e => setStartsOn(e.target.value)} data-testid="input-invite-starts" />
          <span className="mt-1 block text-xs font-normal text-[var(--nc-muted)]">{t("Il contratto dura un anno dalla data di inizio. Nessuna firma o fatturazione automatica.")}</span>
        </label>
        <div className="flex flex-wrap items-start gap-2 sm:justify-end sm:pt-6">
          {prefill && <Btn variant="ghost" onClick={onClearPrefill}>{t("Annulla approvazione")}</Btn>}
          <Btn type="submit" disabled={m.isPending || !ok}>{m.isPending ? "Invio..." : prefill ? t("Approva") : t("Invita con piano")}</Btn>
        </div>
      </form>
      <div className="mt-3">
        {m.isError && <ErrorNote error={m.error} />}
        {m.isSuccess && <OkNote>Invito inviato a {m.data.email}.</OkNote>}
      </div>
    </Card>
  );
}

function DeleteDialog({ user, onClose }: { user: Account; onClose: () => void }) {
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");
  const del = useDeleteManagedUser({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListManagedUsersQueryKey() }); onClose(); } } });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--nc-ink)]/50 p-4" role="dialog" aria-modal="true">
      <div className="nc-rise w-full max-w-md rounded-2xl bg-[#fbf8f1] p-6">
        <h3 className="nc-display text-2xl font-semibold text-[var(--nc-danger)]">Eliminazione definitiva</h3>
        <p className="mt-3 text-sm leading-relaxed">Stai per eliminare <strong>{user.name}</strong> ({user.email}). Verranno cancellati in modo permanente l'account e <strong>tutte le sue osservazioni di campo</strong>, comprese le coordinate GPS, le sue richieste privacy e l'identità di accesso. L'operazione non è reversibile.</p>
        <label className="mt-4 block text-sm">Per confermare digita l'email dell'utente
          <input className={`${input} mt-1`} value={typed} onChange={e => setTyped(e.target.value)} />
        </label>
        {del.isError && <div className="mt-3"><ErrorNote error={del.error} /></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={del.isPending}>Annulla</Btn>
          <Btn variant="danger" disabled={typed.trim() !== user.email || del.isPending} onClick={() => del.mutate({ id: user.id })}>{del.isPending ? "Eliminazione..." : "Elimina definitivamente"}</Btn>
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, me, usage, usageState, onDelete }: { u: Account; me: Account; usage: UserUsage | undefined; usageState: "loading" | "error" | "ok"; onDelete: () => void }) {
  useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const upd = useUpdateManagedUser({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListManagedUsersQueryKey() }) } });
  const resend = useResendManagedInvitation();
  const protectedUser = u.id === me.id || u.role === "admin";
  const badge = u.status === "active" ? "bg-[#e3eedb] text-[var(--nc-leaf)]" : "bg-[#f7e3dc] text-[var(--nc-danger)]";
  const canPlan = !protectedUser && u.status !== "deleting" && !!usage && usage.state !== "exempt";
  return (
    <li className="py-4" data-testid={`row-user-${u.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{u.name} {u.role === "admin" && <span className="nc-mono ml-1 text-xs text-[var(--nc-wheat)]">ADMIN</span>}</p>
          <p className="nc-mono break-all text-xs text-[var(--nc-muted)]">{u.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{u.status === "active" ? "Attivo" : u.status === "suspended" ? "Sospeso" : "In eliminazione"}</span>
          <span className="text-xs text-[var(--nc-muted)]">{u.activated ? "Invito accettato" : "Invito in sospeso"}</span>
          {canPlan && <Btn variant={usage?.state === "unassigned" ? "wheat" : "ghost"} className="!px-3 !py-1.5" onClick={() => setEditing(v => !v)}>
            <span data-testid={`button-plan-${u.id}`}>{editing ? t("Chiudi") : usage?.state === "unassigned" ? t("Assegna piano") : t("Gestisci piano")}</span></Btn>}
          {!u.activated && <Btn variant="ghost" className="!px-3 !py-1.5" disabled={resend.isPending} onClick={() => resend.mutate({ id: u.id })}>{resend.isPending ? "..." : "Reinvia invito"}</Btn>}
          {!protectedUser && u.status !== "deleting" && (
            <Btn variant="ghost" className="!px-3 !py-1.5" disabled={upd.isPending}
              onClick={() => upd.mutate({ id: u.id, data: { status: u.status === "active" ? "suspended" : "active" } })}>
              {upd.isPending ? "..." : u.status === "active" ? "Sospendi" : "Riattiva"}
            </Btn>
          )}
          {!protectedUser && <Btn variant="danger" className="!px-3 !py-1.5" onClick={onDelete}>Elimina</Btn>}
        </div>
      </div>
      <div className="mt-2 space-y-2">
        {usage ? <SubscriptionSummary account={u} usage={usage} compact /> :
          usageState === "loading" ? <div className="nc-skel h-16" aria-busy="true" aria-label={t("Consumi in caricamento")} /> :
          <p className="rounded-xl border border-dashed border-[var(--nc-line)] px-3 py-2 text-xs text-[var(--nc-muted)]">{t("Consumi non disponibili.")}</p>}
        {editing && canPlan && usage && <PlanForm user={u} usage={usage} onDone={() => setEditing(false)} />}
        {upd.isSuccess && <OkNote>Utente aggiornato.</OkNote>}
        {upd.isError && <ErrorNote error={upd.error} />}
        {resend.isError && <ErrorNote error={resend.error} />}
        {resend.isSuccess && <OkNote>{resend.data.message}</OkNote>}
      </div>
    </li>
  );
}

function Users({ me, q }: { me: Account; q: UseQueryResult<Account[], unknown> }) {
  const usage = useManagedUsage();
  const [del, setDel] = useState<Account | null>(null);
  const usageState = usage.isPending ? "loading" : usage.isError ? "error" : "ok";
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">Utenti autorizzati</h2>
      <div className="mt-3">
        {usage.isError && <div className="mb-3"><ErrorNote error={usage.error} onRetry={() => void usage.refetch()} /></div>}
        {q.isPending ? <Skeleton /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">Nessun utente. Usa il modulo qui sopra per invitare il primo.</p> :
            <ul className="divide-y divide-[var(--nc-line)]">{q.data.map(u => <UserRow key={u.id} u={u} me={me} usage={usage.data?.find(x => x.userId === u.id)} usageState={usageState} onDelete={() => setDel(u)} />)}</ul>}
      </div>
      {del && <DeleteDialog user={del} onClose={() => setDel(null)} />}
    </Card>
  );
}

function ReqRow({ r, who }: { r: PrivacyRequest; who: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<UpdateManagedPrivacyRequestBodyStatus>(r.status === "pending" ? "in_progress" : (r.status as UpdateManagedPrivacyRequestBodyStatus));
  const [resp, setResp] = useState(r.response ?? "");
  const m = useUpdateManagedPrivacyRequest({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListManagedPrivacyRequestsQueryKey() }) } });
  return (
    <li className="py-4 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span><strong>{REQ_LABEL[r.type] ?? r.type}</strong> · {who}</span>
        <span className="nc-mono text-xs">{STATUS_LABEL[r.status] ?? r.status} · {fmtDate(r.createdAt)}</span>
      </div>
      <p className="mt-1 text-[var(--nc-muted)]">{r.message}</p>
      {r.type === "erasure" && <p className="mt-2 text-sm font-medium text-[var(--nc-danger)]">Aggiornare lo stato non cancella i dati. Per dare seguito alla cancellazione usa “Elimina” sull’account nell’elenco utenti, dopo la verifica della richiesta.</p>}
      <form className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]" onSubmit={e => { e.preventDefault(); if (resp.trim()) m.mutate({ id: r.id, data: { status, response: resp.trim() } }); }}>
        <select className={input} value={status} onChange={e => setStatus(e.target.value as UpdateManagedPrivacyRequestBodyStatus)}>
          <option value="in_progress">In lavorazione</option><option value="completed">Completata</option><option value="rejected">Respinta</option>
        </select>
        <input className={input} placeholder="Risposta all'interessato" value={resp} required onChange={e => setResp(e.target.value)} />
        <Btn type="submit" disabled={!resp.trim() || m.isPending}>{m.isPending ? "..." : "Aggiorna"}</Btn>
      </form>
      {m.isError && <div className="mt-2"><ErrorNote error={m.error} /></div>}
    </li>
  );
}

function Requests() {
  const q = useListManagedPrivacyRequests();
  const users = useListManagedUsers();
  const name = (id: string) => users.data?.find(u => u.id === id)?.email ?? id;
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">Richieste privacy</h2>
      <div className="mt-3">
        {q.isPending ? <Skeleton rows={2} /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">Nessuna richiesta ricevuta.</p> :
            <ul className="divide-y divide-[var(--nc-line)]">{q.data.map(r => <ReqRow key={r.id} r={r} who={name(r.userId)} />)}</ul>}
      </div>
    </Card>
  );
}

function Audit() {
  const q = useListSecurityEvents({ query: { queryKey: getListSecurityEventsQueryKey(), refetchInterval: 30000 } });
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">Registro di sicurezza</h2>
      <div className="nc-scroll-x mt-3 max-h-[28rem] overflow-auto">
        {q.isPending ? <Skeleton /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">Nessun evento registrato.</p> :
            <table className="nc-mono w-full min-w-[480px] text-xs">
              <thead className="text-left text-[var(--nc-muted)]"><tr><th className="py-2">Data</th><th>Azione</th><th>Oggetto</th></tr></thead>
              <tbody>{q.data.map(ev => (
                <tr key={ev.id} className="border-t border-[var(--nc-line)]"><td className="py-2 pr-3 whitespace-nowrap">{fmtDate(ev.createdAt)}</td><td className="pr-3">{ev.action}</td><td className="break-all text-[var(--nc-muted)]">{ev.targetId ?? "-"}</td></tr>
              ))}</tbody>
            </table>}
      </div>
    </Card>
  );
}

/** Admin content without the Clerk-bound TopBar; also mounted by the synthetic DEV fixture. */
export function AdminWorkspace({ account }: { account: Account }) {
  useLanguage();
  const users = useListManagedUsers({ query: { queryKey: getListManagedUsersQueryKey(), refetchInterval: 15000, refetchOnWindowFocus: true } });
  const usageQ = useManagedUsage();
  // Global readiness from loaded admin usage; never assumed before it loads.
  const writable: "loading" | "error" | boolean = usageQ.isPending ? "loading" : usageQ.isError ? "error" : usageQ.data.length > 0 && usageQ.data.every(planReady);
  const [prefill, setPrefill] = useState<PendingRegistration | null>(null);
  const approve = (r: PendingRegistration) => {
    setPrefill(r);
    requestAnimationFrame(() => document.getElementById("nc-invite")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="nc-rise">
        <ModuleHeading title="Amministrazione"><Eyebrow>Chi può vedere i campi</Eyebrow></ModuleHeading>
        <p className="mt-2 max-w-2xl text-[var(--nc-muted)]">Gestisci gli accessi. Come amministratore vedi nello strumento solo i tuoi rilievi, non quelli degli altri utenti.</p>
      </div>
      <InviteForm key={prefill?.email ?? "new"} prefill={prefill} writable={writable} onClearPrefill={() => setPrefill(null)} />
      <PendingRegistrationsCard onApprove={approve} canApprove={writable === true} />
      <UsageOverview users={users.data} />
      <Users me={account} q={users} />
      <Requests />
      <Audit />
    </main>
  );
}

export function AdminPage({ account }: { account: Account }) {
  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <AdminWorkspace account={account} />
    </div>
  );
}
