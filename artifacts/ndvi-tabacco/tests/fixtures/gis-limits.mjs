import JSZip from "jszip";

// Entirely invented payloads. No API, credentials, database, or observation data.
export async function createGisLimitFixtures() {
  const zipFile = async (name, zip) => ({
    name, mimeType: "application/zip",
    buffer: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  });
  const expanded = await zipFile("expanded.zip",
    new JSZip().file("padding.txt", new Uint8Array(32 * 1024 * 1024 + 1)));
  const forged = { ...expanded, name: "forged.zip", buffer: Buffer.from(expanded.buffer) };
  // Lie in both local and central size fields. The streamed byte budget must still win.
  forged.buffer.writeUInt32LE(1, 22);
  const central = forged.buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  forged.buffer.writeUInt32LE(1, central + 24);
  const entries = new JSZip();
  for (let i = 0; i < 129; i++) entries.file(`${i}.txt`, "");
  const layers = new JSZip();
  for (let i = 0; i < 17; i++) {
    layers.file(`${i}.json`, JSON.stringify({ type: "FeatureCollection", features: [] }));
  }
  const feature = { type: "Feature", properties: { DOSE: 60 },
    geometry: { type: "Point", coordinates: [12, 42] } };
  const features = new JSZip().file("points.json", JSON.stringify({
    type: "FeatureCollection", features: Array(10001).fill(feature),
  }));
  const vertices = new JSZip().file("field.json", JSON.stringify({
    type: "FeatureCollection", features: [{ ...feature,
      geometry: { type: "Polygon", coordinates: [Array(100001).fill([12, 42])] } }],
  }));
  return {
    expanded, forged,
    entries: await zipFile("entries.zip", entries),
    layers: await zipFile("layers.zip", layers),
    features: await zipFile("features.zip", features),
    vertices: await zipFile("vertices.zip", vertices),
  };
}
