import { isCatalogueCrop } from "@workspace/crop-calculations";

export const usesTenthsDose = (crop: string) => crop === "pomodoro" || isCatalogueCrop(crop);

/**
 * New doses are canonical tenths. Legacy fractions must remain visible as saved,
 * not silently rounded up or recalculated using today's model.
 */
export function formatRecordedDose(crop: string, value: number, locale?: string): string {
  if (!Number.isFinite(value)) return "—";
  if (!usesTenthsDose(crop) || Number(value.toFixed(1)) === value) {
    return locale ? value.toLocaleString(locale, {
      minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false,
    }) : value.toFixed(1);
  }
  const decimal = locale ? new Intl.NumberFormat(locale).formatToParts(1.1)
    .find(part => part.type === "decimal")?.value ?? "." : ".";
  return String(value).replace(".", decimal);
}
