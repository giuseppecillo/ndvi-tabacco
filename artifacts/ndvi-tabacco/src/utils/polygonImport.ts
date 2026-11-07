import { parseKml, parseKmz, parseShpPolygons, type KmlPolygon } from "./geoUtils";
import { checkGisFileSize, gisErrorMessage } from "./gisLimits";
import { decodeGis } from "./gisWorkerClient";

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
  let controller: AbortController | undefined;
  return {
    get version() { return version; },
    invalidate() { version++; controller?.abort(); },
    async load(file: PolygonFile) {
      const attempt = ++version;
      controller?.abort();
      const current = controller = new AbortController();
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
        checkGisFileSize(file.size);
        const data = ext === "kml" ? await file.text() : await file.arrayBuffer();
        if (attempt !== version) return;
        // Node-only fixture tests can call parsers directly; browsers must never
        // fall back to synchronous decoding when Worker is unavailable.
        const polygons = (typeof window !== "undefined" || typeof Worker !== "undefined") && parsers === defaultParsers
          ? await decodeGis<KmlPolygon[]>(ext, data, current.signal)
          : ext === "kml" ? parsers.kml(data as string) : await parsers[ext](data as ArrayBuffer);
        if (!polygons.length || polygons.some(p =>
          [p.ring, ...(p.holes ?? [])].some(ring => ring.length < 3 || ring.some(([lng, lat]) =>
            !Number.isFinite(lng) || !Number.isFinite(lat) ||
            Math.abs(lng) > 180 || Math.abs(lat) > 90)))) throw new Error("invalid geometry");
        if (attempt === version) {
          update({ polygons, filename: file.name, selectedIndex: 0, loading: false, error: null });
        }
      } catch (cause) {
        // An older asynchronous import must never overwrite a newer attempt.
        if (attempt === version) update({ ...emptyPolygonImport(), error: gisErrorMessage(cause) ?? error });
      }
    },
  };
}

export function canSpatialize(state: PolygonImportState, controlCount: number, computing: boolean) {
  return !state.loading && !state.error && !computing && controlCount > 0 &&
    state.selectedIndex !== null && !!state.polygons[state.selectedIndex];
}
