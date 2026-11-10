import JSZip from "jszip";
import type { VarietaDati } from "../calculations";
import { alphabetical } from "./alphabetical";
import { completeCatalogue } from "../catalogue/completeCatalogue";
import type {CropProfile} from "@workspace/crop-calculations";

type Value = string | number | boolean | null | undefined;
type Table = { name: string; columns: string[]; rows: Value[][] };
type Snapshot = { columns: readonly string[]; rows: readonly (readonly string[])[] };
type Translate = (text: string) => string;
const escape = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relNs = "http://schemas.openxmlformats.org/package/2006/relationships";
const officeRel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
function column(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

export function catalogueExportTables(snapshot: Snapshot, tobacco: readonly VarietaDati[], t: Translate, locale: string, approved: readonly CropProfile[]=[]): Table[] {
  const complete = completeCatalogue(snapshot, tobacco,approved);
  const translated = new Set([0, 2, 3, 4, ...complete.columns.flatMap((c, i) => /^Fase F\d/.test(c) ? [i] : [])]);
  const rows = alphabetical(alphabetical(complete.rows, r => r[1], locale), r => t(r[0]), locale);
  return [
    { name: t("Catalogo colture"), columns: complete.columns.map(t), rows: rows.map(row => row.map((v, i) => {
      if (translated.has(i)) return t(v);
      // Identifiers, BBCH codes, units and ranges remain text; measurements are numeric.
      const numericColumn = i > 4 && !/^BBCH /.test(complete.columns[i]) && complete.columns[i] !== "Unità resa di riferimento";
      return numericColumn && /^-?\d+(?:[.,]\d+)?$/.test(v) ? Number(v.replace(",", ".")) : v;
    })) },
  ];
}

/** Actual .xlsx (OOXML), not CSV renamed to Excel. Strings are never formulas. */
export async function buildCatalogueWorkbook(snapshot: Snapshot, tobacco: readonly VarietaDati[], t: Translate, locale: string, approved: readonly CropProfile[]=[]): Promise<Uint8Array> {
  const tables = catalogueExportTables(snapshot, tobacco, t, locale,approved);
  if (!tables[0].rows.length || !tobacco.length) throw new Error("Catalogo incompleto.");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${tables.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  zip.file("_rels/.rels", `${xml}<Relationships xmlns="${relNs}"><Relationship Id="rId1" Type="${officeRel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `${xml}<workbook xmlns="${ns}" xmlns:r="${officeRel}"><sheets>${tables.map((table, i) => `<sheet name="${escape(table.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `${xml}<Relationships xmlns="${relNs}">${tables.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${officeRel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`);
  tables.forEach((table, index) => {
    const data: Value[][] = [
      ["NitroCrop NDVI", "Taurus Agriculture Solution SRL", t("Tutti i diritti Riservati")],
      table.columns, ...table.rows,
    ];
    const last = `${column(table.columns.length - 1)}${data.length}`;
    const content = data.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => {
      const ref = `${column(c)}${r + 1}`;
      if (v == null) return `<c r="${ref}"/>`;
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(String(v))}</t></is></c>`;
    }).join("")}</row>`).join("");
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, `${xml}<worksheet xmlns="${ns}"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${table.columns.length}" width="26" customWidth="1"/></cols><sheetData>${content}</sheetData><autoFilter ref="A2:${last}"/></worksheet>`);
  });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function downloadCatalogueWorkbook(snapshot: Snapshot, tobacco: readonly VarietaDati[], t: Translate, locale: string, approved: readonly CropProfile[]=[]) {
  const bytes = await buildCatalogueWorkbook(snapshot, tobacco, t, locale,approved);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `NitroCrop-catalogue-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
