/** Offline-source arithmetic means. Never creates a donor for an absent crop. */
export type CropMeanRequest = {
  crop: string;
  name: string;
  destination: string;
  use: string;
  earliness: string;
  identitySource: string;
};
type Snapshot = { columns: readonly string[]; rows: readonly (readonly string[])[] };
const numericColumns = [
  "Piante/ha", "Resa media (t/ha)", "Azoto Totale (kg/ha)",
  ...[1, 2, 3, 4].flatMap(i => [`N F${i} (kg/ha)`, `NDVI F${i}`]),
];
const phaseColumns = [1, 2, 3, 4].flatMap(i => [`Fase F${i}`, `BBCH F${i}`]);
const identity = (crop: string, name: string) => JSON.stringify([crop, name.normalize("NFKC").trim().toLocaleLowerCase("it")]);
const numeric = (text: string) => {
  if (!text.trim()) return NaN;
  const parts = text.trim().split(/(?<=\d)\s*[-–—]\s*(?=\d)/).map(s => Number(s.replace(",", ".")));
  return parts.length <= 2 && parts.every(Number.isFinite)
    ? parts.reduce((a, b) => a + b, 0) / parts.length : NaN;
};

/**
 * Only original, complete rows form the frozen donor cohort. The output is not
 * fed back into the input. Categories/BBCH are never averaged. Independent
 * varieties have equal weight and the same destination, use and phase scheme.
 * These are catalogue-reference means, not new experimental calibrations.
 */
export function buildCropMeanProfiles(source: Snapshot, requests: readonly CropMeanRequest[]) {
  const columns = [...source.columns];
  const index = (key: string) => columns.indexOf(key);
  const required = ["Coltura", "Varietà", "Destinazione", "Impiego", "Precocità", ...numericColumns, ...phaseColumns];
  if (required.some(key => index(key) < 0)) throw new Error("CROP_MEAN_COLUMNS_MISSING");
  const cell = (row: readonly string[], key: string) => row[index(key)] ?? "";
  const valid = (row: readonly string[]) => {
    if (row.length !== columns.length || required.some(key => !cell(row, key).trim())) return false;
    if (numericColumns.some(key => {
      const value = numeric(cell(row, key));
      return !Number.isFinite(value) || value < 0 || (key.startsWith("NDVI") ? value <= 0 || value > 1
        : !key.startsWith("N F") && value === 0);
    })) return false;
    if ([1, 2, 3, 4].some(i => !/^\d{2}(?:-\d{2})?$/.test(cell(row, `BBCH F${i}`)))) return false;
    const total = numeric(cell(row, "Azoto Totale (kg/ha)"));
    const doses = [1, 2, 3, 4].map(i => numeric(cell(row, `N F${i} (kg/ha)`)));
    return doses.every(n => n <= total) && Math.abs(doses.reduce((a, b) => a + b, 0) - total) <= .21;
  };
  const seen = new Set<string>();
  for (const row of source.rows) {
    const key = identity(cell(row, "Coltura"), cell(row, "Varietà"));
    if (seen.has(key)) throw new Error("CROP_MEAN_DUPLICATE_DONOR");
    seen.add(key);
  }
  const rows: string[][] = [];
  const trace: {
    crop: string; name: string; identitySource: string; donorVarieties: string[];
    method: string; experimentallyValidated: false;
    values: Record<string, { value: number; count: number; min: number; max: number }>;
  }[] = [];
  const excluded: { crop: string; name: string; reason: string }[] = [];
  for (const request of requests) {
    const reject = (reason: string) => excluded.push({ crop: request.crop, name: request.name, reason });
    const key = identity(request.crop, request.name);
    if (Object.values(request).some(v => !v.trim()) || !/^https:\/\//.test(request.identitySource)) {
      reject("CROP_MEAN_IDENTITY_INCOMPLETE"); continue;
    }
    if (seen.has(key)) { reject("CROP_MEAN_IDENTITY_EXISTS"); continue; }
    const donors = source.rows.filter(row => cell(row, "Coltura") === request.crop
      && cell(row, "Destinazione") === request.destination && cell(row, "Impiego") === request.use && valid(row));
    if (!donors.length) { reject("CROP_MEAN_NO_SAME_CROP_DATA"); continue; }
    if (phaseColumns.some(column => new Set(donors.map(row => cell(row, column))).size !== 1)) {
      reject("CROP_MEAN_INCOMPATIBLE_PHASES"); continue;
    }
    const row = Array<string>(columns.length).fill("");
    const set = (column: string, value: string) => { row[index(column)] = value; };
    for (const [column, value] of [
      ["Coltura", request.crop], ["Varietà", request.name], ["Destinazione", request.destination],
      ["Impiego", request.use], ["Precocità", request.earliness],
    ]) set(column, value);
    for (const column of phaseColumns) set(column, cell(donors[0], column));
    const values: Record<string, { value: number; count: number; min: number; max: number }> = {};
    for (const column of numericColumns) {
      const numbers = donors.map(donor => numeric(cell(donor, column)));
      const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      // Display precision for a mean is not a claim of field-measurement accuracy.
      const value = Number(mean.toFixed(column.startsWith("NDVI") ? 3 : 2));
      set(column, String(value));
      values[column] = { value, count: donors.length, min: Math.min(...numbers), max: Math.max(...numbers) };
    }
    if (!valid(row)) { reject("CROP_MEAN_RESULT_INCOMPLETE"); continue; }
    rows.push(row);
    seen.add(key);
    trace.push({
      crop: request.crop, name: request.name, identitySource: request.identitySource,
      donorVarieties: donors.map(donor => cell(donor, "Varietà")).sort(),
      method: "Media aritmetica delle varietà originarie della stessa coltura, destinazione e impiego; fasi coerenti; nessuna media ricorsiva",
      experimentallyValidated: false, values,
    });
  }
  return { rows, trace, excluded };
}
