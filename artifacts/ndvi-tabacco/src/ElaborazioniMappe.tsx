/**
 * ElaborazioniMappe.tsx
 *
 * "Elaborazioni e Mappe" — IDW interpolation module.
 *
 * Scientific approach
 * ───────────────────
 * - Control points: GPS coordinates (WGS84) + Dose (kg/ha) from each observation
 * - Spatial domain: polygons imported from a KML file
 * - Grid: 10 × 10 m regular grid generated in UTM space (auto-zone), tested
 *   against polygon boundary with ray-casting, back-projected to WGS84.
 * - IDW (Shepard 1968): Z(p) = Σ[zᵢ/dᵢᵖ] / Σ[1/dᵢᵖ], power p = 2 default
 *   Distances computed in metres (UTM) for metric correctness.
 * - Export: ESRI Point Shapefile (ZIP) + Float32 GeoTIFF (WGS84)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// @ts-ignore – shpjs has no bundled types in all versions
import shp from "shpjs";
import { Observation, TipoIntervento } from "./App";
import {
  KmlPolygon, ControlPoint, PolyIdwResult,
  parseKml, computeIdwGrid, downloadShapefile, downloadGeoTiff,
} from "./utils/geoUtils";

// ── Color helpers ─────────────────────────────────────────────────────────────

function doseRgba(dose: number, min: number, max: number, alpha = 0.82): string {
  const t = max > min ? Math.max(0, Math.min(1, (dose - min) / (max - min))) : 0;
  const r = t < 0.5 ? Math.round(22  + (202 - 22)  * t * 2) : 220;
  const g = t < 0.5 ? Math.round(163 + (138 - 163) * t * 2)
                     : Math.round(138 - (138 - 38)  * (t - 0.5) * 2);
  const b = t < 0.5 ? Math.round(74  * (1 - t * 2)) : 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Render IDW grid cells to an offscreen canvas and return a PNG data URL. */
function renderIdwOverlay(result: PolyIdwResult): string {
  const [west, south, east, north] = result.bbox;
  const geoW = east - west  || 0.001;
  const geoH = north - south || 0.001;
  const W = 1024;
  const H = Math.max(1, Math.round(W * geoH / geoW));
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  const { min, max } = result.stats;
  const cW = Math.max(2, (result.cellSizeDeg.lon / geoW) * W + 1.5);
  const cH = Math.max(2, (result.cellSizeDeg.lat / geoH) * H + 1.5);
  for (const g of result.grid) {
    const x = ((g.lng - west)  / geoW) * W;
    const y = ((north - g.lat) / geoH) * H;
    ctx.fillStyle = doseRgba(g.dose, min, max);
    ctx.fillRect(x - cW / 2, y - cH / 2, cW + 0.5, cH + 0.5);
  }
  return canvas.toDataURL("image/png");
}

// ── Leaflet map sub-component ─────────────────────────────────────────────────

function MapView({ result }: { result: PolyIdwResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ lat: number; lng: number; dose: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !result.grid.length) return;
    const [west, south, east, north] = result.bbox;
    const bounds = L.latLngBounds([[south, west], [north, east]]);

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });

    // Satellite basemap — Esri World Imagery (free, no key)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri &mdash; Source: Esri, Maxar, Earthstar Geographics", maxZoom: 22 }
    ).addTo(map);

    // IDW raster overlay
    const dataUrl = renderIdwOverlay(result);
    L.imageOverlay(dataUrl, bounds, { opacity: 0.78, interactive: false }).addTo(map);

    // Polygon outline
    L.polygon(
      result.polygon.ring.map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: "#166534", weight: 2.5, fill: false, dashArray: undefined }
    ).addTo(map);

    // Control points with tooltip
    result.controls.forEach(cp => {
      L.circleMarker([cp.lat, cp.lng], {
        radius: 7, color: "#fff", weight: 2, fillColor: "#1d4ed8", fillOpacity: 1,
      })
        .bindTooltip(`<b>#${cp.obsId}</b><br/>${cp.appezzamento}<br/>${cp.dose.toFixed(1)} kg/ha`, {
          direction: "top", offset: [0, -6],
        })
        .addTo(map);
    });

    map.fitBounds(bounds, { padding: [20, 20] });

    // GIS info on mouse move
    const { cellSizeDeg, grid } = result;
    const halfLat = cellSizeDeg.lat * 0.65;
    const halfLon = cellSizeDeg.lon * 0.65;

    function onMove(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      const cell = grid.find(
        g => Math.abs(g.lat - lat) < halfLat && Math.abs(g.lng - lng) < halfLon
      );
      setHover(cell ? { lat, lng, dose: cell.dose } : null);
    }
    map.on("mousemove", onMove);
    map.on("mouseout", () => setHover(null));

    return () => { map.remove(); };
  }, [result]);

  const { min, max } = result.stats;

  return (
    <div className="relative rounded-xl overflow-hidden border border-stone-200 shadow">
      <div ref={containerRef} className="w-full" style={{ height: 440 }} />

      {/* GIS info tooltip (bottom-left) */}
      {hover ? (
        <div className="absolute bottom-3 left-3 bg-black/75 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-[1000] leading-5">
          <div className="font-mono opacity-80">📍 {hover.lat.toFixed(6)}, {hover.lng.toFixed(6)}</div>
          <div>🌿 Dose IDW: <strong className="text-green-300">{hover.dose.toFixed(1)} kg/ha</strong></div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 bg-black/50 text-white/70 text-[11px] rounded-md px-2 py-1 pointer-events-none z-[1000]">
          Sposta il cursore sulla mappa per i valori
        </div>
      )}

      {/* Color legend (top-right) */}
      <div className="absolute top-3 right-3 bg-white/92 backdrop-blur rounded-lg px-3 py-2.5 z-[1000] shadow-md text-xs min-w-[76px]">
        <div className="font-bold text-stone-600 text-center mb-2 text-[11px]">kg/ha</div>
        {[
          { color: "#dc2626", label: max.toFixed(0), pos: "max" },
          { color: "#f59e0b", label: ((min + max) / 2).toFixed(0), pos: "mid" },
          { color: "#22c55e", label: min.toFixed(0), pos: "min" },
        ].map(({ color, label, pos }) => (
          <div key={pos} className="flex items-center gap-1.5 mb-1">
            <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-white/40" style={{ background: color }} />
            <span className="text-stone-700 font-medium">{label}</span>
          </div>
        ))}
        <div className="border-t border-stone-200 pt-1.5 mt-1 flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white flex-shrink-0" />
          <span className="text-stone-500 text-[10px]">ctrl pt</span>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { osservazioni: Observation[] }

type PointSource = "db" | "shp";

interface ShpRawFeature {
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, unknown>;
}

export function ElaborazioniMappe({ osservazioni }: Props) {
  // KML state
  const [polygons,      setPolygons]      = useState<KmlPolygon[]>([]);
  const [kmlName,       setKmlName]       = useState("");
  const [selPolyIdx,    setSelPolyIdx]    = useState<number | null>(null);

  // Control-point source
  const [pointSource,   setPointSource]   = useState<PointSource>("db");
  const [shpPoints,     setShpPoints]     = useState<ControlPoint[]>([]);
  const [shpFileName,   setShpFileName]   = useState("");
  const [shpFields,     setShpFields]     = useState<string[]>([]);
  const [doseField,     setDoseField]     = useState("");
  const [shpRaw,        setShpRaw]        = useState<ShpRawFeature[]>([]);

  // IDW params
  const [power,         setPower]         = useState(2);

  // Results
  const [results,       setResults]       = useState<Map<number, PolyIdwResult>>(new Map());
  const [computing,     setComputing]     = useState(false);

  // UI
  const [showNotes,     setShowNotes]     = useState(false);

  // GPS-enabled observations
  const gpsObs = useMemo(
    () => osservazioni.filter(o => o.lat != null && o.lng != null),
    [osservazioni]
  );

  // Auto-derive controls for selected polygon (DB source)
  const dbControls = useMemo<ControlPoint[]>(() => {
    if (selPolyIdx === null || !polygons[selPolyIdx]) return [];
    const norm = polygons[selPolyIdx].name.toLowerCase().trim();
    return gpsObs
      .filter(o => {
        const a = o.appezzamento.toLowerCase().trim();
        return a.includes(norm) || norm.includes(a);
      })
      .map(o => ({
        obsId:        o.id,
        cliente:      o.cliente,
        appezzamento: o.appezzamento,
        lng:          o.lng!,
        lat:          o.lat!,
        dose:         o.dose,
      }));
  }, [selPolyIdx, polygons, gpsObs]);

  const activeControls: ControlPoint[] = pointSource === "db" ? dbControls : shpPoints;

  // ── KML upload ──────────────────────────────────────────────────────────────

  const handleKml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKmlName(file.name);
    setResults(new Map());
    const reader = new FileReader();
    reader.onload = ev => {
      const polys = parseKml(ev.target?.result as string);
      setPolygons(polys);
      setSelPolyIdx(polys.length ? 0 : null);
    };
    reader.readAsText(file);
  }, []);

  // ── Shapefile upload ────────────────────────────────────────────────────────

  const handleShp = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShpFileName(file.name);
    setShpPoints([]);
    setShpFields([]);
    setDoseField("");
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const buf = ev.target?.result as ArrayBuffer;
        const raw = await shp(buf);
        const fc  = Array.isArray(raw) ? raw[0] : raw;
        const pts: ShpRawFeature[] = fc.features.filter(
          (f: ShpRawFeature) => f.geometry?.type === "Point"
        );
        if (!pts.length) { alert("Nessun punto trovato nel file."); return; }
        setShpRaw(pts);
        // Detect numeric fields
        const sample = pts[0].properties;
        const numFields = Object.keys(sample).filter(
          k => typeof sample[k] === "number" || !isNaN(Number(sample[k]))
        );
        setShpFields(numFields);
        // Auto-select dose field
        const auto = numFields.find(f =>
          /dose|kgha|kg_ha|azoto|value|valore/i.test(f)
        ) ?? numFields[0] ?? "";
        setDoseField(auto);
      } catch {
        alert("Errore nel caricamento dello Shapefile. Verifica il formato.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Rebuild shpPoints when doseField changes
  useEffect(() => {
    if (!doseField || !shpRaw.length) { setShpPoints([]); return; }
    setShpPoints(
      shpRaw
        .filter(f => {
          const coords = f.geometry.coordinates;
          return typeof coords[0] === "number" && typeof coords[1] === "number";
        })
        .map((f, i) => ({
          obsId:        String(f.properties["ID"] ?? f.properties["id"] ?? i + 1),
          cliente:      String(f.properties["CLIENTE"] ?? f.properties["cliente"] ?? ""),
          appezzamento: String(f.properties["APPEZZ"] ?? f.properties["appezzamento"] ?? ""),
          lng:          f.geometry.coordinates[0],
          lat:          f.geometry.coordinates[1],
          dose:         Number(f.properties[doseField] ?? 0),
        }))
    );
  }, [doseField, shpRaw]);

  // ── IDW computation ─────────────────────────────────────────────────────────

  const runIdw = useCallback(() => {
    if (selPolyIdx === null || !activeControls.length) return;
    setComputing(true);
    setTimeout(() => {
      const poly   = polygons[selPolyIdx];
      const result = computeIdwGrid(poly, activeControls, 10, power);
      setResults(prev => new Map(prev).set(selPolyIdx, result));
      setComputing(false);
    }, 50);
  }, [selPolyIdx, polygons, activeControls, power]);

  const currentResult = selPolyIdx !== null ? results.get(selPolyIdx) : undefined;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Format notes ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
          onClick={() => setShowNotes(n => !n)}
        >
          <span>ℹ️ Note tecniche — Formati di input accettati</span>
          <span className="text-blue-500">{showNotes ? "▲" : "▼"}</span>
        </button>
        {showNotes && (
          <div className="px-5 pb-4 text-sm text-blue-900 space-y-3 border-t border-blue-200 pt-3">
            <div>
              <p className="font-semibold mb-1">🗺 Poligoni (KML)</p>
              <ul className="list-disc ml-4 space-y-0.5 text-blue-800">
                <li>Formato: <code className="bg-blue-100 px-1 rounded">.kml</code> — esportato da Google Earth, QGIS, ArcGIS o dispositivi GPS</li>
                <li>Geometria: Poligoni (<code>Polygon</code>)</li>
                <li>Sistema di riferimento: WGS 84 geografico (EPSG:4326) — coordinate in gradi decimali</li>
                <li>Il campo <strong>Name</strong> del Placemark viene usato per il matching automatico con il campo <em>Appezzamento</em> delle osservazioni</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">📍 Punti di controllo IDW — Shapefile (opzionale)</p>
              <ul className="list-disc ml-4 space-y-0.5 text-blue-800">
                <li>Formato: <code className="bg-blue-100 px-1 rounded">.zip</code> contenente <code>.shp</code>, <code>.dbf</code>, <code>.shx</code> e <code>.prj</code></li>
                <li>Geometria: <strong>Point</strong> (punti singoli)</li>
                <li>Sistema di riferimento: <strong>WGS 84 geografico (EPSG:4326)</strong> — obbligatorio, gradi decimali</li>
                <li>Campi <code>.dbf</code> richiesti: almeno un campo numerico con la <strong>Dose (kg/ha)</strong> da interpolare (es. <code>DOSE</code>, <code>KG_HA</code>)</li>
                <li>Campi opzionali: <code>ID</code>, <code>CLIENTE</code>, <code>APPEZZ</code></li>
                <li>Se è presente il file <code>.prj</code>, la proiezione viene verificata automaticamente</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">📊 Output</p>
              <ul className="list-disc ml-4 space-y-0.5 text-blue-800">
                <li><strong>Shapefile ZIP</strong>: layer Point con la dose IDW su ogni nodo della griglia (WGS84)</li>
                <li><strong>GeoTIFF</strong>: raster Float32 mono-banda, CRS WGS84, NODATA = −9999, compatibile con QGIS/ArcGIS/GDAL</li>
                <li>Griglia: 10 × 10 m in proiezione UTM (zona auto-determinata dal centroide del poligono)</li>
                <li>IDW: metodo di Shepard (1968), potenza p = 2 di default; distanze in metri (UTM)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 1: Polygon KML ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
        <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          <span className="bg-green-800 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">1</span>
          Importa Poligoni (KML)
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="flex-1 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 truncate">
            {kmlName || "Nessun file selezionato"}
          </span>
          <span className="bg-green-800 hover:bg-green-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
            📂 Sfoglia KML
          </span>
          <input type="file" accept=".kml" className="hidden" onChange={handleKml} />
        </label>

        {polygons.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">
              {polygons.length} poligono{polygons.length !== 1 ? "i" : ""} rilevato{polygons.length !== 1 ? "i" : ""}
            </p>
            {polygons.map((p, i) => {
              const matchCount = gpsObs.filter(o => {
                const a = o.appezzamento.toLowerCase().trim();
                const b = p.name.toLowerCase().trim();
                return a.includes(b) || b.includes(a);
              }).length;
              return (
                <button
                  key={i}
                  onClick={() => { setSelPolyIdx(i); setResults(prev => { const m = new Map(prev); return m; }); }}
                  className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border transition-colors ${
                    selPolyIdx === i
                      ? "bg-green-800 text-white border-green-700"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-green-50"
                  }`}
                >
                  <span className="font-medium truncate">{p.name}</span>
                  <span className={`text-xs ml-2 shrink-0 ${selPolyIdx === i ? "text-green-200" : "text-stone-400"}`}>
                    {matchCount} oss. GPS
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Step 2: Control points ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
        <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          <span className="bg-green-800 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">2</span>
          Punti di Controllo IDW
        </h3>

        {/* Source toggle */}
        <div className="flex gap-2 mb-4">
          {(["db", "shp"] as const).map(src => (
            <button
              key={src}
              onClick={() => setPointSource(src)}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg border transition-colors ${
                pointSource === src
                  ? "bg-green-800 text-white border-green-700"
                  : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-green-50"
              }`}
            >
              {src === "db" ? "📊 Da Registro NDVI" : "📁 Da Shapefile esterno"}
            </button>
          ))}
        </div>

        {/* DB source */}
        {pointSource === "db" && (
          <div>
            {gpsObs.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ Nessuna osservazione con coordinate GPS salvate. Salva almeno un'osservazione con GPS abilitato.
              </p>
            ) : selPolyIdx === null ? (
              <p className="text-sm text-stone-400 italic">Seleziona prima un poligono.</p>
            ) : dbControls.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 space-y-1">
                <p>⚠️ Nessuna osservazione GPS corrisponde al poligono <strong>{polygons[selPolyIdx]?.name}</strong>.</p>
                <p className="text-xs text-amber-600">Il matching usa il campo <em>Appezzamento</em>. Verifica che il nome nel KML coincida (anche parzialmente) con quello nel registro.</p>
                <p className="text-xs text-amber-600 mt-1">Oppure usa la sorgente <strong>Shapefile esterno</strong> per caricare i punti manualmente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <th className="px-2 py-1.5 text-left rounded-tl-lg">ID</th>
                      <th className="px-2 py-1.5 text-left">Cliente</th>
                      <th className="px-2 py-1.5 text-left">Appezzamento</th>
                      <th className="px-2 py-1.5 text-right">Lat</th>
                      <th className="px-2 py-1.5 text-right">Lng</th>
                      <th className="px-2 py-1.5 text-right rounded-tr-lg">Dose (kg/ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbControls.map((c, i) => (
                      <tr key={c.obsId} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                        <td className="px-2 py-1.5 font-mono font-semibold text-green-800">{c.obsId}</td>
                        <td className="px-2 py-1.5 truncate max-w-[120px]">{c.cliente}</td>
                        <td className="px-2 py-1.5 truncate max-w-[120px]">{c.appezzamento}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{c.lat.toFixed(6)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{c.lng.toFixed(6)}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-green-800">{c.dose.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SHP source */}
        {pointSource === "shp" && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="flex-1 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 truncate">
                {shpFileName || "Nessun file selezionato (.zip)"}
              </span>
              <span className="bg-green-800 hover:bg-green-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                📂 Sfoglia SHP
              </span>
              <input type="file" accept=".zip" className="hidden" onChange={handleShp} />
            </label>

            {shpFields.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-stone-700 shrink-0">Campo Dose (kg/ha):</label>
                <select
                  value={doseField}
                  onChange={e => setDoseField(e.target.value)}
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {shpFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}

            {shpPoints.length > 0 && (
              <div className="text-xs text-green-800 bg-green-50 rounded-lg px-3 py-2">
                ✅ {shpPoints.length} punti caricati — campo <strong>{doseField}</strong> selezionato come Dose
              </div>
            )}
            {shpPoints.length > 0 && (
              <div className="overflow-x-auto max-h-40 overflow-y-auto border border-stone-100 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-green-800 text-white">
                    <tr>
                      <th className="px-2 py-1.5 text-left">ID</th>
                      <th className="px-2 py-1.5 text-right">Lat</th>
                      <th className="px-2 py-1.5 text-right">Lng</th>
                      <th className="px-2 py-1.5 text-right">Dose (kg/ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shpPoints.slice(0, 100).map((p, i) => (
                      <tr key={p.obsId + i} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                        <td className="px-2 py-1 font-mono">{p.obsId}</td>
                        <td className="px-2 py-1 text-right font-mono">{p.lat.toFixed(6)}</td>
                        <td className="px-2 py-1 text-right font-mono">{p.lng.toFixed(6)}</td>
                        <td className="px-2 py-1 text-right font-bold text-green-800">{p.dose.toFixed(1)}</td>
                      </tr>
                    ))}
                    {shpPoints.length > 100 && (
                      <tr><td colSpan={4} className="px-2 py-1 text-center text-stone-400">
                        … e altri {shpPoints.length - 100} punti
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 3: IDW parameters ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
        <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          <span className="bg-green-800 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">3</span>
          Parametri IDW
        </h3>
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Potenza (p) — esponente distanza
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={5} step={0.5}
                value={power} onChange={e => setPower(Number(e.target.value))}
                className="w-32 accent-green-800"
              />
              <span className="text-lg font-bold text-green-800 w-8">{power}</span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">p = 2 = metodo di Shepard (consigliato)</p>
          </div>
          <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
            <p className="font-semibold text-stone-700 mb-1">Formula applicata:</p>
            <p className="font-mono">Z(p) = Σ[zᵢ/dᵢᵖ] / Σ[1/dᵢᵖ]</p>
            <p className="mt-0.5">Griglia 10 × 10 m in UTM (zona auto)</p>
          </div>
        </div>
      </div>

      {/* ── Step 4: Run ─────────────────────────────────────────────────────── */}
      <button
        onClick={runIdw}
        disabled={computing || selPolyIdx === null || activeControls.length === 0}
        className="w-full bg-green-800 hover:bg-green-900 active:bg-green-950 disabled:bg-stone-300 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-3"
      >
        {computing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Elaborazione in corso…
          </>
        ) : (
          <>🗺 Avvia Elaborazione IDW</>
        )}
      </button>

      {selPolyIdx !== null && activeControls.length === 0 && (
        <p className="text-center text-sm text-amber-700 -mt-3">
          ⚠️ Aggiungi almeno un punto di controllo con coordinate GPS e valore dose.
        </p>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {currentResult && currentResult.grid.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 space-y-4">
          <h3 className="font-bold text-green-900">
            Risultati — {currentResult.polygon.name}
          </h3>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Punti griglia", value: currentResult.stats.count.toLocaleString() },
              { label: "Dose min", value: `${currentResult.stats.min.toFixed(1)} kg/ha` },
              { label: "Dose media", value: `${currentResult.stats.mean.toFixed(1)} kg/ha` },
              { label: "Dose max", value: `${currentResult.stats.max.toFixed(1)} kg/ha` },
            ].map(s => (
              <div key={s.label} className="bg-green-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className="font-bold text-green-900 text-sm">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="text-xs text-stone-400 -mt-1">
            Zona UTM {currentResult.utmZone}{currentResult.utmSouth ? "S" : "N"} ·{" "}
            {currentResult.controls.length} punti di controllo · p = {power}
          </div>

          {/* Leaflet map with satellite basemap */}
          <MapView result={currentResult} />

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => downloadShapefile(currentResult)}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
            >
              📦 Scarica Shapefile (.zip)
            </button>
            <button
              onClick={() => downloadGeoTiff(currentResult)}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
            >
              🌍 Scarica GeoTIFF (.tif)
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Shapefile: layer Point con attributo <code>DOSE_IDW</code> (kg/ha) · WGS84 (EPSG:4326)<br/>
            GeoTIFF: Float32 mono-banda · NODATA = −9999 · leggibile con QGIS, ArcGIS, GDAL
          </p>
        </div>
      )}

      {currentResult && currentResult.grid.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⚠️ Nessun punto griglia generato. Verifica che i punti di controllo siano all'interno o nelle vicinanze del poligono selezionato.
        </div>
      )}
    </div>
  );
}
