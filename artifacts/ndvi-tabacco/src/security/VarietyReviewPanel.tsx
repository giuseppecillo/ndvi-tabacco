import { useState } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  getGetVarietyProposalsQueryKey, useGetVarietyProposals, useReviewVarietyProposal,
  type VarietyProposal, type VarietyReviewInputDecision,
} from "@workspace/api-client-react";
import { Btn, Card, ErrorNote, OkNote, Skeleton, fmtDate } from "./ui";
import { StatusPill } from "../components/VarietyProposalForm";
import { getLocale, t, useLanguage } from "../i18n/runtime";

const fmt = (n: number, d = 2) => n.toLocaleString(getLocale(), { maximumFractionDigits: d });

function Row({ p, busy, onDone }: { p: VarietyProposal; busy: boolean; onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<VarietyReviewInputDecision | null>(null);
  const m = useReviewVarietyProposal({ mutation: { mutationKey: ["reviewVarietyProposal"], onSuccess: r => { setConfirm(null); onDone(r.name); }, onSettled: () => void qc.invalidateQueries({ queryKey: getGetVarietyProposalsQueryKey() }) } });
  const total = p.profile.phases.reduce((s, ph) => s + ph.azoto, 0);
  return (
    <li className="py-4" data-testid={`row-proposal-${p.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold">{p.name} <span className="text-xs font-normal text-[var(--nc-muted)]">· {t("Coltura")}: {t(p.crop)}</span></p>
          <p className="text-xs text-[var(--nc-muted)]">{t("Riferimento")}: {p.referenceName} · {t("Creata il")} {fmtDate(p.createdAt)}</p>
        </div>
        <StatusPill status={p.status} />
      </div>
      <div className="nc-scroll-x mt-3 overflow-x-auto rounded-xl border border-[var(--nc-line)]">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="text-[var(--nc-muted)]"><tr><th className="px-3 py-2">{t("Fase")}</th><th className="px-3">BBCH</th><th className="px-3">{t("Dose proposta (kg N/ha)")}</th><th className="px-3">{t("NDVI riferimento")}</th></tr></thead>
          <tbody className="nc-mono">{p.profile.phases.map(ph => (
            <tr key={ph.id} className="border-t border-[var(--nc-line)]"><td className="px-3 py-1.5 font-sans">{ph.id} · {t(ph.label)}</td><td className="px-3">{ph.bbch}</td><td className="px-3">{fmt(ph.azoto)}</td><td className="px-3">{fmt(ph.riferimento, 3)}</td></tr>))}
            <tr className="border-t border-[var(--nc-line)] font-semibold"><td className="px-3 py-1.5 font-sans">{t("Totale")}</td><td /><td className="px-3" data-testid={`text-proposal-total-${p.id}`}>{fmt(total)}</td><td /></tr>
          </tbody>
        </table>
      </div>
      {p.status === "pending" && <div className="mt-3 space-y-2">
        <input className="w-full rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--nc-leaf)]" maxLength={500}
          placeholder={t("Nota di revisione (facoltativa)")} aria-label={t("Nota di revisione (facoltativa)")} value={note} disabled={busy} onChange={e => setNote(e.target.value)} data-testid={`input-review-note-${p.id}`} />
        {confirm ? (
          <div role="alertdialog" className="rounded-xl border border-[var(--nc-wheat)] bg-[#f4ead2] p-3 text-sm">
            <p>{t(confirm === "approved" ? "Approvare questa varietà? Il profilo sarà condiviso con tutti gli utenti e non potrà essere modificato." : "Rifiutare questa proposta? Il proponente vedrà lo stato e l'eventuale nota.")}</p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>{t("Annulla")}</Btn>
              <Btn variant={confirm === "approved" ? "primary" : "danger"} disabled={busy}
                onClick={() => m.mutate({ id: p.id, data: { decision: confirm, ...(note.trim() ? { note: note.trim() } : {}) } })}>
                <span data-testid={`button-confirm-${confirm}-${p.id}`}>{m.isPending ? "..." : t(confirm === "approved" ? "Conferma approvazione" : "Conferma rifiuto")}</span></Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="ghost" disabled={busy} onClick={() => setConfirm("rejected")}><span data-testid={`button-reject-${p.id}`}>{t("Rifiuta")}</span></Btn>
            <Btn disabled={busy} onClick={() => setConfirm("approved")}><span data-testid={`button-approve-${p.id}`}>{t("Approva")}</span></Btn>
          </div>
        )}
        {m.isError && <ErrorNote error={m.error} />}
      </div>}
      {p.reviewNote && <p className="mt-2 text-xs text-[var(--nc-muted)]">{t("Nota dell'amministratore")}: {p.reviewNote}</p>}
    </li>
  );
}

export function VarietyReviewPanel() {
  useLanguage();
  const q = useGetVarietyProposals({ query: { queryKey: getGetVarietyProposalsQueryKey(), refetchInterval: 30000, refetchIntervalInBackground: false, refetchOnWindowFocus: true } });
  const busy = useIsMutating({ mutationKey: ["reviewVarietyProposal"] }) > 0;
  const [ok, setOk] = useState("");
  const pending = (q.data ?? []).filter(p => p.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="nc-display text-xl font-semibold">{t("Proposte di nuove varietà")}</h2>
        {q.isSuccess && <span className={`nc-mono rounded-full px-3 py-1 text-xs font-semibold ${pending.length ? "bg-[var(--nc-wheat)] text-[var(--nc-ink)]" : "bg-[#e3eedb] text-[var(--nc-leaf)]"}`} data-testid="badge-pending-proposals">{pending.length} {t("proposte in attesa")}</span>}
      </div>
      <p className="mt-1 text-sm text-[var(--nc-muted)]">{t("L'approvazione rende il profilo disponibile a tutti gli utenti e non può essere modificato in seguito.")}</p>
      <div className="mt-3 space-y-3">
        {ok && <OkNote><strong>{ok}</strong>: {t("Decisione registrata.")}</OkNote>}
        {q.isPending ? <Skeleton rows={2} /> : q.isError ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> :
          pending.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--nc-line)] px-4 py-6 text-center text-sm text-[var(--nc-muted)]">{t("Nessuna proposta in attesa di revisione.")}</p> :
            <ul className="divide-y divide-[var(--nc-line)]">{pending.map(p => <Row key={p.id} p={p} busy={busy} onDone={setOk} />)}</ul>}
      </div>
    </Card>
  );
}
