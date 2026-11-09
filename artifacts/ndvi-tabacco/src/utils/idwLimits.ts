import proj4 from "proj4";
import type { ControlPoint, KmlPolygon } from "./geoUtils";

// Bound both allocation/render/export size and the synchronous CPU cost.
// Budget all bounding-box cells, even for thin fields or fields with holes.
export const IDW_LIMITS = Object.freeze({
  cells: 25_000,
  work: 5_000_000,
  vertices: 10_000,
  controls: 5_000,
});
export const IDW_ERRORS = {
  limit: "Mappa troppo complessa per il calcolo a 10 m. Riduci l’estensione del poligono, i vertici o i punti di controllo e riprova. Nessun risultato generato.",
  invalid: "Impossibile calcolare la mappa: geometria, coordinate o parametri non validi. Nessun risultato generato.",
} as const;

export class IdwCalculationError extends Error {}

/** Upper bound, not an area-based estimate: holes do not reduce scan cost.
 * Called before control filtering, projection/allocation and grid iteration.
 * Three IDW passes cover dose, planned N and already-applied N.
 */
export function estimateIdwWorkload(
  polygon: KmlPolygon, controls: ControlPoint[], cellSize = 10, power = 2,
): { cells: number; work: number } {
  const invalid = () => { throw new IdwCalculationError(IDW_ERRORS.invalid); };
  const limit = () => { throw new IdwCalculationError(IDW_ERRORS.limit); };
  if (!Number.isFinite(cellSize) || cellSize <= 0 ||
      !Number.isFinite(power) || power <= 0) invalid();
  if (controls.length > IDW_LIMITS.controls ||
      (polygon.holes?.length ?? 0) > IDW_LIMITS.vertices) limit();
  const rings = [polygon.ring, ...(polygon.holes ?? [])];
  let vertices = 0;
  for (const ring of rings) {
    vertices += ring.length;
    if (vertices > IDW_LIMITS.vertices) limit();
    if (ring.length < 3) invalid();
  }
  const validCoordinate = (lng: number, lat: number) =>
    Number.isFinite(lng) && lng >= -180 && lng < 180 &&
    Number.isFinite(lat) && lat >= -80 && lat <= 84;
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (!validCoordinate(lng, lat)) invalid();
      if (ring === polygon.ring) {
        west = Math.min(west, lng); east = Math.max(east, lng);
        south = Math.min(south, lat); north = Math.max(north, lat);
      }
    }
  }
  for (const c of controls) {
    if (!validCoordinate(c.lng, c.lat) || !Number.isFinite(c.dose)) invalid();
  }
  const zone = Math.floor(((west + east) / 2 + 180) / 6) + 1;
  const projection = `+proj=utm +zone=${zone} ${(south + north) / 2 < 0 ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  try {
    for (const [lng, lat] of polygon.ring) {
      const [x, y] = proj4("EPSG:4326", projection, [lng, lat]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) invalid();
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  } catch {
    return invalid();
  }
  // Ceil intentionally overestimates the centre-node loops at the boundary.
  // At least one per axis also bounds scanning a degenerate, zero-width field.
  const cells = Math.max(1, Math.ceil((maxX - minX) / cellSize)) *
    Math.max(1, Math.ceil((maxY - minY) / cellSize));
  // Hole boundary checks may traverse each ring twice (inside + on-edge).
  const work = cells * (2 * vertices + 3 * controls.length) +
    2 * controls.length * (vertices - polygon.ring.length);
  if (!Number.isSafeInteger(cells) || !Number.isSafeInteger(work) ||
      cells > IDW_LIMITS.cells || work > IDW_LIMITS.work) limit();
  return { cells, work };
}
