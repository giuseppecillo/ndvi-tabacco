import JSZip from "jszip";

// Local browser imports, not server uploads. Keep these budgets shared by all formats.
export const GIS_LIMITS = Object.freeze({
  fileBytes: 10 * 1024 * 1024,
  expandedBytes: 32 * 1024 * 1024,
  entries: 128,
  layers: 16,
  features: 10_000,
  vertices: 100_000,
  timeoutMs: 15_000,
});
export const GIS_ERRORS = {
  file: "File GIS troppo grande: massimo 10 MiB.",
  expanded: "Archivio GIS troppo grande: massimo 32 MiB decompressi.",
  entries: "Archivio GIS troppo complesso: massimo 128 voci ZIP.",
  layers: "Troppi livelli GIS: massimo 16.",
  features: "Troppi elementi GIS: massimo 10000.",
  vertices: "Troppe coordinate GIS: massimo 100000 vertici.",
  timeout: "Importazione GIS interrotta: tempo massimo di 15 secondi superato.",
  invalid: "Archivio GIS non valido o non supportato.",
} as const;
export function gisErrorMessage(error: unknown): string | undefined {
  return error instanceof Error && Object.values(GIS_ERRORS).some(m => m === error.message)
    ? error.message : undefined;
}
export function checkGisFileSize(size: number) {
  if (size > GIS_LIMITS.fileBytes) throw new Error(GIS_ERRORS.file);
}
export function checkGisCount(count: number, kind: "layers" | "features" | "vertices") {
  if (count > GIS_LIMITS[kind]) throw new Error(GIS_ERRORS[kind]);
}

/** Check ZIP metadata before inflating; also count actual streamed output.
 * Never trust a forged uncompressed-size field, nor inflate all entries in parallel.
 * ZIP64/multipart/encrypted archives are intentionally unsupported.
 */
export async function readBoundedZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  checkGisFileSize(buffer.byteLength);
  const view = new DataView(buffer);
  const invalid = () => { throw new Error(GIS_ERRORS.invalid); };
  let end = buffer.byteLength - 22;
  for (; end >= Math.max(0, buffer.byteLength - 65557); end--) {
    if (view.getUint32(end, true) === 0x06054b50 &&
        end + 22 + view.getUint16(end + 20, true) === buffer.byteLength) break;
  }
  if (end < 0 || end < buffer.byteLength - 65557) return invalid();
  const count = view.getUint16(end + 10, true);
  if (count > GIS_LIMITS.entries) throw new Error(GIS_ERRORS.entries);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) ||
      view.getUint16(end + 8, true) !== count) return invalid();
  let offset = view.getUint32(end + 16, true);
  const directoryEnd = offset + view.getUint32(end + 12, true);
  if (directoryEnd !== end) return invalid();
  let declared = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) return invalid();
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    if (flags & 1 || (method !== 0 && method !== 8)) return invalid();
    declared += view.getUint32(offset + 24, true);
    if (declared > GIS_LIMITS.expandedBytes) throw new Error(GIS_ERRORS.expanded);
    offset += 46 + view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (offset > end) return invalid();
  }
  if (offset !== directoryEnd) return invalid();
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter(f => !f.dir);
  checkGisCount(entries.filter(f => /\.(shp|json|kml)$/i.test(f.name)).length, "layers");
  const output = new Map<string, Uint8Array>();
  let actual = 0;
  for (const entry of entries) {
    const chunks: Uint8Array[] = [];
    let length = 0;
    await new Promise<void>((resolve, reject) => {
      // JSZip exposes this streaming API at runtime but omits it on JSZipObject's types.
      const stream = (entry as unknown as {
        internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array>;
      }).internalStream("uint8array");
      stream.on("data", (chunk: Uint8Array) => {
        actual += chunk.length;
        if (actual > GIS_LIMITS.expandedBytes) {
          stream.pause();
          reject(new Error(GIS_ERRORS.expanded));
          return;
        }
        chunks.push(chunk);
        length += chunk.length;
      }).on("error", reject).on("end", resolve).resume();
    });
    const bytes = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    output.set(entry.name, bytes);
  }
  return output;
}

/** Bound decoded geometry, including MultiPolygon parts and nested JSON coordinates. */
export function checkGeometryBudget(layers: { features: { geometry: { coordinates: unknown } | null }[] }[]) {
  checkGisCount(layers.length, "layers");
  let features = 0, vertices = 0;
  for (const layer of layers) {
    features += layer.features.length;
    checkGisCount(features, "features");
    for (const feature of layer.features) {
      const pending: unknown[] = [feature.geometry?.coordinates];
      while (pending.length) {
        const node = pending.pop();
        if (!Array.isArray(node)) continue;
        if (typeof node[0] === "number") checkGisCount(++vertices, "vertices");
        else for (const child of node) {
          pending.push(child);
          // Empty nested arrays must not bypass the budget.
          if (pending.length > GIS_LIMITS.vertices) throw new Error(GIS_ERRORS.vertices);
        }
      }
    }
  }
}
