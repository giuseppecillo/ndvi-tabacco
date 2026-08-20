import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "./components/ui/chart";
import {
  serieDistribuzioneOsservazioni,
  type ObservationDistributionPoint,
  type ObservationDistributionSource,
} from "./observationDistribution";

const chartConfig = {
  tabacco: { label: "Tabacco", color: "#15803d" },
  grano: { label: "Grano duro", color: "#2563eb" },
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ObservationDistributionPoint }>;
};

function formatNdvi(value: number): string {
  return value.toFixed(3);
}

function DistributionTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const hasDeficit = point.scostamento > 0;
  return (
    <div className="min-w-56 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-stone-900">Osservazione {point.id} · {point.data}</p>
      <p className="mb-2 text-stone-500">{point.coltura === "grano duro" ? "Grano duro" : "Tabacco"} · {point.varieta}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-stone-500">NDVI medio</dt><dd className="font-mono text-stone-800">{formatNdvi(point.media)}</dd>
        <dt className="text-stone-500">NDVI atteso</dt><dd className="font-mono text-stone-800">{formatNdvi(point.ottimale)}</dd>
        <dt className="text-stone-500">Scostamento</dt>
        <dd className={`font-mono font-semibold ${hasDeficit ? "text-amber-700" : "text-green-700"}`}>
          {point.scostamento >= 0 ? "+" : ""}{formatNdvi(point.scostamento)}
        </dd>
        <dt className="text-stone-500">Deficit usato</dt><dd className="font-mono text-stone-800">{formatNdvi(point.deficitNdvi)}</dd>
        <dt className="text-stone-500">N indicato</dt><dd className="font-mono font-bold text-stone-900">{point.azotoIndicato.toFixed(1)} kg/ha</dd>
      </dl>
    </div>
  );
}

export function ObservationDistributionChart({
  observations,
}: {
  observations: ObservationDistributionSource[];
}) {
  const punti = useMemo(() => serieDistribuzioneOsservazioni(observations), [observations]);
  if (punti.length === 0) {
    return (
      <section className="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600" aria-live="polite">
        Nessuna osservazione salvata con valori NDVI e azoto utilizzabili per il grafico.
      </section>
    );
  }

  const tabacco = punti.filter((punto) => punto.coltura === "tabacco");
  const grano = punti.filter((punto) => punto.coltura === "grano duro");
  const scostamentoMin = Math.min(...punti.map((punto) => punto.scostamento), -0.03);
  const scostamentoMax = Math.max(...punti.map((punto) => punto.scostamento), 0.03);
  const padding = Math.max(0.02, (scostamentoMax - scostamentoMin) * 0.12);

  return (
    <section className="mb-6 rounded-xl border border-green-100 bg-green-50/60 p-4 sm:p-5" aria-labelledby="distribuzione-ndvi-title">
      <div className="mb-3">
        <h3 id="distribuzione-ndvi-title" className="text-base font-bold text-green-950">Distribuzione NDVI e azoto indicato</h3>
        <p id="distribuzione-ndvi-description" className="mt-1 text-xs text-stone-600">
          Ogni punto è un’osservazione salvata. A destra dello zero l’NDVI medio è sotto il riferimento; l’altezza mostra i kg N/ha indicati dal punto.
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[330px] w-full aspect-auto" aria-describedby="distribuzione-ndvi-description">
        <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            type="number"
            dataKey="scostamento"
            name="Scostamento NDVI"
            domain={[scostamentoMin - padding, scostamentoMax + padding]}
            tickFormatter={(value) => Number(value).toFixed(2)}
            label={{ value: "Scostamento NDVI (atteso − medio)", position: "insideBottom", offset: -8 }}
          />
          <YAxis
            type="number"
            dataKey="azotoIndicato"
            name="Azoto indicato"
            allowDecimals={false}
            domain={[0, "auto"]}
            label={{ value: "Azoto indicato (kg N/ha)", angle: -90, position: "insideLeft", offset: 3 }}
          />
          <ReferenceLine x={0} stroke="#78716c" strokeDasharray="5 5" label={{ value: "NDVI atteso", position: "insideTopRight", fill: "#57534e", fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<DistributionTooltip />} />
          <Legend verticalAlign="top" height={30} />
          <Scatter name="Tabacco" data={tabacco} fill="#15803d" />
          <Scatter name="Grano duro" data={grano} fill="#2563eb" />
        </ScatterChart>
      </ChartContainer>
      <p className="mt-3 text-xs text-stone-500">
        Un punto a zero kg N/ha indica NDVI pari o superiore al riferimento, oppure un piano già esaurito. Il grafico non identifica da solo la causa dello scostamento.
      </p>
      <details open className="mt-4 rounded-lg border border-stone-200 bg-white px-3 py-2">
        <summary
          tabIndex={0}
          aria-controls="elenco-punti-grafico"
          className="cursor-pointer text-xs font-semibold text-green-900 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          Elenco accessibile dei punti del grafico ({punti.length})
        </summary>
        <div id="elenco-punti-grafico" className="mt-3 max-h-64 overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <caption className="sr-only">
              Valori delle osservazioni usati nel grafico di distribuzione NDVI e azoto
            </caption>
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th scope="col" className="px-2 py-2 font-semibold">ID</th>
                <th scope="col" className="px-2 py-2 font-semibold">Coltura</th>
                <th scope="col" className="px-2 py-2 font-semibold">NDVI medio</th>
                <th scope="col" className="px-2 py-2 font-semibold">NDVI atteso</th>
                <th scope="col" className="px-2 py-2 font-semibold">Scostamento</th>
                <th scope="col" className="px-2 py-2 font-semibold">N indicato</th>
              </tr>
            </thead>
            <tbody>
              {punti.map((punto) => (
                <tr key={punto.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-2 py-2 font-mono font-semibold text-stone-800">{punto.id}</td>
                  <td className="px-2 py-2">{punto.coltura === "grano duro" ? "Grano duro" : "Tabacco"}</td>
                  <td className="px-2 py-2 font-mono">{formatNdvi(punto.media)}</td>
                  <td className="px-2 py-2 font-mono">{formatNdvi(punto.ottimale)}</td>
                  <td className={`px-2 py-2 font-mono font-semibold ${punto.scostamento > 0 ? "text-amber-700" : "text-green-700"}`}>
                    {punto.scostamento >= 0 ? "+" : ""}{formatNdvi(punto.scostamento)}
                  </td>
                  <td className="px-2 py-2 font-mono font-semibold">{punto.azotoIndicato.toFixed(1)} kg/ha</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}