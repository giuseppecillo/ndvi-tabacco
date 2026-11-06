import { createRoot } from "react-dom/client";
import { MapView, renderIdwOverlay } from "../src/ElaborazioniMappe";
import { NitrogenSavings } from "../src/components/NitrogenSavings";
import { parseKml, computeIdwGrid } from "../src/utils/geoUtils";
import kml from "./fixtures/idw-holes.kml?raw";
import "../src/index.css";
import "../src/security/security.css";

if (!import.meta.env.DEV) throw new Error("Synthetic holes harness is development-only.");
window.fetch = async () => { throw new Error("Network disabled in synthetic holes harness."); };
const [polygon] = parseKml(kml);
const result = computeIdwGrid(polygon, [
  { obsId: "QA-1", cliente: "QA", appezzamento: polygon.name, lng: 12.0003, lat: 42.0003,
    dose: 30, azotoTotale: 100, azotoGiaDistribuito: 20 },
  { obsId: "QA-2", cliente: "QA", appezzamento: polygon.name, lng: 12.0009, lat: 42.0006,
    dose: 30, azotoTotale: 100, azotoGiaDistribuito: 20 },
]);

// Check actual canvas pixels in a native browser, including the painted cell
// rectangles at hole edges. Neither map interaction nor an API is needed.
const image = new Image();
image.src = renderIdwOverlay(result);
await image.decode();
const canvas = document.createElement("canvas");
canvas.width = image.width;
canvas.height = image.height;
const context = canvas.getContext("2d", { willReadFrequently: true })!;
context.drawImage(image, 0, 0);
function alphaAt(lng: number, lat: number) {
  const [w, s, e, n] = result.bbox;
  const x = Math.floor((lng - w) / (e - w) * canvas.width);
  const y = Math.floor((n - lat) / (n - s) * canvas.height);
  return context.getImageData(x, y, 1, 1).data[3];
}
for (const hole of polygon.holes!) {
  const [w, s] = hole[0];
  const [e, n] = hole[2];
  for (const fraction of [0.05, 0.5, 0.95]) {
    if (alphaAt(w + (e - w) * fraction, s + (n - s) * fraction) !== 0) {
      throw new Error("Excluded area is painted by the IDW overlay.");
    }
  }
}
if (!alphaAt(12.0003, 42.0003)) throw new Error("Cultivated area is missing from the overlay.");
console.info("Synthetic hole canvas checks: PASS");

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-5xl space-y-4 p-4">
    <h1 className="text-xl font-bold">QA — due esclusioni interne, solo geometrie e GPS sintetici</h1>
    <p role="status">PASS — fori trasparenti anche vicino ai bordi; dose presente nella zona coltivata.</p>
    <MapView result={result} />
    <NitrogenSavings result={result} />
  </main>,
);
