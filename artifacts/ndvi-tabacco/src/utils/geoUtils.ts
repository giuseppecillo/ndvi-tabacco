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
import { formatRecordedDose, usesTenthsDose } from "./observationDose";
import { readShpLayers } from "./shapefileImport";
import { checkGisFileSize, checkGisCount, readBoundedZip } from "./gisLimits";
import { conservativeIdwValue, conservativeFloat32, formatIdwValue, IDW_DECIMALS } from "./idwPrecision";
import { estimateIdwWorkload } from "./idwLimits";

// ── Types ────────────────────────────────────────────────────────────────────

export interface KmlPolygon {
  name: string;
  sourceLayer?: string;
  sourceId?: string | number;
  ring: [number, number][]; // [lng, lat] – closed ring in WGS84
  holes?: [number, number][][]; // excluded interior rings; absent in legacy polygons
}

export interface ControlPoint {
  obsId: string;
  coltura?: string;
  sourceLayer?: string;
  cliente: string;
  appezzamento: string;
  lng: number; // WGS84
  lat: number;
  dose: number; // kg/ha
  azotoTotale?: number; // planned nitrogen, kg/ha
  azotoGiaDistribuito?: number; // nitrogen already applied, kg/ha
}

export interface IdwGridPoint {
  lng: number; // WGS84
  lat: number;
  utmX: number; // UTM metres
  utmY: number;
  dose: number; // interpolated dose, kg/ha
  azotoTotale?: number; // interpolated planned nitrogen, kg/ha
  azotoGiaDistribuito?: number; // interpolated nitrogen already applied, kg/ha
}

export interface NitrogenSummary {
  areaHa: number;
  plannedPerHa: number;
  indicatedPerHa: number;
  savedPerHa: number;
  savedPercent: number;
  plannedTotalKg: number;
  indicatedTotalKg: number;
  savedTotalKg: number;
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
  nitrogenSummary?: NitrogenSummary;
}

/** Pick an interpolated grid cell, never extrapolate a dose outside the field. */
export function findDoseCell(result: PolyIdwResult, lng: number, lat: number): IdwGridPoint | undefined {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !pointInField(lng, lat, result.polygon)) return undefined;
  const proj = `+proj=utm +zone=${result.utmZone} ${result.utmSouth ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
  const [x, y] = toUTM(proj, lng, lat);
  let selected: IdwGridPoint | undefined;
  let distance = Infinity;
  for (const cell of result.grid) {
    const d = (cell.utmX - x) ** 2 + (cell.utmY - y) ** 2;
    if (d < distance && Number.isFinite(cell.dose)) {
      distance = d;
      selected = cell;
    }
  }
  return selected;
}

// ── KML parser ───────────────────────────────────────────────────────────────

/**
 * Parses KML polygons, preserving each polygon's outer and inner boundaries.
 * Handles both KML 2.2 and older formats.
 */
export function parseKml(text: string): KmlPolygon[] {
  checkGisFileSize(new TextEncoder().encode(text).byteLength);
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.getElementsByTagNameNS("*", "parsererror").length) throw new Error("Invalid KML XML");
  const results: KmlPolygon[] = [];
  let vertices = 0;
  checkGisCount(doc.getElementsByTagNameNS("*", "Folder").length, "layers");
  checkGisCount(doc.getElementsByTagNameNS("*", "Polygon").length, "features");
  const elements = (parent: Document | Element, name: string): Element[] =>
    Array.from(parent.getElementsByTagNameNS("*", name));
  const readRing = (boundary: Element): [number, number][] => {
    const text = elements(boundary, "coordinates")[0]?.textContent?.trim() ?? "";
    const tokens = text.split(/\s+/);
    vertices += tokens.length;
    checkGisCount(vertices, "vertices");
    const ring = tokens.map(token => {
      const [lng, lat] = token.split(",");
      return [lng?.trim() ? Number(lng) : NaN, lat?.trim() ? Number(lat) : NaN] as [number, number];
    });
    // Never silently drop a malformed hole and turn excluded land into cropland.
    if (ring.length < 3 || ring.some(([lng, lat]) =>
      !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90)) {
      throw new Error("Invalid KML polygon ring");
    }
    return ring;
  };

  elements(doc, "Placemark").forEach((pm) => {
    // Standard <name> tag first; fall back to SchemaData SimpleData with Name*/name* attribute
    const stdName = elements(pm, "name")[0]?.textContent?.trim();
    const schemaName = (() => {
      const sds = elements(pm, "SimpleData");
      for (const sd of Array.from(sds)) {
        const attr = sd.getAttribute("name") ?? "";
        if (/^[Nn]ame/i.test(attr) && sd.textContent?.trim()) return sd.textContent.trim();
      }
      return null;
    })();
    const name = stdName || schemaName || "Senza nome";

    for (const poly of elements(pm, "Polygon")) {
      const outer = elements(poly, "outerBoundaryIs")[0];
      if (!outer) throw new Error("Missing KML outer boundary");
      const holes = elements(poly, "innerBoundaryIs").map(readRing);
      results.push({ name, ring: readRing(outer), ...(holes.length ? { holes } : {}) });
    }
  });
  return results;
}

/**
 * Parses a KMZ file (ZIP archive containing a .kml) and returns all polygons.
 * Requires jszip as a peer dependency.
 */
export async function parseKmz(buffer: ArrayBuffer): Promise<KmlPolygon[]> {
  const files = await readBoundedZip(buffer);
  // KMZ spec: the root KML is usually doc.kml; fall back to any .kml entry
  const entry =
    files.get("doc.kml") ??
    [...files].find(([name]) => name.toLowerCase().endsWith(".kml"))?.[1];
  if (!entry) throw new Error("Nessun file .kml trovato nell'archivio KMZ.");
  const text = new TextDecoder().decode(entry);
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
export async function parseShpPolygons(buffer: ArrayBuffer): Promise<KmlPolygon[]> {
  const layers = await readShpLayers(buffer);

  const nameKeys = ["Name","name","NOME","nome","DESCRIZIONE","descrizione",
                    "APPEZZ","appezzamento","LABEL","label","FIELD1"];

  const polygons: KmlPolygon[] = [];

  layers.forEach(layer => layer.features.forEach((feat, fi) => {
    const props = feat.properties ?? {};
    const rawName = nameKeys.reduce<string | null>(
      (acc, k) => acc ?? (props[k] != null ? String(props[k]) : null), null
    ) ?? `Poligono ${fi + 1}`;

    const addPolygon = (coords: [number, number][][], suffix = "") => {
      checkGisCount(polygons.length + 1, "features");
      const [ring, ...holes] = coords.map(r => r.map(([lng, lat]) => [lng, lat] as [number, number]));
      if (!ring || [ring, ...holes].some(r => r.length < 3 || r.some(([lng, lat]) =>
        !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90))) {
        throw new Error("Invalid Shapefile polygon ring");
      }
      polygons.push({ name: `${rawName}${suffix}`, sourceLayer: layer.name,
        sourceId: feat.id ?? (props.ID as string | number | undefined) ??
          (props.id as string | number | undefined) ?? fi + 1,
        ring, ...(holes.length ? { holes } : {}) });
    };

    const geom = feat.geometry;
    if (!geom) return;

    if (geom.type === "Polygon") {
      const coords = geom.coordinates as [number, number][][];
      addPolygon(coords);
    } else if (geom.type === "MultiPolygon") {
      (geom.coordinates as [number, number][][][]).forEach((poly, pi) => {
        addPolygon(poly, (geom.coordinates as unknown[]).length > 1 ? ` (${pi + 1})` : "");
      });
    }
  }));

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

/** Includes ring edges, so a hole's boundary never receives a dose. */
function onRing(lng: number, lat: number, ring: [number, number][]): boolean {
  const epsilon = 1e-10; // coordinate tolerance in degrees
  return ring.some(([x, y], i) => {
    const [xx, yy] = ring[(i + 1) % ring.length];
    const length = Math.hypot(xx - x, yy - y);
    if (!length) return Math.hypot(lng - x, lat - y) <= epsilon;
    return Math.abs((lng - x) * (yy - y) - (lat - y) * (xx - x)) <= epsilon * length &&
      lng >= Math.min(x, xx) - epsilon && lng <= Math.max(x, xx) + epsilon &&
      lat >= Math.min(y, yy) - epsilon && lat <= Math.max(y, yy) + epsilon;
  });
}

function inHole(lng: number, lat: number, polygon: KmlPolygon): boolean {
  return (polygon.holes ?? []).some(ring => pip(lng, lat, ring) || onRing(lng, lat, ring));
}

export function pointInField(lng: number, lat: number, polygon: KmlPolygon): boolean {
  return pip(lng, lat, polygon.ring) && !inHole(lng, lat, polygon);
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
  // Algebraically identical IDW, anchored to preserve constant fields exactly
  // and reduce cancellation before conservative decimal quantisation.
  const anchor = controls[0]?.dose ?? 0;
  for (const c of controls) {
    const d = Math.hypot(c.utmX - qx, c.utmY - qy); // Euclidean distance in metres
    if (d < 1e-3) return c.dose; // coincident point → exact value
    const w = 1 / Math.pow(d, power);
    wSum += w;
    wzSum += w * (c.dose - anchor);
  }
  return wSum > 0 ? anchor + wzSum / wSum : 0;
}

function polygonAreaM2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    twiceArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(twiceArea) / 2;
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
  // Enforce for every caller, not just the UI. Never truncate a prescription.
  estimateIdwWorkload(polygon, controls, cellSize, power);
  // Keep the established treatment of external controls, but never interpolate
  // from measurements belonging to explicitly excluded interior areas.
  controls = controls.filter(c => !inHole(c.lng, c.lat, polygon));
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
  const utmHoles = (polygon.holes ?? []).map(ring => ring.map(([lng, lat]) => toUTM(proj, lng, lat)));
  const utmXs   = utmRing.map(p => p[0]);
  const utmYs   = utmRing.map(p => p[1]);
  const utmW    = Math.min(...utmXs);
  const utmE    = Math.max(...utmXs);
  const utmS    = Math.min(...utmYs);
  const utmN    = Math.max(...utmYs);
  const areaHa  = Math.max(0, polygonAreaM2(utmRing) -
    utmHoles.reduce((sum, ring) => sum + polygonAreaM2(ring), 0)) / 10_000;
  // A partial budget must not become a cap for controls lacking a budget.
  // Missing applied N retains the established meaning of zero; invalid N does not.
  const completePlan = utmControls.every(c =>
    c.azotoTotale != null && Number.isFinite(c.azotoTotale) && c.azotoTotale >= 0 &&
    Number.isFinite(c.azotoGiaDistribuito ?? 0) && (c.azotoGiaDistribuito ?? 0) >= 0);
  const planControls = (completePlan ? utmControls : [])
    .map(c => ({ utmX: c.utmX, utmY: c.utmY, dose: c.azotoTotale! }));
  const distributedControls = (completePlan ? utmControls : [])
    .map(c => ({
      utmX: c.utmX,
      utmY: c.utmY,
      dose: Math.max(0, c.azotoGiaDistribuito ?? 0),
    }));

  // Generate grid nodes (cell centres) and filter by polygon
  const grid: IdwGridPoint[] = [];
  for (let y = utmS + cellSize / 2; y <= utmN; y += cellSize) {
    for (let x = utmW + cellSize / 2; x <= utmE; x += cellSize) {
      const [lng, lat] = toWGS84(proj, x, y);
      if (!pointInField(lng, lat, polygon)) continue;
      const rawDose = idwAt(utmControls, x, y, power);
      const azotoTotale = planControls.length ? idwAt(planControls, x, y, power) : undefined;
      const azotoGiaDistribuito = distributedControls.length
        ? idwAt(distributedControls, x, y, power)
        : undefined;
      // Same controls, distances and weights for dose and budget, regardless of crop.
      // Cap historical over-budget controls only in this derived result.
      const residual = azotoTotale != null && azotoGiaDistribuito != null
        ? Math.max(0, azotoTotale - azotoGiaDistribuito) : Infinity;
      const dose = conservativeIdwValue(Math.min(rawDose, residual));
      grid.push({ lng, lat, utmX: x, utmY: y, dose, azotoTotale, azotoGiaDistribuito });
    }
  }

  // Summary statistics
  const doses = grid.map(g => g.dose);
  const min  = doses.length ? Math.min(...doses) : 0;
  const max  = doses.length ? Math.max(...doses) : 0;
  const mean = doses.length ? doses.reduce((a, b) => a + b, 0) / doses.length : 0;
  const plannedValues = grid
    .map(g => g.azotoTotale)
    .filter((value): value is number => value != null);
  const plannedPerHa = plannedValues.length
    ? plannedValues.reduce((sum, value) => sum + value, 0) / plannedValues.length
    : 0;
  const distributedValues = grid
    .map(g => g.azotoGiaDistribuito)
    .filter((value): value is number => value != null);
  const distributedPerHa = distributedValues.length
    ? distributedValues.reduce((sum, value) => sum + value, 0) / distributedValues.length
    : 0;
  const indicatedPerHa = distributedPerHa + mean;
  const savedPerHa = Math.max(0, plannedPerHa - indicatedPerHa);
  const savedPercent = plannedPerHa > 0 ? (savedPerHa / plannedPerHa) * 100 : 0;
  // A partial baseline would compare doses from all observations with a plan
  // inferred from only some of them. Keep the map, but never invent savings.
  const nitrogenSummary = completePlan && plannedValues.length && areaHa > 0 ? {
    areaHa,
    plannedPerHa,
    indicatedPerHa,
    savedPerHa,
    savedPercent,
    plannedTotalKg: plannedPerHa * areaHa,
    indicatedTotalKg: indicatedPerHa * areaHa,
    savedTotalKg: savedPerHa * areaHa,
  } : undefined;

  // Approximate cell size in degrees for GeoTIFF pixel scale
  const latRes = cellSize / 111_319.9;                                      // deg lat per cell
  const lonRes = cellSize / (111_319.9 * Math.cos(cLat * Math.PI / 180)); // deg lon per cell

  return {
    polygon, controls, grid, bbox,
    utmZone: zone, utmSouth: isSouth,
    cellSizeDeg: { lon: lonRes, lat: latRes },
    stats: { min, max, mean, count: grid.length },
    nitrogenSummary,
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

type DbfRow = {
  polygon: string;
  lat: number;
  lng: number;
  dose: number;
  summary?: NitrogenSummary;
};

function dbf(rows: DbfRow[]): ArrayBuffer {
  const fields = [
    { name: "POLYGON",  type: "C", len: 64, dec: 0 },
    { name: "LAT",      type: "N", len: 14, dec: 8 },
    { name: "LNG",      type: "N", len: 14, dec: 8 },
    { name: "DOSE_IDW", type: "N", len: 12, dec: 4 },
    { name: "AREA_HA",   type: "N", len: 12, dec: 2 },
    { name: "N_PLAN_HA", type: "N", len: 12, dec: IDW_DECIMALS },
    { name: "N_IDW_HA",  type: "N", len: 12, dec: IDW_DECIMALS },
    { name: "N_SAVE_HA", type: "N", len: 12, dec: IDW_DECIMALS },
    { name: "N_PLAN_KG", type: "N", len: 14, dec: IDW_DECIMALS },
    { name: "N_IDW_KG",  type: "N", len: 14, dec: IDW_DECIMALS },
    { name: "N_SAVE_KG", type: "N", len: 14, dec: IDW_DECIMALS },
  ];
  const headerLen = 32 + fields.length * 32 + 1;
  const recLen    = 1 + fields.reduce((s, f) => s + f.len, 0);
  const buf = new ArrayBuffer(headerLen + rows.length * recLen);
  const u8  = new Uint8Array(buf);
  const v   = new DataView(buf);
  const enc = new TextEncoder();

  const ws = (off: number, s: string, len: number, pad = 0x20) => {
    const target = u8.subarray(off, off + len);
    target.fill(pad);
    enc.encodeInto(s, target);
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
    ws(p, formatIdwValue(row.dose).padStart(12), 12); p += 12;
    const summaryValues = row.summary
      ? [
          [row.summary.areaHa, 12, 2],
          [row.summary.plannedPerHa, 12, 1],
          [row.summary.indicatedPerHa, 12, 1],
          [row.summary.savedPerHa, 12, 1],
          [row.summary.plannedTotalKg, 14, 1],
          [row.summary.indicatedTotalKg, 14, 1],
          [row.summary.savedTotalKg, 14, 1],
        ] as const
      : [
          [null, 12, 0], [null, 12, 0], [null, 12, 0], [null, 12, 0],
          [null, 14, 0], [null, 14, 0], [null, 14, 0],
        ] as const;
    for (const [value, len, decimals] of summaryValues) {
      ws(p, value == null ? "" : (decimals === 2 ? value.toFixed(2) : formatIdwValue(value)).padStart(len), len);
      p += len;
    }
  }
  return buf;
}

function nitrogenSummaryCsv(summary: NitrogenSummary): string {
  const decimal = (value: number, digits: number) =>
    (digits === 2 ? value.toFixed(2) : formatIdwValue(value)).replace(".", ",");
  return [
    "Scenario;Superficie (ha);kg N/ha;kg N totali",
    `Azoto previsto dal piano;${decimal(summary.areaHa, 2)};${decimal(summary.plannedPerHa, 1)};${decimal(summary.plannedTotalKg, 1)}`,
    `Azoto indicato dalla IDW;${decimal(summary.areaHa, 2)};${decimal(summary.indicatedPerHa, 1)};${decimal(summary.indicatedTotalKg, 1)}`,
    `Risparmio stimato;${decimal(summary.areaHa, 2)};${decimal(summary.savedPerHa, 1)};${decimal(summary.savedTotalKg, 1)}`,
  ].join("\r\n");
}

function nitrogenSummaryDescription(summary?: NitrogenSummary): string {
  if (!summary) return "Mappa IDW - dose di azoto (kg N/ha)";
  return [
    "Mappa IDW - dose di azoto (kg N/ha)",
    `Superficie: ${summary.areaHa.toFixed(2)} ha`,
    `Piano N: ${formatIdwValue(summary.plannedPerHa)} kg N/ha; ${formatIdwValue(summary.plannedTotalKg)} kg N totali`,
    `Indicazione IDW: ${formatIdwValue(summary.indicatedPerHa)} kg N/ha; ${formatIdwValue(summary.indicatedTotalKg)} kg N totali`,
    `Risparmio stimato: ${formatIdwValue(summary.savedPerHa)} kg N/ha; ${formatIdwValue(summary.savedTotalKg)} kg N totali`,
  ].join("\n");
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
    summary: result.nitrogenSummary,
  }));

  const zip = new JSZip();
  zip.file(`${base}.shp`, shp(pts));
  zip.file(`${base}.shx`, shx(pts.length));
  zip.file(`${base}.dbf`, dbf(rows));
  zip.file(`${base}.prj`, PRJ_WGS84);
  if (result.nitrogenSummary) {
    zip.file(`${base}_riepilogo_azoto.csv`, `\uFEFF${nitrogenSummaryCsv(result.nitrogenSummary)}`);
  }

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
      // Raster pixels differ from the UTM grid: mask their own centres too,
      // rather than letting a neighbouring valid node colour an excluded area.
      if (!pointInField(west + (col + 0.5) * csLon, north - (row + 0.5) * csLat, polygon)) continue;
      const idx = row * cols + col;
      // Geographic raster collisions: never exceed any contributing UTM cell.
      const dose = conservativeFloat32(g.dose);
      if (data[idx] === NODATA || dose < data[idx]) data[idx] = dose;
    }
  }

  // ── Binary layout ──────────────────────────────────────────────────────────
  const nodataStr   = `${NODATA}\0`;
  const nodataBytes = new TextEncoder().encode(nodataStr);
  const descriptionBytes = new TextEncoder().encode(
    `${nitrogenSummaryDescription(result.nitrogenSummary)}\0`
  );
  const pixelScale  = new Float64Array([csLon, csLat, 0]);     // 24 B
  const tiepoint    = new Float64Array([0, 0, 0, west, north, 0]); // 48 B
  // GeoKey directory: version header + 3 keys × 4 shorts
  const geoKey      = new Uint16Array([
    1, 1, 0, 3,          // KeyDirectoryVersion, Revision, Minor, NumKeys
    1024, 0, 1, 2,       // GTModelTypeGeoKey = Geographic (2D)
    1025, 0, 1, 1,       // GTRasterTypeGeoKey = PixelIsArea
    2048, 0, 1, 4326,    // GeographicTypeGeoKey = WGS 84
  ]);                                                             // 32 B

  const NUM_IFD = 16;
  const ifdOff  = 8;
  const ifdLen  = 2 + NUM_IFD * 12 + 4;
  let   extraOff = ifdOff + ifdLen;

  const psOff  = extraOff; extraOff += 24;
  const tpOff  = extraOff; extraOff += 48;
  const gkOff  = extraOff; extraOff += 32;
  const ndOff  = extraOff; extraOff += nodataBytes.length;
  const descOff = extraOff; extraOff += descriptionBytes.length;
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
  e(270,   2, descriptionBytes.length, descOff); // ImageDescription
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
  u8.set(descriptionBytes,                  descOff);
  u8.set(new Uint8Array(data.buffer),       imgOff);

  const base = polygon.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  trigger(URL.createObjectURL(new Blob([buf], { type: "image/tiff" })), `${base}_idw.tif`);
}

// ── CSV export of raw observations ───────────────────────────────────────────

export function buildObservationsCsv(
  osservazioni: {
    id: string; coltura?: string; data: string; dataTrapianto: string | null; dataSemina?: string | null;
    giorni: number;
    faseFenologica?: string | null;
    bbch?: string | null; faseFonte?: string | null;
    cliente: string; appezzamento: string; varieta: string;
    densitaValore?: number | null; densitaUnita?: string | null; pianteHaEquivalenti?: number | null;
    n1: number; n2: number; n3: number; n4: number; n5: number;
    media: number; ottimale: number; discostamento: number; dose: number;
    azotoTotale?: number | null; azotoGiaDistribuito?: number | null; quotaAzoto?: number | null;
    lat: number | null; lng: number | null;
  }[],
): string {
  const header = [
    "ID","Coltura","Data","Data_Semina","Data_Trapianto","DAS_o_Giorni","BBCH","Fase","Fonte_Fase",
    "Cliente","Appezzamento","Varieta",
    "Densita_Valore","Densita_Unita","Piante_ha_Equiv",
    "M1","M2","M3","M4","M5",
    "Media_NDVI","NDVI_Ottimale","Discostamento","Dose_o_Indicazione_N_Punto_kg_ha","Azoto_Totale_kg_ha","Azoto_Gia_Distribuito_kg_ha","Quota_Azoto_kg_ha",
    "Lat_WGS84","Lng_WGS84",
  ];
  const cell = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
  };
  const rows = osservazioni.map(o => [
    o.id, o.coltura ?? "tabacco", o.data, o.dataSemina ?? "", o.dataTrapianto, o.giorni, o.bbch ?? "", o.faseFenologica ?? "", o.faseFonte ?? "",
    o.cliente, o.appezzamento, o.varieta,
    o.densitaValore ?? "", o.densitaUnita ?? "", o.pianteHaEquivalenti ?? "",
    o.n1, o.n2, o.n3, o.n4, o.n5,
    o.media.toFixed(4), o.ottimale.toFixed(4), o.discostamento.toFixed(4),
    usesTenthsDose(o.coltura ?? "") ? formatRecordedDose(o.coltura!, o.dose) : o.dose.toFixed(2),
    o.azotoTotale ?? "", o.azotoGiaDistribuito ?? "", o.quotaAzoto ?? "",
    o.lat ?? "", o.lng ?? "",
  ]);
  return [header, ...rows].map(r => r.map(cell).join(",")).join("\r\n");
}

export function exportObservationsCsv(osservazioni: Parameters<typeof buildObservationsCsv>[0]): void {
  const csv = buildObservationsCsv(osservazioni);
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
