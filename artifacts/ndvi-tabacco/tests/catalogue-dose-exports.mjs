// Independent readers of downloaded bytes, not application export helpers.
import assert from "node:assert/strict";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const xml = text => new DOMParser().parseFromString(text, "text/xml");
const elements = (node, name) => [...node.getElementsByTagName(name)];

export function assertIds(rows, expected) {
  assert.equal(rows.length, expected.length, "exact record count");
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, "no duplicate IDs");
  assert.deepEqual(rows.map(r => r.id).sort(), expected.map(r => r.id).sort());
}

export async function verifyWorkbook(bytes, expected) {
  const zip = await JSZip.loadAsync(bytes);
  const sheet = xml(await zip.file("xl/worksheets/sheet1.xml").async("string"));
  const styles = xml(await zip.file("xl/styles.xml").async("string"));
  const xfs = elements(styles, "cellXfs")[0];
  const formats = elements(xfs, "xf").map(xf => xf.getAttribute("numFmtId"));
  const customFormats = new Map(elements(styles, "numFmt")
    .map(f => [f.getAttribute("numFmtId"), f.getAttribute("formatCode")]));
  const rows = elements(sheet, "row").map(row => {
    const cells = new Map(elements(row, "c").map(cell => [
      cell.getAttribute("r").replace(/\d+$/, ""), cell,
    ]));
    return { id: elements(cells.get("A") ?? row.ownerDocument.createElement("empty"), "t")[0]?.textContent, cells };
  }).filter(row => expected.some(e => e.id === row.id));
  // Also require exactly five data rows: unknown/additional exports must fail.
  const dataRows = elements(sheet, "row").filter(row => Number(row.getAttribute("r")) > 6);
  assert.equal(dataRows.length, expected.length);
  assertIds(rows, expected);
  for (const record of expected) {
    const { cells } = rows.find(row => row.id === record.id);
    for (const column of ["N", "Q"]) {
      const cell = cells.get(column);
      assert(cell, `${record.id}/${column} missing`);
      assert(!cell.hasAttribute("t"), `${record.id}/${column} must be numeric`);
      assert.equal(Number(elements(cell, "v")[0]?.textContent), record.dose, `${record.id}/${column}`);
      const format = formats[Number(cell.getAttribute("s") || 0)];
      if (record.dose === 0.006) assert.equal(format, "0", "legacy uses General");
      else assert.equal(customFormats.get(format), "0.0", "new doses display tenths");
    }
  }
}

// RFC4180 reader: commas, escaped quotes and embedded newlines stay in cells.
export function readCsv(text) {
  const rows = [], row = [];
  let cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell); cell = "";
      if (c !== ",") {
        rows.push([...row]); row.length = 0;
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  assert(!quoted, "unterminated CSV quotation");
  if (cell || row.length) { row.push(cell); rows.push([...row]); }
  return rows;
}

export function verifyCsv(bytes, expected) {
  assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191], "UTF-8 BOM");
  const [header, ...data] = readCsv(bytes.toString("utf8"));
  const rows = data.map(values => Object.fromEntries(header.map((key, i) => [key, values[i]])));
  assertIds(rows.map(r => ({ id: r.ID })), expected);
  for (const record of expected) {
    const row = rows.find(r => r.ID === record.id);
    for (const key of ["Dose_o_Indicazione_N_Punto_kg_ha", "Quota_Azoto_kg_ha"]) {
      assert.notEqual(row[key], "", `${record.id}/${key} is not blank`);
      assert.equal(Number(row[key]), record.dose, `${record.id}/${key}`);
    }
  }
}

export function verifyPdfText(text, expected) {
  // pdftotext -layout: one table row per ID, followed by dose, latitude, longitude.
  const rows = text.split(/\r?\n/).map(line => line.trim().split(/\s+/))
    .filter(tokens => expected.some(e => e.id === tokens[0]));
  assertIds(rows.map(tokens => ({ id: tokens[0] })), expected);
  for (const record of expected) {
    const tokens = rows.find(row => row[0] === record.id);
    assert.equal(tokens.at(-3), record.dose === 0.006 ? "0,006" : record.dose.toFixed(1).replace(".", ","),
      `PDF dose for ${record.id}`);
    assert.equal(tokens.at(-2), "45,123456");
    assert.equal(tokens.at(-1), "12,345678");
  }
}
