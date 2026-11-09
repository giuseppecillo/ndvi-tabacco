import { createRoot } from "react-dom/client";
import { computeIdwGrid, type ControlPoint, type KmlPolygon } from "../src/utils/geoUtils";
import { formatIdwValue } from "../src/utils/idwPrecision";
import { NitrogenSavings } from "../src/components/NitrogenSavings";
import "../src/index.css";

if (!import.meta.env.DEV) throw new Error("Synthetic IDW precision fixture is development-only.");
window.fetch = async () => { throw new Error("Network disabled: synthetic IDW fixture."); };
const polygon: KmlPolygon = { name: "Synthetic", ring: [
  [12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009], [12, 42],
] };
const points: ControlPoint[] = [
  { obsId: "synthetic-a", coltura: "pomodoro", cliente: "QA", appezzamento: "QA",
    lng: 12.0002, lat: 42.0002, dose: 0, azotoTotale: 10, azotoGiaDistribuito: 9.99 },
  { obsId: "synthetic-b", coltura: "grano_duro", cliente: "QA", appezzamento: "QA",
    lng: 12.001, lat: 42.0007, dose: .1, azotoTotale: 10, azotoGiaDistribuito: 9.89 },
];
const result = computeIdwGrid(polygon, points);
const imported = computeIdwGrid(polygon, points.map(p => ({ ...p, azotoTotale: undefined })));
const examples = result.grid.filter(g =>
  Number(g.dose.toFixed(1)) > g.azotoTotale! - g.azotoGiaDistribuito!).slice(0, 4);

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-4xl space-y-4 p-4">
    <h1 className="text-xl font-bold text-green-950">Precisione IDW — solo punti sintetici</h1>
    <p>Nessun accesso ai rilievi salvati. Colture miste: pomodoro e grano duro.
      Le dosi derivate usano quattro decimali per difetto.</p>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="font-bold">Celle che prima arrotondavano sopra il residuo</h2>
      <table className="w-full text-left text-sm tabular-nums">
        <thead><tr><th>Residuo grezzo</th><th>Prima (1 decimale)</th><th>Dose IDW</th></tr></thead>
        <tbody>{examples.map((g, i) => <tr key={i}>
          <td>{(g.azotoTotale! - g.azotoGiaDistribuito!).toPrecision(8)}</td>
          <td className="text-red-800">{g.dose.toFixed(1)}</td>
          <td className="font-bold text-green-900">{formatIdwValue(g.dose)}</td>
        </tr>)}</tbody>
      </table>
      <p className="mt-2">Dose media: {formatIdwValue(result.stats.mean)} kg N/ha.</p>
    </section>
    <NitrogenSavings result={result} />
    <h2 className="font-bold">Punti importati senza bilancio</h2>
    <NitrogenSavings result={imported} />
  </main>,
);
