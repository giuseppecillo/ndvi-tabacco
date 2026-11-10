import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import {
  getGetVarietyProposalsQueryKey, getGetVarietyTemplatesQueryKey,
  useGetVarietyProposals, useGetVarietyTemplates, useSubmitVarietyProposal, type VarietyProposal,
} from "@workspace/api-client-react";
import { Btn, ErrorNote, OkNote, Skeleton, fmtDate } from "../security/ui";
import { getLocale, t, useLanguage } from "../i18n/runtime";

const input = "w-full min-w-0 rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2.5 text-base outline-none focus:border-[var(--nc-leaf)]";
const STATUS: Record<string, [string, string]> = {
  pending: ["In attesa", "bg-[#f4ead2] text-[#7a5a14]"],
  approved: ["Approvata", "bg-[#e3eedb] text-[var(--nc-leaf)]"],
  rejected: ["Rifiutata", "bg-[#f7e3dc] text-[var(--nc-danger)]"],
};
const fmt = (n: number) => n.toLocaleString(getLocale(), { maximumFractionDigits: 2 });

export function StatusPill({ status }: { status: string }) {
  const [label, cls] = STATUS[status] ?? [status, ""];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{t(label)}</span>;
}

function OwnList({ items }: { items: VarietyProposal[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t("Le tue proposte per questa coltura")}</h4>
      {items.length === 0 ? <p className="text-xs text-[var(--nc-muted)]">{t("Nessuna proposta in attesa o rifiutata.")}</p> :
        <ul className="divide-y divide-[var(--nc-line)] rounded-xl border border-[var(--nc-line)]">
          {items.map(p => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm" data-testid={`row-own-proposal-${p.id}`}>
              <span className="min-w-0 break-words"><strong>{p.name}</strong> <span className="text-xs text-[var(--nc-muted)]">· {p.referenceName} · {fmtDate(p.createdAt)}</span></span>
              <StatusPill status={p.status} />
              {p.reviewNote && <p className="w-full text-xs text-[var(--nc-muted)]">{t("Nota dell'amministratore")}: {p.reviewNote}</p>}
            </li>))}
        </ul>}
    </div>
  );
}

export function VarietyProposalForm({ crop }: { crop: string }) {
  useLanguage();
  const qc = useQueryClient();
  const templates = useGetVarietyTemplates({ crop }, { query: { queryKey: getGetVarietyTemplatesQueryKey({ crop }), enabled: !!crop } });
  const proposals = useGetVarietyProposals({ query: { queryKey: getGetVarietyProposalsQueryKey(), refetchInterval: 30000, refetchIntervalInBackground: false, refetchOnWindowFocus: true } });
  const [name, setName] = useState("");
  const [refId, setRefId] = useState("");
  const [doses, setDoses] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<VarietyProposal | null>(null);
  const submit = useSubmitVarietyProposal({ mutation: { onSuccess: p => { setSaved(p); setName(""); setRefId(""); setDoses([]); void qc.invalidateQueries({ queryKey: getGetVarietyProposalsQueryKey() }); } } });

  useEffect(() => { setRefId(""); setDoses([]); setError(""); setSaved(null); }, [crop]);
  const tpl = templates.data?.find(x => x.id === refId);
  const phases = tpl?.profile.phases ?? [];
  const parsed = doses.map(d => d.trim() === "" ? NaN : Number(d));
  const allValid = phases.length > 0 && parsed.length === phases.length && parsed.every(v => Number.isFinite(v) && v >= 0 && v <= 1000);
  const total = parsed.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  const own = useMemo(() => (proposals.data ?? []).filter(p => p.isOwn && p.crop === crop && p.status !== "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [proposals.data, crop]);

  const chooseRef = (id: string) => { setRefId(id); setDoses((templates.data?.find(x => x.id === id)?.profile.phases ?? []).map(() => "")); setError(""); setSaved(null); };
  const save = () => {
    if (submit.isPending) return;
    if (!name.trim()) return setError("Inserisci il nome della varietà.");
    if (!tpl) return setError("Seleziona la varietà affine di riferimento.");
    if (!allValid) return setError("Ogni fase richiede un valore numerico da 0 a 1000.");
    if (!(total > 0)) return setError("Il totale deve essere maggiore di zero.");
    setError(""); setSaved(null);
    submit.mutate({ data: { crop, name: name.trim(), referenceId: tpl.id, phaseNitrogen: parsed } });
  };

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-[var(--nc-line)] bg-[#fbf8f1] p-4 sm:p-6" data-testid="variety-proposal-form" aria-label={t("Proponi una nuova varietà")}>
      <div>
        <h3 className="nc-display text-xl font-semibold">{t("Proponi una nuova varietà")}</h3>
        <p className="mt-1 text-sm text-[var(--nc-muted)]">{t("Inserisci il piano azoto per fase di una varietà non presente nel catalogo. Prima dell'uso la proposta deve essere approvata dall'amministratore.")}</p>
      </div>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold">{t("Nome della varietà")}
            <input className={input} value={name} maxLength={100} disabled={submit.isPending} onChange={e => setName(e.target.value)} data-testid="input-variety-name" />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold">{t("Varietà affine di riferimento")}
            {templates.isPending && crop ? <div className="nc-skel h-11" /> :
              <select className={input} value={refId} disabled={submit.isPending || !templates.data?.length} onChange={e => chooseRef(e.target.value)} data-testid="select-variety-reference">
                <option value="">{t("Seleziona la varietà affine")}</option>
                {templates.data?.map(x => <option key={x.id} value={x.id}>{x.referenceName}</option>)}
              </select>}
          </label>
        </div>
        {templates.isError && <ErrorNote error={templates.error} onRetry={() => void templates.refetch()} />}
        {templates.isSuccess && templates.data.length === 0 && <p className="text-sm text-[var(--nc-muted)]">{t("Nessuna varietà di riferimento disponibile per questa coltura.")}</p>}
        <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("Scegli una varietà della stessa coltura il più possibile simile: destinazione, uso, precocità, densità, resa, azoto totale e NDVI di riferimento vengono ereditati da questa varietà.")} <strong>{t("Le dosi inserite non costituiscono una curva NDVI validata per la nuova varietà.")}</strong></span>
        </p>
        {tpl && (
          <fieldset className="space-y-2" disabled={submit.isPending}>
            <legend className="text-sm font-semibold">{t("Azoto per fase (kg N/ha)")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {phases.map((ph, i) => (
                <label key={ph.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2 text-sm">
                  <span className="min-w-0">{ph.id} · {t(ph.label)} <span className="nc-mono block text-[11px] text-[var(--nc-muted)]">BBCH {ph.bbch} · kg N/ha</span></span>
                  <input type="number" inputMode="decimal" min={0} max={1000} step="any" value={doses[i] ?? ""} aria-label={`${ph.id} ${t(ph.label)} kg N/ha`}
                    onChange={e => setDoses(d => d.map((v, j) => j === i ? e.target.value : v))}
                    className="nc-mono w-24 rounded-lg border border-[var(--nc-line)] bg-white px-2 py-2 text-right text-base outline-none focus:border-[var(--nc-leaf)]" data-testid={`input-phase-dose-${ph.id}`} />
                </label>))}
            </div>
            <p className="flex items-baseline justify-between rounded-xl bg-[#e3eedb] px-3 py-2 text-sm text-[var(--nc-leaf)]">
              {t("Totale calcolato")} <strong className="nc-mono text-lg" data-testid="text-proposal-total">{fmt(total)} kg N/ha</strong>
            </p>
          </fieldset>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-[var(--nc-danger)]">{t(error)}</p>}
        {submit.isError && <ErrorNote error={submit.error} />}
        {saved && <OkNote><strong>{saved.name}</strong>: {t("Proposta salvata: in attesa di approvazione.")} {t("Finché non è approvata, la varietà non è disponibile per il calcolo né per gli altri utenti.")}</OkNote>}
        <div className="flex justify-end">
          <Btn type="submit" disabled={submit.isPending || !crop}><span data-testid="button-save-proposal">{submit.isPending ? t("Salvataggio...") : t("Salva proposta")}</span></Btn>
        </div>
      </form>
      {proposals.isPending ? <Skeleton rows={2} /> : proposals.isError ? <ErrorNote error={proposals.error} onRetry={() => void proposals.refetch()} /> : <OwnList items={own} />}
    </section>
  );
}
