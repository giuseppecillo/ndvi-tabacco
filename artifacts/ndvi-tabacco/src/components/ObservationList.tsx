import { useMemo, useState } from "react";
import { groupObservations, ndviDeviation } from "../utils/observationHistory";
import { downloadObservationWorkbook } from "../utils/observationExcel";
import type { Observation } from "../App";
import { getLocale, t, useLanguage } from "../i18n/runtime";

/** Persisted values (IDs, clients, varieties, units) are never translated. */
type Row = { label: string; value: string };
const ETA_LABEL: Record<string, string> = { standard: "Standard", avanzata: "Avanzata", extra: "Extra-avanzata" };

const num = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : v.toFixed(digits);

function formatDay(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  // Date-only values are calendar days: build them locally to avoid timezone shifts.
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function formatSaved(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const savedTime = (o: Observation) => {
  const ms = o.createdAt ? Date.parse(o.createdAt) : NaN;
  return Number.isNaN(ms) ? null : ms;
};

function details(o: Observation, locale: string): Row[] {
  const rows: (Row | null)[] = [
    { label: t("ID"), value: o.id },
    { label: t("Coltura"), value: t(o.coltura) },
    { label: t("Varietà"), value: o.varieta },
    { label: t("Cliente"), value: o.cliente || "—" },
    { label: t("Appezzamento"), value: o.appezzamento || "—" },
    { label: t("Data del rilievo"), value: formatDay(o.data, locale) ?? "—" },
    { label: t("Data Trapianto"), value: formatDay(o.dataTrapianto, locale) ?? "—" },
    o.dataSemina ? { label: t("Data semina"), value: formatDay(o.dataSemina, locale) ?? o.dataSemina } : null,
    { label: t("Giorni"), value: String(o.giorni) },
    o.faseFenologica ? { label: t("Fase fenologica"), value: t(o.faseFenologica) } : null,
    o.bbch ? { label: "BBCH", value: o.bbch } : null,
    o.faseFonte ? { label: t("Fonte della fase"), value: t(o.faseFonte) } : null,
    { label: t("Età piantina"), value: t(ETA_LABEL[o.etaPiantina] ?? o.etaPiantina) },
    { label: t("Resa attesa"), value: `${num(o.resa) ?? "—"} t/ha` },
    num(o.densitaValore, 0) ? { label: t("Densità"), value: `${num(o.densitaValore, 0)} ${o.densitaUnita ?? ""}`.trim() } : null,
    num(o.pianteHaEquivalenti, 0) ? { label: t("Piante/ha equivalenti"), value: num(o.pianteHaEquivalenti, 0)! } : null,
    { label: t("Letture NDVI"), value: [o.n1, o.n2, o.n3, o.n4, o.n5].map(v => num(v, 3) ?? "—").join(" · ") },
    { label: t("NDVI medio"), value: num(o.media, 3) ?? "—" },
    { label: t("NDVI ottimale"), value: num(o.ottimale, 3) ?? "—" },
    { label: t("Discostamento registrato (valore originale salvato)"), value: num(o.discostamento, 3) ?? "—" },
    { label: t("Dose indicata"), value: `${num(o.dose) ?? "—"} kg N/ha` },
    { label: t("Azoto totale previsto"), value: num(o.azotoTotale) ? `${num(o.azotoTotale)} kg N/ha` : "—" },
    { label: t("Azoto già distribuito"), value: num(o.azotoGiaDistribuito) !== null ? `${num(o.azotoGiaDistribuito)} kg N/ha` : "—" },
    { label: t("Quota azotata"), value: num(o.quotaAzoto) !== null ? `${num(o.quotaAzoto)} kg N/ha` : "—" },
    { label: t("Posizione GPS"), value: o.lat !== null && o.lng !== null ? `${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}` : t("Non disponibile") },
  ];
  return rows.filter((r): r is Row => r !== null);
}

type Group = ReturnType<typeof groupObservations>[number];
type ExportState = { status: "idle" | "pending" | "error"; message?: string };

const signed = (v: number | null, digits: number, suffix = "") =>
  v === null || !Number.isFinite(v) ? "" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}${suffix}`;

function GroupTable({ group, locale }: { group: Group; locale: string }) {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const points = useMemo(() => {
    // Timestamp order when known; points without timestamp keep register order at the end.
    return group.observations.map((o, i) => ({ o, i })).sort((a, b) => {
      const ta = savedTime(a.o), tb = savedTime(b.o);
      if (ta !== null && tb !== null) return ta - tb;
      if (ta !== null) return -1;
      if (tb !== null) return 1;
      return a.i - b.i;
    }).map(x => x.o);
  }, [group.observations]);

  async function exportXlsx() {
    setState({ status: "pending" });
    try {
      await downloadObservationWorkbook({ ...group, observations: points }, t);
      setState({ status: "idle" });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="border-t border-stone-200 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-600">
          Discostamento = NDVI medio − NDVI ottimale: positivo sopra l'ottimale, negativo sotto.
          <br />
          La dose N è un tasso per ettaro (kg N/ha) indicato al punto, non una quantità assoluta di azoto.
        </p>
        <button
          type="button"
          onClick={exportXlsx}
          disabled={state.status === "pending"}
          aria-busy={state.status === "pending"}
          className="self-start rounded-lg bg-green-800 px-3 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          {state.status === "pending" ? t("Preparazione file Excel…") : t("Esporta Excel (.xlsx)")}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {state.status === "error" && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {t("Esportazione Excel non riuscita. Riprova.")}{state.message ? ` (${state.message})` : ""}
          </p>
        )}
      </div>
      <p className="mb-1 text-[11px] text-stone-500 md:hidden">Scorri la tabella in orizzontale per vedere tutte le colonne.</p>
      <div className="max-w-full overflow-x-auto rounded-lg border border-stone-200">
        <table data-testid="observation-group-table" className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-[#fff8ea] text-left text-xs text-stone-600">
            <tr>
              <th scope="col" className="px-3 py-2">ID</th>
              <th scope="col" className="px-3 py-2">{t("Salvata il")}</th>
              <th scope="col" className="px-3 py-2">{t("Appezzamento")}</th>
              <th scope="col" className="px-3 py-2 text-right">Lat</th>
              <th scope="col" className="px-3 py-2 text-right">Lng</th>
              <th scope="col" className="px-3 py-2 text-right">{t("NDVI medio")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("NDVI ottimale")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("Discostamento (medio − ottimale)")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("Discostamento %")}</th>
              <th scope="col" className="px-3 py-2 text-right">{t("Dose N (kg N/ha)")}</th>
            </tr>
          </thead>
          <tbody>
            {points.map(o => {
              const dev = ndviDeviation(o);
              const saved = formatSaved(o.createdAt, locale);
              return (
                <tr key={o.id} className="border-t border-stone-100 tabular-nums">
                  <td className="px-3 py-2 font-mono text-green-800">{o.id}</td>
                  <td className="px-3 py-2">{saved ?? <span className="italic text-stone-400">{t("Non disponibile")}</span>}</td>
                  <td className="px-3 py-2">{o.appezzamento || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{o.lat !== null ? o.lat.toFixed(6) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono">{o.lng !== null ? o.lng.toFixed(6) : ""}</td>
                  <td className="px-3 py-2 text-right">{num(o.media, 3) ?? ""}</td>
                  <td className="px-3 py-2 text-right">{num(o.ottimale, 3) ?? ""}</td>
                  <td className="px-3 py-2 text-right">{signed(dev.absolute, 3)}</td>
                  <td className="px-3 py-2 text-right">{signed(dev.percent, 1, "%")}</td>
                  <td className="px-3 py-2 text-right font-semibold">{num(o.dose) ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-semibold text-stone-600">Dettagli completi dei punti</p>
        {points.map(o => (
          <details key={o.id} className="rounded-lg border border-stone-200 bg-white">
            <summary className="cursor-pointer px-3 py-2 text-sm">
              <span className="font-mono text-green-800">#{o.id}</span>{" · "}{o.appezzamento || "—"}
            </summary>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-stone-100 px-3 py-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {details(o, locale).map(row => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-xs text-stone-500">{row.label}</dt>
                  <dd className="break-words font-medium text-stone-800 tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}

export function ObservationList({ osservazioni }: { osservazioni: Observation[] }) {
  useLanguage(); // re-render on language change
  const locale = getLocale();
  const [query, setQuery] = useState("");

  // Derived from props: groups by client + observation date, newest date first.
  const groups = useMemo(() => {
    const all = [...groupObservations(osservazioni)].sort((a, b) => b.date.localeCompare(a.date) || a.cliente.localeCompare(b.cliente));
    const q = query.trim().toLowerCase();
    if (!q) return all;
    // A match on the group or any point keeps the WHOLE group.
    return all.filter(g =>
      [g.cliente, g.date, formatDay(g.date, locale) ?? ""].some(v => v.toLowerCase().includes(q)) ||
      g.observations.some(o => [o.id, o.cliente, o.appezzamento, o.varieta, o.coltura, o.data]
        .some(v => String(v ?? "").toLowerCase().includes(q))));
  }, [osservazioni, query, locale]);

  return (
    <section data-testid="observation-list" aria-labelledby="observation-list-title" className="mb-5 min-w-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="observation-list-title" className="text-base font-semibold text-green-900">Raggruppati per cliente e data di rilievo</h2>
          <p className="text-xs text-stone-500">Dalla data di rilievo più recente.</p>
        </div>
        <label className="flex flex-col text-xs font-semibold text-stone-600 sm:w-64">
          Cerca
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("Cliente, data, ID, appezzamento")}
            className="mt-1 rounded-lg border border-stone-300 bg-[#fffdf7] px-3 py-2 text-sm font-normal text-stone-800 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
          />
        </label>
      </div>

      {groups.length === 0 ? (
        <p role="status" className="rounded-xl border border-dashed border-stone-300 bg-[#fff8ea] px-4 py-3 text-sm text-stone-600">
          Nessuna osservazione corrisponde alla ricerca.
        </p>
      ) : (
        <ol className="space-y-2">
          {groups.map(g => (
            <li key={g.key} data-testid="observation-list-item" className="min-w-0 rounded-xl border border-stone-200 bg-[#fffdf7]">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900">{g.cliente || "—"}</p>
                    <p className="text-xs text-stone-500">
                      <time dateTime={g.date}>{formatDay(g.date, locale) ?? g.date}</time>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-md bg-green-800 px-2 py-1 text-xs font-semibold text-white tabular-nums">
                      {g.observations.length} {g.observations.length === 1 ? t("punto") : t("punti")}
                    </span>
                    <span aria-hidden="true" className="text-stone-400 transition-transform group-open:rotate-90">›</span>
                  </div>
                </summary>
                <GroupTable group={g} locale={locale} />
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
