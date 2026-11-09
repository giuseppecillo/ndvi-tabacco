/** Derived maps only: never use these functions to rewrite recorded observations. */
export const IDW_DECIMALS = 4;

/** Largest nonnegative decimal step no greater than the actual binary input.
 * No epsilon: multiplication itself can round across a decimal boundary.
 */
export function conservativeIdwValue(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Valore IDW non finito");
  if (value <= 0) return 0;
  if (value > Number.MAX_SAFE_INTEGER / 10 ** IDW_DECIMALS) {
    throw new Error("Valore IDW fuori intervallo");
  }
  let units = Math.floor(value * 10 ** IDW_DECIMALS);
  while (units / 10 ** IDW_DECIMALS > value) units--;
  while ((units + 1) / 10 ** IDW_DECIMALS <= value) units++;
  return units / 10 ** IDW_DECIMALS;
}

export function formatIdwValue(value: number): string {
  return conservativeIdwValue(value).toFixed(IDW_DECIMALS);
}

/** Float32 round-to-nearest may exceed the prescription. Step down one ULP. */
export function conservativeFloat32(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Dose IDW non valida");
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true);
  if (view.getFloat32(0, true) > value) {
    view.setUint32(0, view.getUint32(0, true) - 1, true);
  }
  return view.getFloat32(0, true);
}
