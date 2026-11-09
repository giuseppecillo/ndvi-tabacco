import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { readCsv, verifyCsv, verifyPdfText, verifyWorkbook } from "./catalogue-dose-exports.mjs";

const cases = [{ id: "P06", dose: 0 }, { id: "K16", dose: 0.1 }, { id: "L006", dose: 0.006 }];
// Independent tiny OOXML examples test the reader/assertions, not app writers.
async function workbook(records, { textDose = false, legacyStyle = "0", value = r => r.dose } = {}) {
  const zip = new JSZip();
  zip.file("xl/styles.xml", `<styleSheet><numFmts><numFmt numFmtId="165" formatCode="0.0"/></numFmts>
    <cellXfs><xf numFmtId="0"/><xf numFmtId="165"/></cellXfs></styleSheet>`);
  zip.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${records.map((record, i) =>
    `<row r="${i + 7}"><c r="A${i + 7}" t="inlineStr"><is><t>${record.id}</t></is></c>${["N", "Q"].map(col =>
      `<c r="${col}${i + 7}" s="${record.dose === 0.006 ? legacyStyle : "1"}"${textDose ? ' t="inlineStr"' : ""}><v>${value(record, col)}</v></c>`).join("")}</row>`
  ).join("")}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("downloaded workbook comparisons join by ID in any row order", async () => {
  await verifyWorkbook(await workbook([cases[2], cases[0], cases[1]]), cases);
});
test("workbook assertions catch lost precision, wrong quota, text cells and wrong formats", async () => {
  for (const options of [
    { value: r => r.dose === 0.006 ? 0 : r.dose },
    { value: (r, column) => column === "Q" ? 9 : r.dose },
    { textDose: true }, { legacyStyle: "1" },
  ]) await assert.rejects(verifyWorkbook(await workbook(cases, options), cases));
  await assert.rejects(verifyWorkbook(await workbook([cases[0], cases[0], cases[2]]), cases));
  await assert.rejects(verifyWorkbook(await workbook(cases.slice(1)), cases));
});
const csv = rows => Buffer.from("\uFEFFID,Dose_o_Indicazione_N_Punto_kg_ha,Quota_Azoto_kg_ha\r\n"
  + rows.map(r => `${r.id},${r.dose.toFixed(3)},${r.dose}`).join("\r\n"));
test("downloaded CSV reader handles shuffled IDs and RFC4180 cells", () => {
  verifyCsv(csv([...cases].reverse()), cases);
  assert.deepEqual(readCsv('ID,Text\r\nA,"a,b""c\nx"\r\n'), [["ID", "Text"], ["A", 'a,b"c\nx']]);
  assert.throws(() => verifyCsv(csv(cases.map(r => ({ ...r, dose: 0 }))), cases));
  assert.throws(() => verifyCsv(csv([cases[0], cases[0], cases[2]]), cases));
  assert.throws(() => verifyCsv(csv(cases).subarray(3), cases));
});
const pdfLine = r => `  ${r.id}  08/11/2026  Azienda  ${r.dose === 0.006 ? "0,006" : r.dose.toFixed(1).replace(".", ",")}  45,123456  12,345678`;
test("PDF assertions compare the dose in each ID row, not an unrelated number elsewhere", () => {
  const text = [...cases].reverse().map(pdfLine).join("\n");
  verifyPdfText(text, cases);
  assert.throws(() => verifyPdfText(text.replace("0,006", "0,0") + "\nElsewhere: 0,006", cases));
  assert.throws(() => verifyPdfText(cases.slice(1).map(pdfLine).join("\n"), cases));
  assert.throws(() => verifyPdfText(text + "\n" + pdfLine(cases[0]), cases));
});
