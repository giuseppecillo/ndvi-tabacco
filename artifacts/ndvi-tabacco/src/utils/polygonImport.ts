import { parseKml, parseKmz, parseShpPolygons, type KmlPolygon } from "./geoUtils";

export const POLYGON_IMPORT_ERROR = "Impossibile caricare i poligoni. Il file è vuoto, danneggiato o non contiene poligoni validi. Carica un nuovo file per procedere.";
export const POLYGON_FORMAT_ERROR = "Formato non supportato. Usa .kml, .kmz o .zip (Shapefile).";
export interface PolygonImportState {
  polygons: KmlPolygon[];
  filename: string;
  selectedIndex: number | null;
  loading: boolean;
  error: string | null;
}
export const emptyPolygonImport = (): PolygonImportState => ({
  polygons: [], filename: "", selectedIndex: null, loading: false, error: null,
});
type PolygonFile = Pick<File, "name" | "size" | "text" | "arrayBuffer">;
const defaultParsers = { kml: parseKml, kmz: parseKmz, zip: parseShpPolygons };

/** No API/DB access. Each new attempt immediately invalidates old geometry/results. */
export function createPolygonImporter(
  update: (state: PolygonImportState) => void,
  clearResults: () => void,
  parsers = defaultParsers,
) {
  let version = 0;
  return {
    get version() { return version; },
    invalidate() { version++; },
    async load(file: PolygonFile) {
      const attempt = ++version;
      clearResults();
      update({ ...emptyPolygonImport(), loading: true });
      const ext = file.name.toLowerCase().split(".").pop();
      let error = POLYGON_IMPORT_ERROR;
      try {
        if (ext !== "kml" && ext !== "kmz" && ext !== "zip") {
          error = POLYGON_FORMAT_ERROR;
          throw new Error("unsupported");
        }
        if (!file.size) throw new Error("empty");
        const polygons = ext === "kml"
          ? parsers.kml(await file.text())
          : await parsers[ext](await file.arrayBuffer());
        if (!polygons.length || polygons.some(p =>
          [p.ring, ...(p.holes ?? [])].some(ring => ring.length < 3 || ring.some(([lng, lat]) =>
            !Number.isFinite(lng) || !Number.isFinite(lat) ||
            Math.abs(lng) > 180 || Math.abs(lat) > 90)))) throw new Error("invalid geometry");
        if (attempt === version) {
          update({ polygons, filename: file.name, selectedIndex: 0, loading: false, error: null });
        }
      } catch {
        // An older asynchronous import must never overwrite a newer attempt.
        if (attempt === version) update({ ...emptyPolygonImport(), error });
      }
    },
  };
}

export function canSpatialize(state: PolygonImportState, controlCount: number, computing: boolean) {
  return !state.loading && !state.error && !computing && controlCount > 0 &&
    state.selectedIndex !== null && !!state.polygons[state.selectedIndex];
}
