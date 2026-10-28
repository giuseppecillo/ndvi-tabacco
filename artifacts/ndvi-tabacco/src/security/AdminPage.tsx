import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListManagedPrivacyRequestsQueryKey, getListManagedUsersQueryKey, getListSecurityEventsQueryKey,
  useDeleteManagedUser, useInviteManagedUser, useListManagedPrivacyRequests, useListManagedUsers,
  useListSecurityEvents, useResendManagedInvitation, useUpdateManagedPrivacyRequest, useUpdateManagedUser,
  type Account, type PrivacyRequest, type UpdateManagedPrivacyRequestBodyStatus,
} from "@workspace/api-client-react";
import { Btn, Card, ErrorNote, Eyebrow, OkNote, Skeleton, TopBar, fmtDate } from "./ui";
import { REQ_LABEL, STATUS_LABEL } from "./AccountPage";
import { SubscriptionSummary } from "./SubscriptionSummary";

const input = "w-full rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--nc-leaf)]";

function InviteForm() {
  const qc = useQueryClient();
  const [email, setEmail] = useState(""); const [name, setName] = useState("");
  const [days, setDays] = useState("30");
  const m = useInviteManagedUser({ mutation: { onSuccess: () => { setEmail(""); setName(""); qc.invalidateQueries({ queryKey: getListManagedUsersQueryKey() }); } } });
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">Autorizza un nuovo utente</h2>
      <p className="mt-1 text-sm text-[var(--nc-muted)]">L'utente riceve un invito via email e sceglie da solo la propria password. L'invito scade dopo 7 giorni e può essere reinviato al massimo ogni 15 minuti.</p>
      <p className="mt-2 text-sm text-[var(--nc-muted)]">L’abbonamento decorre dalla creazione dell’utente, anche se l’invito non è ancora stato accettato.</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); m.mutate({ data: { email: email.trim(), name: name.trim(), subscriptionDays: Number(days) } }); }}>
        <input className={input} placeholder="Nome e cognome" value={name} maxLength={120} required onChange={e => setName(e.target.value)} />
        <input className={input} type="email" placeholder="email@azienda.it" value={email} maxLength={254} required onChange={e => setEmail(e.target.value)} />
        <label className="text-sm font-medium">Durata abbonamento (giorni)
          <input className={`${input} mt-1`} type="number" min={1} max={3650} step={1} value={days} required onChange={e => setDays(e.target.value)} />
        </label>
        <Btn type="submit" disabled={m.isPending || !email.trim() || !name.trim()}>{m.isPending ? "Invio..." : "Invita"}</Btn>
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

function UserRow({ u, me, onDelete }: { u: Account; me: Account; onDelete: () => void }) {
  const qc = useQueryClient();
  const [days, setDays] = useState(String(u.subscriptionDurationDays ?? 30));
  useEffect(() => { setDays(String(u.subscriptionDurationDays ?? 30)); }, [u.subscriptionDurationDays]);
  const upd = useUpdateManagedUser({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListManagedUsersQueryKey() }) } });
  const resend = useResendManagedInvitation();
  const protectedUser = u.id === me.id || u.role === "admin";
  const badge = u.status === "active" ? "bg-[#e3eedb] text-[var(--nc-leaf)]" : "bg-[#f7e3dc] text-[var(--nc-danger)]";
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{u.name} {u.role === "admin" && <span className="nc-mono ml-1 text-xs text-[var(--nc-wheat)]">ADMIN</span>}</p>
          <p className="nc-mono break-all text-xs text-[var(--nc-muted)]">{u.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{u.status === "active" ? "Attivo" : u.status === "suspended" ? "Sospeso" : "In eliminazione"}</span>
          <span className="text-xs text-[var(--nc-muted)]">{u.activated ? "Invito accettato" : "Invito in sospeso"}</span>
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
        <SubscriptionSummary account={u} compact />
        {!protectedUser && u.status !== "deleting" && <form className="flex flex-wrap items-end gap-2" onSubmit={e => {
          e.preventDefault();
          upd.mutate({ id: u.id, data: { subscriptionDays: Number(days) } });
        }}>
          <label className="text-sm">Durata da oggi (giorni)
            <input aria-label={`Durata abbonamento di ${u.name}`} className={`${input} mt-1 max-w-40`} type="number" required min={1} max={3650} step={1} value={days} onChange={e => setDays(e.target.value)} />
          </label>
          <Btn type="submit" disabled={upd.isPending}>{upd.isPending ? "Salvataggio..." : "Imposta da oggi"}</Btn>
          <p className="w-full text-xs text-[var(--nc-muted)]">Sostituisce la scadenza con oggi + giorni indicati, senza sommare quelli residui. Non riattiva un account sospeso.</p>
        </form>}
        {upd.isSuccess && <OkNote>Utente aggiornato.</OkNote>}
        {upd.isError && <ErrorNote error={upd.error} />}
        {resend.isError && <ErrorNote error={resend.error} />}
        {resend.isSuccess && <OkNote>{resend.data.message}</OkNote>}
      </div>
    </li>
  );
}

function Users({ me }: { me: Account }) {
  const q = useListManagedUsers({ query: { queryKey: getListManagedUsersQueryKey(), refetchInterval: 15000, refetchOnWindowFocus: true } });
  const [del, setDel] = useState<Account | null>(null);
  return (
    <Card>
      <h2 className="nc-display text-xl font-semibold">Utenti autorizzati</h2>
      <div className="mt-3">
        {q.isPending ? <Skeleton /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">Nessun utente. Usa il modulo qui sopra per invitare il primo.</p> :
            <ul className="divide-y divide-[var(--nc-line)]">{q.data.map(u => <UserRow key={u.id} u={u} me={me} onDelete={() => setDel(u)} />)}</ul>}
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
      <div className="mt-3 max-h-[28rem] overflow-auto">
        {q.isPending ? <Skeleton /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          q.data.length === 0 ? <p className="text-sm text-[var(--nc-muted)]">Nessun evento registrato.</p> :
            <table className="nc-mono w-full text-xs">
              <thead className="text-left text-[var(--nc-muted)]"><tr><th className="py-2">Data</th><th>Azione</th><th>Oggetto</th></tr></thead>
              <tbody>{q.data.map(ev => (
                <tr key={ev.id} className="border-t border-[var(--nc-line)]"><td className="py-2 pr-3 whitespace-nowrap">{fmtDate(ev.createdAt)}</td><td className="pr-3">{ev.action}</td><td className="break-all text-[var(--nc-muted)]">{ev.targetId ?? "-"}</td></tr>
              ))}</tbody>
            </table>}
      </div>
    </Card>
  );
}

export function AdminPage({ account }: { account: Account }) {
  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="nc-rise">
          <Eyebrow>Amministrazione</Eyebrow>
          <h1 className="nc-display mt-2 text-4xl font-semibold text-[var(--nc-leaf)]">Chi può vedere i campi</h1>
          <p className="mt-2 max-w-2xl text-[var(--nc-muted)]">Gestisci gli accessi. Come amministratore vedi nello strumento solo i tuoi rilievi, non quelli degli altri utenti.</p>
        </div>
        <InviteForm />
        <Users me={account} />
        <Requests />
        <Audit />
      </main>
    </div>
  );
}
