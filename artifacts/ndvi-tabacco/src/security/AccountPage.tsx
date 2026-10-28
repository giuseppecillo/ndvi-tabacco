import { useState } from "react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  exportMyData, getListMyPrivacyRequestsQueryKey, useCreatePrivacyRequest, useListMyPrivacyRequests,
  type Account, type CreatePrivacyRequestBodyType,
} from "@workspace/api-client-react";
import { Btn, Card, ErrorNote, Eyebrow, OkNote, PRIVACY_CONTACT, SUPPORT_CONTACT, TECHNICAL_SUPPORT_CONTACT, Skeleton, TopBar, errText, fmtDate } from "./ui";
import { SubscriptionSummary } from "./SubscriptionSummary";

export const REQ_LABEL: Record<string, string> = {
  access: "Accesso", rectification: "Rettifica", restriction: "Limitazione", objection: "Opposizione", erasure: "Cancellazione",
};
export const STATUS_LABEL: Record<string, string> = {
  pending: "In attesa", in_progress: "In lavorazione", completed: "Completata", rejected: "Respinta",
};

export function AccountPage({ account }: { account: Account }) {
  const { openUserProfile } = useClerk();
  const qc = useQueryClient();
  const reqs = useListMyPrivacyRequests();
  const create = useCreatePrivacyRequest({
    mutation: { onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: getListMyPrivacyRequestsQueryKey() }); } },
  });
  const [type, setType] = useState<CreatePrivacyRequestBodyType>("access");
  const [msg, setMsg] = useState("");
  const [exp, setExp] = useState<{ busy: boolean; err: string | null; ok: boolean }>({ busy: false, err: null, ok: false });

  const doExport = async () => {
    setExp({ busy: true, err: null, ok: false });
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `nitrocrop-dati-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      setExp({ busy: false, err: null, ok: true });
    } catch (e) { setExp({ busy: false, err: errText(e), ok: false }); }
  };

  const trimmed = msg.trim();
  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <div className="mx-auto max-w-5xl px-4 pt-5"><SubscriptionSummary account={account} /></div>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Eyebrow>Profilo e diritti sui dati</Eyebrow>
        <h1 className="nc-display mt-2 text-4xl font-semibold text-[var(--nc-leaf)]">{account.name || account.email}</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <Card className="nc-rise">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-[var(--nc-muted)]">Email</dt><dd className="nc-mono">{account.email}</dd></div>
                <div><dt className="text-[var(--nc-muted)]">Ruolo</dt><dd>{account.role === "admin" ? "Amministratore" : "Utente"}</dd></div>
                <div><dt className="text-[var(--nc-muted)]">Informativa</dt><dd>{account.privacyAcknowledged ? `Presa visione, versione ${account.privacyVersion}` : "Da confermare"}</dd></div>
                <div><dt className="text-[var(--nc-muted)]">Creato il</dt><dd>{fmtDate(account.createdAt)}</dd></div>
              </dl>
              <Btn variant="ghost" className="mt-5" onClick={() => openUserProfile()}>Cambia password e sicurezza</Btn>
              <p className="mt-3 text-sm text-[var(--nc-muted)]">
                Assistenza per recupero e cambio password:{" "}
                <a className="break-all underline" href={`mailto:${SUPPORT_CONTACT}`}>{SUPPORT_CONTACT}</a>.
                Non inviare mai la tua password via email.
              </p>
              <p className="mt-3 text-sm text-[var(--nc-muted)]">Supporto tecnico:{" "}
                <a className="break-all underline" href={`mailto:${TECHNICAL_SUPPORT_CONTACT}`}>{TECHNICAL_SUPPORT_CONTACT}</a>
              </p>
            </Card>
            <Card className="nc-rise nc-d1">
              <h2 className="nc-display text-xl font-semibold">Scarica i tuoi dati</h2>
              <p className="mt-2 text-sm text-[var(--nc-muted)]">Esporta account e osservazioni in un file JSON leggibile.</p>
              <Btn className="mt-4" disabled={exp.busy} onClick={() => void doExport()}>{exp.busy ? "Preparazione..." : "Scarica JSON"}</Btn>
              {exp.err && <div className="mt-3"><ErrorNote error={new Error(exp.err)} /></div>}
              {exp.ok && <div className="mt-3"><OkNote>File scaricato.</OkNote></div>}
            </Card>
          </div>
          <Card className="nc-rise nc-d2">
            <h2 className="nc-display text-xl font-semibold">Richiesta sui dati personali</h2>
            <p className="mt-2 text-sm text-[var(--nc-muted)]">La richiesta viene registrata e gestita dal titolare. Puoi anche scrivere a {PRIVACY_CONTACT}.</p>
            <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); if (trimmed) create.mutate({ data: { type, message: trimmed } }); }}>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REQ_LABEL).map(([k, l]) => (
                  <button type="button" key={k} onClick={() => setType(k as CreatePrivacyRequestBodyType)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${type === k ? "border-[var(--nc-leaf)] bg-[var(--nc-leaf)] text-[var(--nc-paper)]" : "border-[var(--nc-line)] hover:bg-[var(--nc-paper-2)]"}`}>{l}</button>
                ))}
              </div>
              <textarea value={msg} maxLength={2000} onChange={e => setMsg(e.target.value)} rows={4} required
                placeholder="Descrivi la richiesta (ad esempio quali dati correggere)"
                className="w-full rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] p-3 text-sm outline-none focus:border-[var(--nc-leaf)]" />
              <div className="flex items-center justify-between">
                <span className="nc-mono text-xs text-[var(--nc-muted)]">{msg.length}/2000</span>
                <Btn type="submit" disabled={!trimmed || create.isPending}>{create.isPending ? "Invio..." : "Invia richiesta"}</Btn>
              </div>
              {create.isError && <ErrorNote error={create.error} />}
              {create.isSuccess && <OkNote>Richiesta registrata.</OkNote>}
            </form>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--nc-muted)]">Le tue richieste</h3>
            <div className="mt-3">
              {reqs.isPending ? <Skeleton rows={2} /> : reqs.isError ? <ErrorNote error={reqs.error} onRetry={() => void reqs.refetch()} /> :
                reqs.data.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--nc-line)] p-4 text-sm text-[var(--nc-muted)]">Nessuna richiesta inviata.</p> : (
                  <ul className="divide-y divide-[var(--nc-line)]">
                    {reqs.data.map(r => (
                      <li key={r.id} className="py-3 text-sm">
                        <div className="flex justify-between gap-2"><span className="font-semibold">{REQ_LABEL[r.type] ?? r.type}</span><span className="nc-mono text-xs">{STATUS_LABEL[r.status] ?? r.status}</span></div>
                        <p className="mt-1 text-[var(--nc-muted)]">{r.message}</p>
                        {r.response && <p className="mt-1 border-l-2 border-[var(--nc-wheat)] pl-2">{r.response}</p>}
                        <p className="nc-mono mt-1 text-xs text-[var(--nc-muted)]">{fmtDate(r.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
