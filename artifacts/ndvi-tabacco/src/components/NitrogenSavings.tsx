import type { PolyIdwResult } from "../utils/geoUtils";

const fmt = (value: number) => value.toFixed(1);

/** Nitrogen savings for an interpolated polygon: planned N vs applied + IDW. */
export function NitrogenSavings({ result }: { result: PolyIdwResult }) {
  const summary = result.nitrogenSummary;
  const rows = summary ? [
    { label: <>Azoto previsto dal piano</>, perHa: summary.plannedPerHa, total: summary.plannedTotalKg, strong: false },
    { label: <>Azoto distribuito + indicato dalla IDW</>, perHa: summary.indicatedPerHa, total: summary.indicatedTotalKg, strong: false },
    { label: <>Risparmio stimato</>, perHa: summary.savedPerHa, total: summary.savedTotalKg, strong: true },
  ] : [];

  return (
    <section
      data-testid="nitrogen-savings"
      className="overflow-hidden rounded-xl border border-emerald-200 bg-white"
      aria-labelledby="nitrogen-comparison-title"
    >
      <div className="bg-emerald-50 px-4 py-3">
        <h4 id="nitrogen-comparison-title" className="font-bold text-emerald-950">
          Risparmio di azoto sull’intero poligono
        </h4>
        {summary ? (
          <p className="mt-1 text-xs text-emerald-800">
            Confronto tra i kg di azoto totale del piano e l’azoto già distribuito più la dose indicata dalla mappa IDW.
            Superficie calcolata: <strong>{summary.areaHa.toFixed(2)} ha</strong>.
          </p>
        ) : null}
      </div>

      {/* Headline figures */}
      <dl className="grid grid-cols-1 gap-px bg-emerald-100 sm:grid-cols-2">
        <div className="bg-[#fff8ea] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Azoto risparmiato sul poligono</dt>
          <dd data-testid="summary-saved-kg" className="mt-1 text-2xl font-bold tabular-nums text-green-900 sm:text-3xl">
            {summary ? <>{fmt(summary.savedTotalKg)} kg N</> : <span aria-label="non disponibile">—</span>}
          </dd>
        </div>
        <div className="bg-[#fff8ea] px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Risparmio %</dt>
          <dd data-testid="summary-saved-percent" className="mt-1 text-2xl font-bold tabular-nums text-green-900 sm:text-3xl">
            {summary ? <>{fmt(summary.savedPercent)}%</> : <span aria-label="non disponibile">—</span>}
          </dd>
        </div>
      </dl>

      {summary ? (
        <>
          {/* Small screens: stacked cards, nothing hidden horizontally */}
          <dl className="divide-y divide-stone-200 md:hidden">
            {rows.map((row, i) => (
              <div key={i} className={`px-4 py-3 ${row.strong ? "bg-green-50 text-green-950" : ""}`}>
                <dt className={`text-sm ${row.strong ? "font-bold" : "font-semibold text-stone-800"}`}>{row.label}</dt>
                <dd className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  <span>
                    <span className="block text-xs text-stone-500">kg N/ha</span>
                    <span className={`tabular-nums ${row.strong ? "font-bold" : ""}`}>{fmt(row.perHa)}</span>
                  </span>
                  <span>
                    <span className="block text-xs text-stone-500">kg N sul poligono</span>
                    <span className={`tabular-nums ${row.strong ? "font-bold" : ""}`}>{fmt(row.total)}</span>
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          {/* Tablet / desktop: comparison table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Scenario</th>
                  <th scope="col" className="px-4 py-3 text-right">kg N/ha</th>
                  <th scope="col" className="px-4 py-3 text-right">kg N sul poligono</th>
                  <th scope="col" className="px-4 py-3 text-right">Risparmio %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {rows.map((row, i) => (
                  <tr key={i} className={row.strong ? "bg-green-50 text-green-950" : ""}>
                    <th scope="row" className={`px-4 py-3 ${row.strong ? "font-bold" : "font-semibold text-stone-800"}`}>{row.label}</th>
                    <td className={`px-4 py-3 text-right tabular-nums ${row.strong ? "font-bold" : ""}`}>{fmt(row.perHa)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${row.strong ? "font-bold" : ""}`}>{fmt(row.total)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${row.strong ? "font-bold" : "text-stone-400"}`}>
                      {row.strong ? <>{fmt(summary.savedPercent)}%</> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-emerald-100 bg-white px-4 py-2 text-xs text-stone-500">
            I valori per ettaro sono medie interpolate dai punti GPS del registro NDVI.
            L’azoto già distribuito è incluso nel confronto; i totali sono calcolati sulla superficie completa del poligono.
          </p>
        </>
      ) : (
        <div role="status" className="border-t border-emerald-100 px-4 py-3 text-sm text-stone-700">
          <p className="font-semibold text-emerald-950">Risparmio non disponibile.</p>
          <p className="mt-1">
            Il piano di azoto totale manca su alcuni o tutti i punti del registro usati per l’interpolazione, quindi il risparmio non può essere calcolato.
          </p>
          <p className="mt-1">
            Completa l’azoto totale previsto in Rilievo e dati per ogni punto, poi avvia di nuovo l’elaborazione IDW.
          </p>
        </div>
      )}
    </section>
  );
}
