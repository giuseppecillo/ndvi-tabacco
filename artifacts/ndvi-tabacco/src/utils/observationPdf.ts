import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Observation } from "../App";
import { isCatalogueCrop } from "@workspace/crop-calculations";
import { getLocale, t } from "../i18n/runtime";

/** Date-only values are calendar dates: do not shift them through UTC. */
function reportDate(value: string, locale: string): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString(locale);
}

export function buildObservationPdfRows(observations: readonly Observation[], locale = getLocale()) {
  const number = (value: number, digits: number) => value.toLocaleString(locale, {
    minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
  });
  return observations.map(o => [
    o.id, reportDate(o.data, locale), reportDate(o.dataSemina || o.dataTrapianto, locale),
    o.cliente, o.appezzamento, isCatalogueCrop(o.coltura) ? "—" : o.giorni,
    number(o.n1, 2), number(o.n2, 2), number(o.n3, 2), number(o.n4, 2), number(o.n5, 2),
    number(o.media, 3), number(o.ottimale, 3), number(o.discostamento, 3), number(o.dose, 1),
    o.lat != null ? number(o.lat, 6) : "—", o.lng != null ? number(o.lng, 6) : "—",
  ]);
}

/** Shared by the browser download and synthetic PDF regression checks. */
export function buildObservationPdf(
  observations: readonly Observation[],
  options: { exportedAt?: Date; logo?: HTMLImageElement | string } = {},
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  if (options.logo) {
    try { doc.addImage(options.logo, "PNG", 10, 8, 28, 28); } catch { /* Export remains available if the logo fails. */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52);
  doc.text("NitroCrop NDVI", 42, 18);
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(t("Registro osservazioni NDVI"), 42, 26);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const exportedAt = options.exportedAt ?? new Date();
  doc.text(t(`Esportato il: ${exportedAt.toLocaleDateString(getLocale())} — ${observations.length} osservazion${observations.length === 1 ? "e" : "i"}`), 42, 33);
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(10, 39, 287, 39);
  autoTable(doc, {
    startY: 43,
    head: [[
      "ID", "Rilev.", "Semina / trapianto", "Cliente", "Appezz.", "Gg",
      "M1", "M2", "M3", "M4", "M5", "Media", "Ottimale", "Diff.",
      "Dose / N punto\n(kg/ha)", "Lat", "Lng",
    ].map(t)],
    body: buildObservationPdfRows(observations),
    styles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [242, 247, 243] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [22, 101, 52] },
      3: { halign: "left" }, 4: { halign: "left" }, 14: { fontStyle: "bold" },
    },
    didParseCell: data => {
      if (data.section === "body" && data.column.index === 14) {
        // Use the source number, not a locale-formatted string.
        data.cell.styles.textColor = observations[data.row.index].dose > 0
          ? [185, 28, 28] : [22, 101, 52];
      }
    },
    margin: { left: 10, right: 10, bottom: 15 },
  });
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(t(`Pagina ${i} di ${pageCount} — NitroCrop NDVI · Taurus Agriculture Solution`),
      148.5, 205, { align: "center" });
  }
  return doc;
}
