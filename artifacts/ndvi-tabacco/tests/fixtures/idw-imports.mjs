import JSZip from "jszip";
import { readFile } from "node:fs/promises";

// Independent, tiny ESRI fixtures. No application writer, API or database.
export const polygonName = "Campo sintetico IDW";
export const ring = [
  [12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009], [12, 42],
];
export const coordinates = [
  [12.0003, 42.0003], [12.0009, 42.0003],
  [12.0003, 42.0006], [12.0009, 42.0006],
];
export const holeRings = [
  [[12.00045, 42.00032], [12.00075, 42.00032], [12.00075, 42.00058], [12.00045, 42.00058], [12.00045, 42.00032]],
  [[12.00008, 42.0001], [12.0002, 42.0001], [12.0002, 42.00022], [12.00008, 42.00022], [12.00008, 42.0001]],
];
const prj = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';

function bounds(points) {
  return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])),
    Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
}
function header(size, type, bbox) {
  const b = Buffer.alloc(size);
  b.writeInt32BE(9994, 0);
  b.writeInt32BE(size / 2, 24);
  b.writeInt32LE(1000, 28);
  b.writeInt32LE(type, 32);
  bbox.forEach((n, i) => b.writeDoubleLE(n, 36 + i * 8));
  return b;
}
function shapeFiles(type, records, bbox) {
  const shp = header(100 + records.reduce((n, b) => n + 8 + b.length, 0), type, bbox);
  const shx = header(100 + records.length * 8, type, bbox);
  let offset = 100;
  records.forEach((record, i) => {
    shp.writeInt32BE(i + 1, offset);
    shp.writeInt32BE(record.length / 2, offset + 4);
    record.copy(shp, offset + 8);
    shx.writeInt32BE(offset / 2, 100 + i * 8);
    shx.writeInt32BE(record.length / 2, 104 + i * 8);
    offset += 8 + record.length;
  });
  return { shp, shx };
}
function dbf(fields, rows) {
  const headerSize = 33 + fields.length * 32;
  const recordSize = 1 + fields.reduce((n, f) => n + f[2], 0);
  const b = Buffer.alloc(headerSize + recordSize * rows.length + 1);
  b.set([3, 126, 1, 1]);
  b.writeUInt32LE(rows.length, 4);
  b.writeUInt16LE(headerSize, 8);
  b.writeUInt16LE(recordSize, 10);
  fields.forEach(([name, type, length], i) => {
    const at = 32 + i * 32;
    b.write(name, at, 10, "ascii");
    b.write(type, at + 11, 1, "ascii");
    b[at + 16] = length;
  });
  b[headerSize - 1] = 13;
  rows.forEach((row, i) => {
    let at = headerSize + i * recordSize;
    b[at++] = 32;
    fields.forEach(([name, type, length]) => {
      const text = String(row[name]);
      if (text.length > length) throw new Error("Synthetic DBF field overflow");
      b.write(type === "N" ? text.padStart(length) : text.padEnd(length), at, length, "ascii");
      at += length;
    });
  });
  b[b.length - 1] = 26;
  return b;
}
async function zipShape(name, shapes, fields, rows) {
  const zip = new JSZip();
  zip.file(`${name}.shp`, shapes.shp);
  zip.file(`${name}.shx`, shapes.shx);
  zip.file(`${name}.dbf`, dbf(fields, rows));
  zip.file(`${name}.prj`, prj);
  return zip.generateAsync({ type: "nodebuffer" });
}
export async function createImportFixtures() {
  const kml = await readFile(new URL("./idw.kml", import.meta.url));
  const kmz = new JSZip().file("doc.kml", kml);
  const nestedKmz = new JSZip().file("layers/FIELD.KML", kml);
  // ESRI outer rings run clockwise, unlike this KML ring.
  const clockwise = [...ring].reverse();
  const polygon = Buffer.alloc(48 + clockwise.length * 16);
  polygon.writeInt32LE(5, 0);
  bounds(ring).forEach((n, i) => polygon.writeDoubleLE(n, 4 + i * 8));
  polygon.writeInt32LE(1, 36);
  polygon.writeInt32LE(clockwise.length, 40);
  clockwise.forEach(([x, y], i) => {
    polygon.writeDoubleLE(x, 48 + i * 16);
    polygon.writeDoubleLE(y, 56 + i * 16);
  });
  const pointRecords = coordinates.map(([x, y]) => {
    const p = Buffer.alloc(20);
    p.writeInt32LE(1, 0);
    p.writeDoubleLE(x, 4);
    p.writeDoubleLE(y, 12);
    return p;
  });
  const polygonZip = await zipShape("field", shapeFiles(5, [polygon], bounds(ring)),
    [["NOME", "C", 32]], [{ NOME: polygonName }]);
  const pointZip = await zipShape("points", shapeFiles(1, pointRecords, bounds(coordinates)),
    [["ID", "N", 8], ["DOSE", "N", 10], ["KG_HA", "N", 10], ["CLIENTE", "C", 24]],
    coordinates.map((_, i) => ({ ID: i + 1, DOSE: 60, KG_HA: 30, CLIENTE: "QA sintetico" })));
  return {
    kml: { name: "synthetic.kml", mimeType: "application/vnd.google-earth.kml+xml", buffer: kml },
    kmz: { name: "synthetic.kmz", mimeType: "application/vnd.google-earth.kmz", buffer: await kmz.generateAsync({ type: "nodebuffer" }) },
    nestedKmz: { name: "nested.kmz", mimeType: "application/vnd.google-earth.kmz", buffer: await nestedKmz.generateAsync({ type: "nodebuffer" }) },
    polygon: { name: "synthetic-polygons.zip", mimeType: "application/zip", buffer: polygonZip },
    points: { name: "synthetic-points.zip", mimeType: "application/zip", buffer: pointZip },
    emptyKmz: { name: "missing-kml.kmz", mimeType: "application/vnd.google-earth.kmz", buffer: await new JSZip().file("README.txt", "No geometry").generateAsync({ type: "nodebuffer" }) },
  };
}

/** Real ZIPs with independent ESRI records, not mocked shpjs responses. */
export async function createMultiLayerFixtures() {
  const fixtures = await createImportFixtures();
  const polygons = await JSZip.loadAsync(fixtures.polygon.buffer);
  const points = await JSZip.loadAsync(fixtures.points.buffer);
  async function archive(entries) {
    const zip = new JSZip();
    for (const [source, oldName, newName, dose] of entries) {
      for (const ext of ["shp", "shx", "dbf", "prj"]) {
        let data = await source.file(`${oldName}.${ext}`).async("nodebuffer");
        if (ext === "dbf" && dose != null) {
          // Same locations and IDs, different source/dose: layers must never merge.
          data = dbf([["ID", "N", 8], ["KG_HA", "N", 10], ["APPEZZ", "C", 24]],
            coordinates.map((_, i) => ({ ID: i + 1, KG_HA: dose, APPEZZ: "Campo B" })));
        }
        if (ext === "dbf" && oldName === "field") {
          data = dbf([["NOME", "C", 32], ["ID", "N", 8]],
            [{ NOME: polygonName, ID: newName === "campi_A" ? 101 : 202 }]);
        }
        zip.file(`${newName}.${ext}`, data);
      }
    }
    return zip.generateAsync({ type: "nodebuffer" });
  }
  const a = [polygons, "field", "campi_A"];
  const b = [polygons, "field", "campi_B"];
  const p = [points, "points", "rilievi_A"];
  const q = [points, "points", "rilievi_B", 90];
  const payload = (name, buffer) => ({ name, mimeType: "application/zip", buffer });
  return {
    polygons: payload("two-polygons.zip", await archive([a, b])),
    points: payload("two-points.zip", await archive([p, q])),
    // Incompatible first layer catches regressions to raw[0] for both importers.
    mixed: payload("mixed.zip", await archive([p, a, b, q])),
    pointsFirst: payload("points-first.zip", await archive([p, a])),
    polygonsFirst: payload("polygons-first.zip", await archive([a, p])),
    corrupt: payload("corrupt.zip", Buffer.from("not a ZIP")),
  };
}

/** Independent ESRI polygon record: outer clockwise, holes counterclockwise.
 * A second outer part produces a real MultiPolygon in shpjs, in the same layer.
 */
export async function createHoleImportFixtures({
  multipart = false, outer = ring, holes = holeRings, kmlText,
} = {}) {
  const kml = kmlText === undefined
    ? await readFile(new URL("./idw-holes.kml", import.meta.url))
    : Buffer.from(kmlText);
  const rings = [[...outer].reverse(), ...holes];
  if (multipart) {
    rings.push([...outer].reverse().map(([x, y]) => [x + 0.003, y]));
    rings.push(holes[0].map(([x, y]) => [x + 0.003, y]));
  }
  const points = rings.flat();
  const record = Buffer.alloc(44 + rings.length * 4 + points.length * 16);
  record.writeInt32LE(5, 0);
  bounds(points).forEach((v, i) => record.writeDoubleLE(v, 4 + i * 8));
  record.writeInt32LE(rings.length, 36);
  record.writeInt32LE(points.length, 40);
  let start = 0;
  rings.forEach((r, i) => {
    record.writeInt32LE(start, 44 + i * 4);
    start += r.length;
  });
  points.forEach(([x, y], i) => {
    const offset = 44 + rings.length * 4 + i * 16;
    record.writeDoubleLE(x, offset);
    record.writeDoubleLE(y, offset + 8);
  });
  const polygon = await zipShape("holes", shapeFiles(5, [record], bounds(points)),
    [["NOME", "C", 32]], [{ NOME: "Campo sintetico con esclusioni" }]);
  return {
    kml: { name: "synthetic-holes.kml", mimeType: "application/vnd.google-earth.kml+xml", buffer: kml },
    kmz: { name: "synthetic-holes.kmz", mimeType: "application/vnd.google-earth.kmz",
      buffer: await new JSZip().file("doc.kml", kml).generateAsync({ type: "nodebuffer" }) },
    polygon: { name: "synthetic-holes.zip", mimeType: "application/zip", buffer: polygon },
  };
}

/** Both outer field and hole cross latitude zero; centre selects UTM 33N/33S.
 * All coordinates are invented; binary input uses the independent ESRI encoder above.
 */
export async function createEquatorHoleImportFixtures(centre) {
  const rectangle = (west, south, east, north) =>
    [[west, south], [east, south], [east, north], [west, north], [west, south]];
  const outer = rectangle(14.99955, centre - 0.00045, 15.00045, centre + 0.00045);
  const hole = rectangle(14.99985, -0.00018, 15.00015, 0.00018);
  const boundary = (tag, r) => `<${tag}><LinearRing><coordinates>${
    r.map(p => p.join(",")).join(" ")
  }</coordinates></LinearRing></${tag}>`;
  const kmlText = `<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark>
    <name>Equatore sintetico con foro</name><Polygon>
    ${boundary("outerBoundaryIs", outer)}${boundary("innerBoundaryIs", hole)}
    </Polygon></Placemark></kml>`;
  return {
    ...await createHoleImportFixtures({ outer, holes: [hole], kmlText }),
    outer, hole,
    controls: [
      { obsId: "synthetic-south", cliente: "QA", appezzamento: "QA",
        lng: 14.9997, lat: -0.00025, dose: 20, azotoTotale: 100, azotoGiaDistribuito: 10 },
      { obsId: "synthetic-north", cliente: "QA", appezzamento: "QA",
        lng: 15.0003, lat: 0.00025, dose: 60, azotoTotale: 100, azotoGiaDistribuito: 10 },
    ],
  };
}
