import { useMemo, useState } from "react";
import { BookOpen, Download, Search, X } from "lucide-react";
import { getGetCropCatalogueQueryKey, useGetCropCatalogue, useGetVarietyProposals, getGetVarietyProposalsQueryKey } from "@workspace/api-client-react";
import { getLocale, t, useLanguage } from "../i18n/runtime";
import { alphabetical } from "../utils/alphabetical";
import { ErrorNote, Skeleton, useMyAccount } from "../security/ui";
import type { VarietaDati } from "../calculations";
import { catalogueCrops, filterCatalogue } from "../catalogue/filterCatalogue";
import { completeCatalogue } from "../catalogue/completeCatalogue";

const isNumeric = (v: string) => /^-?[\d.,\s-]+$/.test(v) && /\d/.test(v);
const isPhaseCol = (c: string) => /^Fase F\d/.test(c);
const groupStart = (c: string) => isPhaseCol(c);

export function CropCatalogue({ active, tobaccoVarieties }: { active: boolean; tobaccoVarieties: readonly VarietaDati[] }) {
  const language = useLanguage();
  const account = useMyAccount(active);
  const canExport = account.data?.role === "admin" && account.data.status === "active";
  const [exportState, setExportState] = useState<"idle" | "pending" | "error">("idle");
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("");
  const q = useGetCropCatalogue({ query: { enabled: active, queryKey: getGetCropCatalogueQueryKey(), staleTime: 60000, refetchOnMount: true } });
  const additions = useGetVarietyProposals({query:{queryKey:getGetVarietyProposalsQueryKey(),enabled:active,refetchInterval:30000,refetchOnWindowFocus:true}});
  const approved = useMemo(()=>additions.data?.filter(p=>p.status==="approved").map(p=>p.profile)??[],[additions.data]);
  const complete = useMemo(() => q.data ? completeCatalogue(q.data, tobaccoVarieties,approved) : { columns: [], rows: [] }, [q.data, tobaccoVarieties,approved]);
  const { columns, rows } = complete;
  const crops = useMemo(() => catalogueCrops(rows, t, getLocale()), [rows, language]);
  const filtered = useMemo(() => {
    const matching = filterCatalogue(rows, { query, crop }, t);
    const byVariety = alphabetical(matching, row => row[1] ?? "", getLocale());
    return alphabetical(byVariety, row => t(row[0] ?? ""), getLocale());
  }, [rows, query, crop, language]);
  const translatedCols = new Set([0, 2, 3, 4]);
  const phaseCols = new Set(columns.map((c, i) => (isPhaseCol(c) ? i : -1)).filter(i => i >= 0));

  async function exportCatalogue() {
    if (!canExport || !q.data || !rows.length || exportState === "pending") return;
    setExportState("pending");
    try {
      const { downloadCatalogueWorkbook } = await import("../utils/catalogueExcel");
      await downloadCatalogueWorkbook(q.data, tobaccoVarieties, t, getLocale(),approved);
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  return (
    <section className="space-y-4" data-testid="module-catalogue" aria-labelledby="catalogue-title">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-md sm:p-5">
        <div className="flex items-start gap-3">
          <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-800" />
          <div className="min-w-0">
            <h2 id="catalogue-title" className="nc-display text-lg font-semibold text-green-900">{t("Catalogo colture")}</h2>
            <p className="text-sm text-stone-500">{t("Parametri colturali di riferimento, in sola consultazione")}</p>
          </div>
        </div>
        {canExport && (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={() => void exportCatalogue()}
              disabled={!q.data || q.isError || additions.isPending || additions.isError || !rows.length || exportState === "pending"}
              data-testid="button-export-catalogue-excel"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t(exportState === "pending" ? "Preparazione file Excel…" : "Scarica tutte le colture e varietà (.xlsx)")}
            </button>
            <p className="text-xs text-stone-500">{t("Il file include tutte le colture e varietà, anche tabacco, grano duro e pomodoro, indipendentemente dai filtri.")}</p>
            {exportState === "error" && <p role="alert" className="text-sm text-red-700">{t("Esportazione Excel non riuscita. Riprova.")}</p>}
            {exportState === "pending" && <p role="status" className="sr-only">{t("Preparazione file Excel…")}</p>}
          </div>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">{t("Cerca coltura, varietà o parametro")}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Cerca coltura, varietà o parametro")}
              data-testid="input-catalogue-search"
              className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-700" />
          </label>
          <label className="block">
            <span className="sr-only">{t("Coltura")}</span>
            <select value={crop} onChange={e => setCrop(e.target.value)} data-testid="select-catalogue-crop"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="">{t("Tutte le colture")}</option>
              {crops.map(c => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </label>
          {(query || crop) && (
            <button type="button" onClick={() => { setQuery(""); setCrop(""); }} data-testid="button-catalogue-clear"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-stone-50">
              <X aria-hidden="true" className="h-4 w-4" />{t("Azzera filtri")}
            </button>
          )}
        </div>
        {q.data && rows.length > 0 && (
          <p className="nc-mono mt-3 text-xs text-stone-500" role="status" data-testid="text-catalogue-count">
            {t(`${filtered.length} di ${rows.length} varietà`)}
          </p>
        )}
      </div>

      {additions.isError && <ErrorNote error={new Error("Impossibile caricare le varietà approvate.")} onRetry={()=>void additions.refetch()}/>}
      {q.isLoading ? <Skeleton rows={6} />
        : q.isError ? <ErrorNote error={new Error("Impossibile caricare il catalogo colture.")} onRetry={() => void q.refetch()} />
        : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-10 text-center text-sm text-stone-500">{t("Il catalogo è vuoto.")}</div>
        ) : (
          <div className="lg:-mx-[calc((min(100vw,72rem)-42rem)/2-1rem)] relative">
            <p className="mb-1.5 text-xs text-stone-400 sm:hidden">{t("Scorri orizzontalmente per vedere tutti i parametri")}</p>
            <div className="max-h-[70dvh] overflow-auto rounded-2xl border border-stone-200 bg-white shadow-md" tabIndex={0} aria-label={t("Catalogo colture")} data-testid="table-catalogue-scroll">
              <table className="min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {columns.map((c, i) => (
                      <th key={c + i} scope="col"
                        className={`sticky top-0 z-10 whitespace-nowrap border-b border-stone-200 bg-[#f3efe4] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-green-900 ${i === 1 ? "left-0 z-20 border-r" : ""} ${groupStart(c) ? "border-l border-l-amber-200" : ""}`}>
                        {t(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={columns.length} className="px-4 py-10 text-stone-500">{t("Nessuna varietà corrisponde ai filtri.")}</td></tr>
                  ) : filtered.map((row, r) => (
                    <tr key={`${row[0]}-${row[1]}-${r}`} className="group" data-testid={`row-catalogue-${r}`}>
                      {row.map((v, i) => (
                        <td key={i}
                          className={`whitespace-nowrap border-b border-stone-100 px-3 py-2 group-hover:bg-[#f7f4ea] ${i === 1 ? "sticky left-0 border-r bg-white font-semibold text-stone-800" : "text-stone-700"} ${i === 0 ? "text-green-900" : ""} ${isNumeric(v) && !phaseCols.has(i) ? "nc-mono text-right tabular-nums" : ""} ${groupStart(columns[i] ?? "") ? "border-l border-l-amber-100" : ""}`}>
                          {translatedCols.has(i) || phaseCols.has(i) ? t(v) : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <aside className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900" data-testid="text-catalogue-note">
        <strong className="mr-1 font-semibold">{t("Solo consultazione")}.</strong>
        {t("La consultazione del catalogo non attiva calcoli né modifica i rilievi salvati. I valori sono riportati come nella fonte.")}
      </aside>
    </section>
  );
}
