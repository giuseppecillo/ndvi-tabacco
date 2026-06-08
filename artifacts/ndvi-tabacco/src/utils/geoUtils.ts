/**
 * geoUtils.ts
 *
 * Scientifically-correct IDW (Inverse Distance Weighting) interpolation
 * of dose values onto a 10×10 m grid inside KML polygon boundaries.
 *
 * Method: Shepard (1968) IDW
 *   Z(p) = Σ [z_i / d_i^power] / Σ [1 / d_i^power]
 *
 * All distances are computed in metric space (UTM) to ensure the
 * 10 m grid spacing is geometrically correct regardless of latitude.
 *
 * CRS pipeline:
 *   KML input           → WGS84 geographic (EPSG:4326)
 *   Grid generation     → UTM (auto-zone, northern/southern hemisphere)
 *   GeoTIFF / Shapefile → WGS84 geographic (EPSG:4326)
 */

import proj4 from "proj4";
import JSZip from "jszip";

// ── Types ────────────────────────────────────────────────────────────────────

export interface KmlPolygon {
  name: string;
  ring: [number, number][]; // [lng, lat] – closed ring in WGS84
}

export interface ControlPoint {
  obsId: string;
  cliente: string;
  appezzamento: string;
  lng: number; // WGS84
  lat: number;
  dose: number; // kg/ha
}

export interface IdwGridPoint {
  lng: number; // WGS84
  lat: number;
  utmX: number; // UTM metres
  utmY: number;
  dose: number; // interpolated dose, kg/ha
}

export interface PolyIdwResult {
  polygon: KmlPolygon;
  controls: ControlPoint[];
  grid: IdwGridPoint[];
  bbox: [number, number, number, number]; // [west, south, east, north] WGS84
  utmZone: number;
  utmSouth: boolean;
  cellSizeDeg: { lon: number; lat: number }; // approximate 10 m in degrees
  stats: { min: number; max: number; mean: number; count: number };
}

// ── KML parser ───────────────────────────────────────────────────────────────

/**
 * Parses a KML string and returns all Placemark polygons (outer boundary only).
 * Handles both KML 2.2 and older formats.
 */
export function parseKml(text: string): KmlPolygon[] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const results: KmlPolygon[] = [];

  doc.querySelectorAll("Placemark").forEach((pm) => {
    // Standard <name> tag first; fall back to SchemaData SimpleData with Name*/name* attribute
    const stdName = pm.querySelector("name")?.textContent?.trim();
    const schemaName = (() => {
      const sds = pm.querySelectorAll("SimpleData");
      for (const sd of Array.from(sds)) {
        const attr = sd.getAttribute("name") ?? "";
        if (/^[Nn]ame/i.test(attr) && sd.textContent?.trim()) return sd.textContent.trim();
      }
      return null;
    })();
    const name = stdName || schemaName || "Senza nome";

    // Try outerBoundaryIs first, then fall back to any LinearRing / coordinates
    const selectors = [
      "outerBoundaryIs coordinates",
      "Polygon outerBoundaryIs LinearRing coordinates",
      "LinearRing coordinates",
      "coordinates",
    ];

    for (const sel of selectors) {
      const el = pm.querySelector(sel);
      if (!el) continue;
      const raw = el.textContent?.trim() ?? "";
      const ring: [number, number][] = [];
      for (const token of raw.split(/\s+/)) {
        const parts = token.split(",");
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lng) && !isNaN(lat)) ring.push([lng, lat]);
        }
      }
      if (ring.length >= 3) {
        results.push({ name, ring });
        break;
      }
    }
  });
  return results;
}

/**
 * Parses a KMZ file (ZIP archive containing a .kml) and returns all polygons.
 * Requires jszip as a peer dependency.
 */
export async function parseKmz(buffer: ArrayBuffer): Promise<KmlPolygon[]> {
  // Dynamic import keeps the bundle lean for users who never load KMZ
  const JSZip = (await import("jszip")).default;
  const zip   = await JSZip.loadAsync(buffer);
  // KMZ spec: the root KML is usually doc.kml; fall back to any .kml entry
  const entry =
    zip.file("doc.kml") ??
    Object.values(zip.files).find(f => !f.dir && f.name.toLowerCase().endsWith(".kml"));
  if (!entry) throw new Error("Nessun file .kml trovato nell'archivio KMZ.");
  const text = await entry.async("string");
  return parseKml(text);
}

/**
 * Parses a Shapefile ZIP (shp + dbf + shx [+ prj]) and returns Polygon /
 * MultiPolygon features as KmlPolygon[].
 *
 * Expects WGS84 (EPSG:4326) coordinates — no reprojection is performed.
 * The polygon name is read from common attribute field names (Name, NOME,
 * DESCRIZIONE, APPEZZ, FIELD1, …); falls back to "Poligono N".
 */
interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    geometry: { type: string; coordinates: unknown } | null;
    properties: Record<string, unknown> | null;
  }>;
}

export async function parseShpPolygons(buffer: ArrayBuffer): Promise<KmlPolygon[]> {
  const shpjs = (await import("shpjs")).default;
  const raw   = await (shpjs as (buf: ArrayBuffer) => Promise<GeoJSONFeatureCollection | GeoJSONFeatureCollection[]>)(buffer);
  const fc: GeoJSONFeatureCollection = Array.isArray(raw) ? raw[0] : raw;

  const nameKeys = ["Name","name","NOME","nome","DESCRIZIONE","descrizione",
                    "APPEZZ","appezzamento","LABEL","label","FIELD1"];

  const polygons: KmlPolygon[] = [];

  fc.features.forEach((feat, fi) => {
    const props = feat.properties ?? {};
    const rawName = nameKeys.reduce<string | null>(
      (acc, k) => acc ?? (props[k] != null ? String(props[k]) : null), null
    ) ?? `Poligono ${fi + 1}`;

    const addRing = (coords: [number, number][], suffix = "") => {
      const ring: [number, number][] = coords.map(([lng, lat]) => [lng, lat]);
      if (ring.length >= 3) polygons.push({ name: `${rawName}${suffix}`, ring });
    };

    const geom = feat.geometry;
    if (!geom) return;

    if (geom.type === "Polygon") {
      addRing(geom.coordinates[0] as [number, number][]);
    } else if (geom.type === "MultiPolygon") {
      (geom.coordinates as [number, number][][][]).forEach((poly, pi) => {
        addRing(poly[0], (geom.coordinates as unknown[]).length > 1 ? ` (${pi + 1})` : "");
      });
    }
  });

  if (!polygons.length) throw new Error("Nessun poligono trovato nello Shapefile.");
  return polygons;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Ray-casting point-in-polygon (Jordan curve theorem). */
function pip(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Returns the proj4 string for the UTM zone covering a given WGS84 longitude/latitude. */
function utmProj(lng: number, lat: number): { proj: string; zone: number; south: boolean } {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const south = lat < 0;
  return {
    zone,
    south,
    proj: `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${south ? " +south" : ""}`,
  };
}

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

function toUTM(proj: string, lng: number, lat: number): [number, number] {
  return proj4(WGS84, proj, [lng, lat]) as [number, number];
}
function toWGS84(proj: string, x: number, y: number): [number, number] {
  return proj4(proj, WGS84, [x, y]) as [number, number];
}

// ── IDW core ─────────────────────────────────────────────────────────────────

/**
 * IDW estimate at a single query point (in UTM metres).
 *
 * @param controls  Array of {utmX, utmY, dose} control points
 * @param qx        Query X (UTM metres)
 * @param qy        Query Y (UTM metres)
 * @param power     Distance-decay exponent (default 2 — Shepard method)
 * @returns         Estimated dose value (kg/ha)
 */
function idwAt(
  controls: { utmX: number; utmY: number; dose: number }[],
  qx: number,
  qy: number,
  power: number,
): number {
  let wSum = 0;
  let wzSum = 0;
  for (const c of controls) {
    const d = Math.hypot(c.utmX - qx, c.utmY - qy); // Euclidean distance in metres
    if (d < 1e-3) return c.dose; // coincident point → exact value
    const w = 1 / Math.pow(d, power);
    wSum += w;
    wzSum += w * c.dose;
  }
  return wSum > 0 ? wzSum / wSum : 0;
}

// ── Main IDW grid computation ─────────────────────────────────────────────────

/**
 * Generates a regular 10 × 10 m grid inside `polygon` (in UTM space),
 * interpolates dose values at each grid node using IDW from `controls`,
 * and returns the full result including per-node WGS84 coordinates.
 *
 * @param polygon   KML polygon (WGS84)
 * @param controls  Observation control points with GPS + dose values
 * @param cellSize  Grid spacing in metres (default 10)
 * @param power     IDW power parameter (default 2)
 */
export function computeIdwGrid(
  polygon: KmlPolygon,
  controls: ControlPoint[],
  cellSize = 10,
  power = 2,
): PolyIdwResult {
  const empty = (msg?: string): PolyIdwResult => ({
    polygon, controls, grid: [],
    bbox: [0, 0, 0, 0], utmZone: 0, utmSouth: false,
    cellSizeDeg: { lon: 0, lat: 0 },
    stats: { min: 0, max: 0, mean: 0, count: 0 },
  });

  if (controls.length === 0) return empty();

  // Bounding box in WGS84
  const lngs = polygon.ring.map(c => c[0]);
  const lats  = polygon.ring.map(c => c[1]);
  const west  = Math.min(...lngs);
  const east  = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const bbox: [number, number, number, number] = [west, south, east, north];

  const cLng = (west + east) / 2;
  const cLat = (south + north) / 2;
  const { proj, zone, south: isSouth } = utmProj(cLng, cLat);

  // Project control points to UTM
  const utmControls = controls.map(c => ({
    ...c,
    ...(() => { const [x, y] = toUTM(proj, c.lng, c.lat); return { utmX: x, utmY: y }; })(),
  }));

  // UTM bounding box (project all ring vertices)
  const utmRing = polygon.ring.map(([lng, lat]) => toUTM(proj, lng, lat));
  const utmXs   = utmRing.map(p => p[0]);
  const utmYs   = utmRing.map(p => p[1]);
  const utmW    = Math.min(...utmXs);
  const utmE    = Math.max(...utmXs);
  const utmS    = Math.min(...utmYs);
  const utmN    = Math.max(...utmYs);

  // Generate grid nodes (cell centres) and filter by polygon
  const grid: IdwGridPoint[] = [];
  for (let y = utmS + cellSize / 2; y <= utmN; y += cellSize) {
    for (let x = utmW + cellSize / 2; x <= utmE; x += cellSize) {
      const [lng, lat] = toWGS84(proj, x, y);
      if (!pip(lng, lat, polygon.ring)) continue;
      const dose = idwAt(utmControls, x, y, power);
      grid.push({ lng, lat, utmX: x, utmY: y, dose });
    }
  }

  // Summary statistics
  const doses = grid.map(g => g.dose);
  const min  = doses.length ? Math.min(...doses) : 0;
  const max  = doses.length ? Math.max(...doses) : 0;
  const mean = doses.length ? doses.reduce((a, b) => a + b, 0) / doses.length : 0;

  // Approximate cell size in degrees for GeoTIFF pixel scale
  const latRes = cellSize / 111_319.9;                                      // deg lat per cell
  const lonRes = cellSize / (111_319.9 * Math.cos(cLat * Math.PI / 180)); // deg lon per cell

  return {
    polygon, controls, grid, bbox,
    utmZone: zone, utmSouth: isSouth,
    cellSizeDeg: { lon: lonRes, lat: latRes },
    stats: { min, max, mean, count: grid.length },
  };
}

// ── Shapefile writer (ESRI Point Shapefile) ───────────────────────────────────

function shp(pts: { lng: number; lat: number }[]): ArrayBuffer {
  const n   = pts.length;
  const len = 100 + n * 28; // 100-byte header + n × (8 rec header + 20 point)
  const buf = new ArrayBuffer(len);
  const v   = new DataView(buf);

  v.setInt32(0, 9994, false);        // file code (big-endian)
  v.setInt32(24, len / 2, false);    // file length in 16-bit words (big-endian)
  v.setInt32(28, 1000, true);        // version
  v.setInt32(32, 1, true);           // shape type: Point

  const xs = pts.map(p => p.lng), ys = pts.map(p => p.lat);
  v.setFloat64(36, Math.min(...xs), true);
  v.setFloat64(44, Math.min(...ys), true);
  v.setFloat64(52, Math.max(...xs), true);
  v.setFloat64(60, Math.max(...ys), true);

  let off = 100;
  for (let i = 0; i < n; i++, off += 28) {
    v.setInt32(off,      i + 1, false); // record number (big-endian, 1-based)
    v.setInt32(off + 4,  10,    false); // content length in 16-bit words = 20 bytes
    v.setInt32(off + 8,  1,     true);  // shape type: Point
    v.setFloat64(off + 12, pts[i].lng, true);
    v.setFloat64(off + 20, pts[i].lat, true);
  }
  return buf;
}

function shx(n: number): ArrayBuffer {
  const buf = new ArrayBuffer(100 + n * 8);
  const v   = new DataView(buf);
  v.setInt32(0, 9994, false);
  v.setInt32(24, (100 + n * 8) / 2, false);
  v.setInt32(28, 1000, true);
  v.setInt32(32, 1, true);
  for (let i = 0; i < n; i++) {
    v.setInt32(100 + i * 8,     (100 + i * 28) / 2, false); // offset in words
    v.setInt32(100 + i * 8 + 4, 10, false);                  // content length
  }
  return buf;
}

type DbfRow = { polygon: string; lat: number; lng: number; dose: number };

function dbf(rows: DbfRow[]): ArrayBuffer {
  const fields = [
    { name: "POLYGON",  type: "C", len: 64, dec: 0 },
    { name: "LAT",      type: "N", len: 14, dec: 8 },
    { name: "LNG",      type: "N", len: 14, dec: 8 },
    { name: "DOSE_IDW", type: "N", len: 12, dec: 4 },
  ];
  const headerLen = 32 + fields.length * 32 + 1;
  const recLen    = 1 + fields.reduce((s, f) => s + f.len, 0);
  const buf = new ArrayBuffer(headerLen + rows.length * recLen);
  const u8  = new Uint8Array(buf);
  const v   = new DataView(buf);
  const enc = new TextEncoder();

  const ws = (off: number, s: string, len: number, pad = 0x20) => {
    const b = enc.encode(s.slice(0, len));
    u8.set(b, off);
    u8.fill(pad, off + b.length, off + len);
  };

  v.setUint8(0, 0x03);
  const d = new Date();
  v.setUint8(1, d.getFullYear() - 1900);
  v.setUint8(2, d.getMonth() + 1);
  v.setUint8(3, d.getDate());
  v.setInt32(4, rows.length, true);
  v.setInt16(8, headerLen, true);
  v.setInt16(10, recLen, true);

  let p = 32;
  for (const f of fields) {
    ws(p, f.name, 11, 0x00);
    u8[p + 11] = f.type.charCodeAt(0);
    v.setUint8(p + 16, f.len);
    v.setUint8(p + 17, f.dec);
    p += 32;
  }
  u8[p++] = 0x0d; // header terminator

  for (const row of rows) {
    u8[p++] = 0x20; // not deleted
    ws(p, row.polygon,                    64); p += 64;
    ws(p, row.lat.toFixed(8).padStart(14), 14); p += 14;
    ws(p, row.lng.toFixed(8).padStart(14), 14); p += 14;
    ws(p, row.dose.toFixed(4).padStart(12), 12); p += 12;
  }
  return buf;
}

const PRJ_WGS84 =
  `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,` +
  `298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;

/** Packages the IDW grid points as an ESRI Point Shapefile ZIP and triggers download. */
export async function downloadShapefile(result: PolyIdwResult): Promise<void> {
  const base = result.polygon.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  const pts  = result.grid.map(g => ({ lng: g.lng, lat: g.lat }));
  const rows = result.grid.map(g => ({
    polygon: result.polygon.name,
    lat: g.lat, lng: g.lng, dose: g.dose,
  }));

  const zip = new JSZip();
  zip.file(`${base}.shp`, shp(pts));
  zip.file(`${base}.shx`, shx(pts.length));
  zip.file(`${base}.dbf`, dbf(rows));
  zip.file(`${base}.prj`, PRJ_WGS84);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  trigger(URL.createObjectURL(blob), `${base}_idw.zip`);
}

// ── GeoTIFF writer (Float32, WGS84, single-band) ─────────────────────────────
//
// TIFF format reference: TIFF Revision 6.0 + GeoTIFF 1.0 specification.
//
// Layout (little-endian):
//   [0]  TIFF header (8 bytes)
//   [8]  IFD: 2 + N×12 + 4 bytes
//   [*]  Extra data (doubles, shorts, ASCII for GDAL_NODATA tag)
//   [*]  Float32 image strip (row-major, north→south)

const NODATA = -9999;

export function downloadGeoTiff(result: PolyIdwResult): void {
  const { bbox, grid, cellSizeDeg, polygon } = result;
  const [west, south, east, north] = bbox;
  const { lon: csLon, lat: csLat } = cellSizeDeg;

  if (csLon <= 0 || csLat <= 0) return;

  const cols = Math.max(1, Math.ceil((east  - west)  / csLon));
  const rows = Math.max(1, Math.ceil((north - south) / csLat));

  // Rasterise IDW grid onto a Float32 array (row 0 = north)
  const data = new Float32Array(cols * rows).fill(NODATA);
  for (const g of grid) {
    const col = Math.floor((g.lng - west)  / csLon);
    const row = Math.floor((north - g.lat) / csLat);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      // Keep the higher dose if two points map to the same pixel (conservative)
      if (data[idx] === NODATA || g.dose > data[idx]) data[idx] = g.dose;
    }
  }

  // ── Binary layout ──────────────────────────────────────────────────────────
  const nodataStr   = `${NODATA}\0`;
  const nodataBytes = new TextEncoder().encode(nodataStr);
  const pixelScale  = new Float64Array([csLon, csLat, 0]);     // 24 B
  const tiepoint    = new Float64Array([0, 0, 0, west, north, 0]); // 48 B
  // GeoKey directory: version header + 3 keys × 4 shorts
  const geoKey      = new Uint16Array([
    1, 1, 0, 3,          // KeyDirectoryVersion, Revision, Minor, NumKeys
    1024, 0, 1, 2,       // GTModelTypeGeoKey = Geographic (2D)
    1025, 0, 1, 1,       // GTRasterTypeGeoKey = PixelIsArea
    2048, 0, 1, 4326,    // GeographicTypeGeoKey = WGS 84
  ]);                                                             // 32 B

  const NUM_IFD = 15;
  const ifdOff  = 8;
  const ifdLen  = 2 + NUM_IFD * 12 + 4;
  let   extraOff = ifdOff + ifdLen;

  const psOff  = extraOff; extraOff += 24;
  const tpOff  = extraOff; extraOff += 48;
  const gkOff  = extraOff; extraOff += 32;
  const ndOff  = extraOff; extraOff += nodataBytes.length;
  const imgOff = (extraOff + 3) & ~3; // 4-byte aligned

  const total  = imgOff + data.byteLength;
  const buf    = new ArrayBuffer(total);
  const u8     = new Uint8Array(buf);
  const view   = new DataView(buf);

  // TIFF header (8 bytes)
  view.setUint16(0, 0x4949, false); // "II" = little-endian
  view.setUint16(2, 42, true);       // TIFF magic
  view.setUint32(4, ifdOff, true);   // offset to first IFD

  // IFD
  let p = ifdOff;
  view.setUint16(p, NUM_IFD, true); p += 2;

  const e = (tag: number, type: number, count: number, val: number) => {
    view.setUint16(p,     tag,   true);
    view.setUint16(p + 2, type,  true);
    view.setUint32(p + 4, count, true);
    view.setUint32(p + 8, val,   true);
    p += 12;
  };
  // IFD entries must be in ascending tag order
  e(256,   4, 1, cols);                    // ImageWidth   (LONG)
  e(257,   4, 1, rows);                    // ImageLength  (LONG)
  e(258,   3, 1, 32);                      // BitsPerSample = 32 (SHORT)
  e(259,   3, 1, 1);                       // Compression  = None
  e(262,   3, 1, 1);                       // PhotometricInterp = MinIsBlack
  e(273,   4, 1, imgOff);                  // StripOffsets
  e(277,   3, 1, 1);                       // SamplesPerPixel = 1
  e(278,   4, 1, rows);                    // RowsPerStrip = all rows (single strip)
  e(279,   4, 1, data.byteLength);         // StripByteCounts
  e(284,   3, 1, 1);                       // PlanarConfig = Chunky
  e(339,   3, 1, 3);                       // SampleFormat = IEEE floating point
  e(33550, 12, 3, psOff);                  // ModelPixelScaleTag  DOUBLE[3]
  e(33922, 12, 6, tpOff);                  // ModelTiepointTag    DOUBLE[6]
  e(34735, 3,  16, gkOff);                 // GeoKeyDirectoryTag  SHORT[16]
  e(42113, 2,  nodataBytes.length, ndOff); // GDAL_NODATA         ASCII
  view.setUint32(p, 0, true);              // next IFD = 0 (last)

  // Extra data
  u8.set(new Uint8Array(pixelScale.buffer), psOff);
  u8.set(new Uint8Array(tiepoint.buffer),   tpOff);
  u8.set(new Uint8Array(geoKey.buffer),     gkOff);
  u8.set(nodataBytes,                       ndOff);
  u8.set(new Uint8Array(data.buffer),       imgOff);

  const base = polygon.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  trigger(URL.createObjectURL(new Blob([buf], { type: "image/tiff" })), `${base}_idw.tif`);
}

// ── CSV export of raw observations ───────────────────────────────────────────

export function exportObservationsCsv(
  osservazioni: {
    id: string; data: string; dataTrapianto: string;
    tipoIntervento: string; giorni: number;
    cliente: string; appezzamento: string; varieta: string;
    n1: number; n2: number; n3: number; n4: number; n5: number;
    media: number; ottimale: number; discostamento: number; dose: number;
    lat: number | null; lng: number | null;
  }[],
): void {
  const header = [
    "ID","Data","Trapianto","Tipo","Giorni",
    "Cliente","Appezzamento","Varieta",
    "M1","M2","M3","M4","M5",
    "Media_NDVI","NDVI_Ottimale","Discostamento","Dose_kg_ha",
    "Lat_WGS84","Lng_WGS84",
  ];
  const rows = osservazioni.map(o => [
    o.id, o.data, o.dataTrapianto, o.tipoIntervento, o.giorni,
    `"${o.cliente}"`, `"${o.appezzamento}"`, `"${o.varieta}"`,
    o.n1, o.n2, o.n3, o.n4, o.n5,
    o.media.toFixed(4), o.ottimale.toFixed(4), o.discostamento.toFixed(4), o.dose.toFixed(2),
    o.lat ?? "", o.lng ?? "",
  ]);
  const csv  = [header, ...rows].map(r => r.join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  trigger(
    URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })),
    `osservazioni_ndvi_${date}.csv`,
  );
}

// ── Internal helper ──────────────────────────────────────────────────────────

function trigger(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
