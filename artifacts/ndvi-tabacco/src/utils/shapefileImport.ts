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
  const shp = (await import("shpjs")).default as
    (input: ArrayBuffer) => Promise<ShpCollection | ShpCollection[]>;
  const raw = await shp(buffer);
  return (Array.isArray(raw) ? raw : [raw]).map((fc, i) => ({
    key: String(i),
    name: fc.fileName ?? `#${i + 1}`,
    features: fc.features,
  }));
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
