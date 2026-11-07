import { checkGeometryBudget, checkGisCount, GIS_ERRORS, readBoundedZip } from "./gisLimits";

// Shared layer normalization. Keep source data separate from translated UI copy.
export interface ShpFeature {
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}
export interface ShpCollection {
  type: "FeatureCollection";
  fileName?: string;
  features: ShpFeature[];
}
export interface ShpLayer {
  key: string;
  name: string;
  features: ShpFeature[];
}
export async function readShpLayers(buffer: ArrayBuffer): Promise<ShpLayer[]> {
  const files = await readBoundedZip(buffer);
  const shp = (await import("shpjs")).default as
    (input: { shp: Uint8Array; dbf?: Uint8Array; prj?: string; cpg?: string }) => Promise<ShpCollection>;
  const decoder = new TextDecoder();
  const layers: ShpLayer[] = [];
  let records = 0, vertices = 0;
  for (const [name, bytes] of files) {
    if (name.includes("__MACOSX") || !/\.(shp|json)$/i.test(name)) continue;
    const base = name.replace(/\.(shp|json)$/i, "");
    let fc: ShpCollection;
    if (/\.json$/i.test(name)) {
      fc = JSON.parse(decoder.decode(bytes));
      if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) throw new Error(GIS_ERRORS.invalid);
    } else {
      // Inspect record counts and declared coordinate/part counts before shpjs allocates.
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (v.byteLength < 100 || v.getInt32(0) !== 9994 ||
          v.getInt32(24) * 2 !== v.byteLength) throw new Error(GIS_ERRORS.invalid);
      for (let at = 100; at < v.byteLength;) {
        if (at + 12 > v.byteLength) throw new Error(GIS_ERRORS.invalid);
        const length = v.getInt32(at + 4) * 2;
        if (length < 4 || at + 8 + length > v.byteLength) throw new Error(GIS_ERRORS.invalid);
        checkGisCount(++records, "features");
        const type = v.getInt32(at + 8, true);
        if ([1, 11, 21].includes(type)) vertices++;
        else if ([3, 5, 13, 15, 23, 25, 8, 18, 28].includes(type)) {
          const multi = [8, 18, 28].includes(type);
          if (length < (multi ? 40 : 44)) throw new Error(GIS_ERRORS.invalid);
          const parts = multi ? 0 : v.getInt32(at + 44, true);
          const points = v.getInt32(at + (multi ? 44 : 48), true);
          if (parts < 0 || points < 0 || parts > points ||
              (multi ? 40 : 44) + parts * 4 + points * 16 > length) {
            throw new Error(GIS_ERRORS.invalid);
          }
          vertices += points;
        } else if (type !== 0) throw new Error(GIS_ERRORS.invalid);
        checkGisCount(vertices, "vertices");
        at += 8 + length;
      }
      const sibling = (ext: string) => {
        const key = [...files.keys()].find(k => k.toLowerCase() === `${base}.${ext}`.toLowerCase());
        return key ? files.get(key) : undefined;
      };
      const dbf = sibling("dbf");
      if (dbf) {
        if (dbf.byteLength < 32) throw new Error(GIS_ERRORS.invalid);
        const d = new DataView(dbf.buffer, dbf.byteOffset, dbf.byteLength);
        checkGisCount(d.getUint32(4, true), "features");
        const header = d.getUint16(8, true), row = d.getUint16(10, true);
        if (header < 33 || !row || header + row * d.getUint32(4, true) > dbf.byteLength) {
          throw new Error(GIS_ERRORS.invalid);
        }
      }
      const prj = sibling("prj"), cpg = sibling("cpg");
      fc = await shp({ shp: bytes, dbf,
        prj: prj && decoder.decode(prj), cpg: cpg && decoder.decode(cpg) });
    }
    layers.push({ key: String(layers.length), name: base, features: fc.features });
    checkGeometryBudget(layers);
  }
  if (!layers.length) throw new Error(GIS_ERRORS.invalid);
  return layers;
}

export interface ShpPointFeature extends ShpFeature {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
}
export interface ShpPointLayer extends ShpLayer {
  features: ShpPointFeature[];
  numericFields: string[];
}
export const SHP_POINT_ERROR = "Impossibile caricare i punti. Il file è danneggiato o non contiene punti validi.";
export const SHP_POINT_POLICY = "Seleziona un solo livello di punti: i livelli non vengono sommati. Le geometrie non puntuali sono escluse.";
export const SHP_POLYGON_POLICY = "Sono importati tutti i livelli poligonali. Le geometrie non poligonali sono escluse.";
export const SHP_DOSE_ERROR = "Il campo Dose deve contenere un numero valido per ogni punto del livello.";

function numeric(value: unknown): boolean {
  return (typeof value === "number" || typeof value === "string" && value.trim() !== "") &&
    Number.isFinite(Number(value));
}
export async function readShpPointLayers(buffer: ArrayBuffer): Promise<ShpPointLayer[]> {
  const layers = await readShpLayers(buffer);
  return layers.flatMap(layer => {
    const features = layer.features.filter(f => f.geometry?.type === "Point").map(f => {
      const coordinates = f.geometry!.coordinates as number[];
      if (!Array.isArray(coordinates) || coordinates.length < 2 ||
          !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) ||
          Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
        throw new Error(SHP_POINT_ERROR);
      }
      return { ...f, properties: f.properties ?? {},
        geometry: { type: "Point" as const, coordinates: coordinates.slice(0, 2) as [number, number] } };
    });
    if (!features.length) return [];
    // A field must be usable for the whole selected layer; never invent zero doses.
    const numericFields = Object.keys(features[0].properties).filter(key =>
      features.every(f => numeric(f.properties[key])));
    return [{ ...layer, features, numericFields }];
  });
}

export function pointLayerControls(layer: ShpPointLayer, field: string) {
  if (!layer.numericFields.includes(field)) throw new Error(SHP_DOSE_ERROR);
  return layer.features.map((f, i) => ({
    obsId: String(f.properties.ID ?? f.properties.id ?? f.id ?? i + 1),
    cliente: String(f.properties.CLIENTE ?? f.properties.cliente ?? ""),
    appezzamento: String(f.properties.APPEZZ ?? f.properties.appezzamento ?? ""),
    sourceLayer: layer.name,
    lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
    dose: Number(f.properties[field]),
  }));
}
