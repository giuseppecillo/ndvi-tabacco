import JSZip from "jszip";
import type { Observation } from "../App";
import { ndviDeviation, type ObservationGroup } from "./observationHistory";

type Translate = (text: string) => string;
type Value = string | number | null | undefined;
type Column = { title: string; value: (o: Observation) => Value; style?: number };
export type WorkbookLogos = { taurus: Uint8Array };

const columns: Column[] = [
  { title: "ID", value: o => o.id },
  { title: "Cliente", value: o => o.cliente },
  { title: "Data del rilievo", value: o => o.data },
  { title: "Data e ora di salvataggio (UTC)", value: o => o.createdAt },
  { title: "Appezzamento", value: o => o.appezzamento },
  { title: "Coltura", value: o => o.coltura },
  { title: "Varietà", value: o => o.varieta },
  { title: "Latitudine", value: o => o.lat, style: 4 },
  { title: "Longitudine", value: o => o.lng, style: 4 },
  { title: "NDVI medio", value: o => o.media, style: 2 },
  { title: "NDVI ottimale", value: o => o.ottimale, style: 2 },
  { title: "Scostamento NDVI (medio − ottimale)", value: o => ndviDeviation(o).absolute, style: 2 },
  { title: "Scostamento NDVI (%)", value: o => ndviDeviation(o).percent, style: 3 },
  { title: "Dose N al punto (kg N/ha)", value: o => o.dose, style: 3 },
  { title: "Azoto totale previsto", value: o => o.azotoTotale, style: 3 },
  { title: "Azoto già distribuito", value: o => o.azotoGiaDistribuito, style: 3 },
  { title: "Quota azotata", value: o => o.quotaAzoto, style: 3 },
  ...(["n1", "n2", "n3", "n4", "n5"] as const).map((key, i) => ({
    title: `NDVI ${i + 1}`, value: (o: Observation) => o[key], style: 2,
  })),
  { title: "Data Trapianto", value: o => o.dataTrapianto },
  { title: "Data semina", value: o => o.dataSemina },
  { title: "Giorni", value: o => o.giorni },
  { title: "Fase fenologica", value: o => o.faseFenologica },
  { title: "BBCH", value: o => o.bbch },
  { title: "Fonte della fase", value: o => o.faseFonte },
  { title: "Età piantina", value: o => o.etaPiantina },
  { title: "Resa attesa", value: o => o.resa, style: 3 },
  { title: "Densità", value: o => o.densitaValore },
  { title: "Unità densità", value: o => o.densitaUnita },
  { title: "Piante/ha equivalenti", value: o => o.pianteHaEquivalenti },
  { title: "Scostamento registrato", value: o => o.discostamento, style: 2 },
];
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const sheetNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const tableHeaderRow = 6;
const firstDataRow = tableHeaderRow + 1;
function colName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
}
function cell(value: Value, reference: string, style = 0): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return `<c r="${reference}"/>`;
  if (typeof value === "number") return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  // inlineStr prevents user-supplied strings such as "=..." becoming formulas.
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function picture(id: number, column: number, relationship: string, name: string): string {
  const size = 62 * 9525; // 62 px in English Metric Units
  return `<xdr:oneCellAnchor><xdr:from><xdr:col>${column}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${size}" cy="${size}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${xml(name)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size}" cy="${size}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
}

/** Standards-based OOXML workbook with a Taurus logo, application name and numeric cells. */
export async function buildObservationWorkbook(group: ObservationGroup, translate: Translate, logos: WorkbookLogos): Promise<Uint8Array> {
  if (!logos.taurus.length) throw new Error("Il logo Taurus per il file Excel non è disponibile.");
  const zip = new JSZip();
  const lastCol = colName(columns.length - 1);
  const header = [
    `<row r="1" ht="54" customHeight="1">${cell("NitroCrop NDVI", "E1", 5)}</row>`,
    `<row r="2" ht="24" customHeight="1">${cell(translate("Tutti i diritti Riservati"), "E2", 6)}</row>`,
    `<row r="4">${cell(`${group.cliente} · ${group.date}`, "A4", 6)}</row>`,
    `<row r="${tableHeaderRow}">${columns.map((c, i) => cell(translate(c.title), `${colName(i)}${tableHeaderRow}`, 1)).join("")}</row>`,
  ].join("");
  const rows = group.observations.map((o, index) => {
    const number = index + firstDataRow;
    return `<row r="${number}">${columns.map((column, i) => cell(column.value(o), `${colName(i)}${number}`, column.style)).join("")}</row>`;
  }).join("");
  zip.file("[Content_Types].xml", `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  zip.file("_rels/.rels", `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `${declaration}<workbook xmlns="${sheetNs}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(translate("Rilievi"))}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("xl/styles.xml", `${declaration}<styleSheet xmlns="${sheetNs}"><numFmts count="3"><numFmt numFmtId="164" formatCode="0.000"/><numFmt numFmtId="165" formatCode="0.0"/><numFmt numFmtId="166" formatCode="0.000000"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF1F3D2B"/><sz val="22"/><name val="Calibri"/></font><font><color rgb="FF66665F"/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3D2B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  const lastRow = group.observations.length + tableHeaderRow;
  zip.file("xl/worksheets/sheet1.xml", `${declaration}<worksheet xmlns="${sheetNs}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastCol}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${tableHeaderRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="${columns.length}" width="24" customWidth="1"/></cols><sheetData>${header}${rows}</sheetData><autoFilter ref="A${tableHeaderRow}:${lastCol}${lastRow}"/><drawing r:id="rId1"/></worksheet>`);
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  zip.file("xl/drawings/drawing1.xml", `${declaration}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${picture(1, 0, "rId1", "Taurus Agriculture Solution")}</xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing1.xml.rels", `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/taurus.png"/></Relationships>`);
  zip.file("xl/media/taurus.png", logos.taurus);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function loadLogoPng(path: string): Promise<Uint8Array> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Impossibile caricare il logo per il file Excel."));
    image.src = path;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossibile preparare il logo per il file Excel.");
  const ratio = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(result => result ? resolve(result) : reject(new Error("Impossibile preparare il logo per il file Excel.")), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function downloadObservationWorkbook(group: ObservationGroup, translate: Translate = text => text) {
  const taurus = await loadLogoPng(`${import.meta.env.BASE_URL}taurus-logo.png`);
  const bytes = await buildObservationWorkbook(group, translate, { taurus });
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const name = `${group.cliente || "cliente"}-${group.date}`.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_").slice(0, 100);
  anchor.href = url;
  anchor.download = `NitroCrop-${name}.xlsx`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
