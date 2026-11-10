import type { Observation } from "../App";

const strings = [
  "coltura", "data", "etaPiantina", "cliente", "appezzamento", "varieta",
] as const;
const numbers = [
  "giorni", "resa", "n1", "n2", "n3", "n4", "n5", "media", "ottimale", "discostamento", "dose",
] as const;
const optionalStrings = [
  "bbch", "faseFenologica", "faseFonte", "densitaUnita", "createdAt", "dataSemina",
] as const;
const optionalNumbers = [
  "densitaValore", "pianteHaEquivalenti", "azotoTotale", "azotoGiaDistribuito", "quotaAzoto",
] as const;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Structural boundary, not agronomic revalidation: retain legacy values,
 * nullable GPS and absent optional metadata. Never coerce, drop or deduplicate
 * records: a partial response must not replace a previously reliable snapshot.
 */
export function isObservationRegistry(value: unknown): value is Observation[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const record = row as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id.trim() || ids.has(record.id)) return false;
    ids.add(record.id);
    return strings.every(key => typeof record[key] === "string")
      && numbers.every(key => finite(record[key]))
      && ["lat", "lng"].every(key => record[key] === null || finite(record[key]))
      && (record.dataTrapianto === null || typeof record.dataTrapianto === "string")
      && optionalStrings.every(key => record[key] == null || typeof record[key] === "string")
      && optionalNumbers.every(key => record[key] == null || finite(record[key]));
  });
}
