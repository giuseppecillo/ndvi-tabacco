import { parseKml, parseKmz, parseShpPolygons } from "./geoUtils";
import { readShpPointLayers } from "./shapefileImport";
import { DOMParser } from "@xmldom/xmldom";

// Workers have no browser DOMParser. Reject malformed XML rather than recovering it.
globalThis.DOMParser = class extends DOMParser {
  constructor() {
    super({ onError: (_level, message) => { throw new Error(message); } });
  }
} as unknown as typeof globalThis.DOMParser;

self.onmessage = async (event: MessageEvent<{ kind: "kml" | "kmz" | "zip" | "points"; data: string | ArrayBuffer }>) => {
  try {
    const { kind, data } = event.data;
    const value = kind === "kml" ? parseKml(data as string)
      : kind === "kmz" ? await parseKmz(data as ArrayBuffer)
      : kind === "zip" ? await parseShpPolygons(data as ArrayBuffer)
      : await readShpPointLayers(data as ArrayBuffer);
    self.postMessage({ value });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
