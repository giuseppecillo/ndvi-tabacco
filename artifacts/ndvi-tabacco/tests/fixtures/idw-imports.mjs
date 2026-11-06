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
