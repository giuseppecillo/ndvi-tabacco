export type CatalogueFilters = { query: string; crop: string };

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Distinct crop values (column 0) in source order. */
export function catalogueCrops(rows: readonly (readonly string[])[]): string[] {
  return Array.from(new Set(rows.map(r => r[0] ?? "").filter(Boolean)));
}

/** Pure, read-only filter: never mutates or reformats source values. */
export function filterCatalogue<R extends readonly string[]>(rows: readonly R[], filters: CatalogueFilters, translate: (s: string) => string = s => s): R[] {
  const q = fold(filters.query);
  const terms = q ? q.split(/\s+/) : [];
  return rows.filter(row => {
    if (filters.crop && row[0] !== filters.crop) return false;
    if (!terms.length) return true;
    const hay = fold(row.map(c => `${c} ${translate(c)}`).join(" "));
    return terms.every(term => hay.includes(term));
  });
}
