import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { computeIdwGrid, type ControlPoint, type KmlPolygon } from "./geoUtils";
import { estimateIdwWorkload, IdwCalculationError, IDW_ERRORS, IDW_LIMITS } from "./idwLimits";

const field = (size = 0.001): KmlPolygon => ({
  name: "synthetic", ring: [[15, 41], [15 + size, 41], [15 + size, 41 + size],
    [15, 41 + size], [15, 41]],
});
const control: ControlPoint = {
  obsId: "synthetic", cliente: "synthetic", appezzamento: "synthetic",
  lng: 15.0005, lat: 41.0005, dose: 10.1234,
  azotoTotale: 20, azotoGiaDistribuito: 9.8766,
};
const rejected = (fn: () => unknown, message = IDW_ERRORS.limit) =>
  assert.throws(fn, e => e instanceof IdwCalculationError && e.message === message);

test("small synthetic field retains full grid and conservative doses", () => {
  const estimate = estimateIdwWorkload(field(), [control]);
  const result = computeIdwGrid(field(), [control]);
  assert(result.grid.length > 0);
  assert(result.grid.length <= estimate.cells);
  assert(result.grid.every(p => p.dose <= control.dose && p.dose <= 20 - 9.8766));
  assert.equal(result.stats.count, result.grid.length);
});

test("few-vertex continental polygon is rejected before generating any cell", () => {
  const start = performance.now();
  rejected(() => computeIdwGrid(field(10), [control]));
  assert(performance.now() - start < 1000, "large bounding box must fail promptly");
});

test("control count scales estimated work, including three nitrogen passes", () => {
  const poly = field(0.01);
  const low = estimateIdwWorkload(poly, [control]);
  const high = estimateIdwWorkload(poly, Array(10).fill(control));
  assert.equal(high.work - low.work, low.cells * 3 * 9);
  assert(low.cells < IDW_LIMITS.cells);
  rejected(() => computeIdwGrid(poly, Array(1000).fill(control)));
});

test("complex holes are budgeted without subtracting their area", () => {
  const poly = field(0.01);
  poly.holes = [Array.from({ length: 1000 }, (_, i) =>
    [15.005 + Math.cos(i) * 0.001, 41.005 + Math.sin(i) * 0.001])];
  rejected(() => computeIdwGrid(poly, [control]));
});

test("oversized vertices and controls are rejected independently", () => {
  rejected(() => computeIdwGrid({ ...field(), ring: Array(IDW_LIMITS.vertices + 1).fill([15, 41]) }, [control]));
  rejected(() => computeIdwGrid(field(), Array(IDW_LIMITS.controls + 1).fill(control)));
});

test("bad spacing, power, coordinates and empty geometry cannot start grid loops", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    rejected(() => computeIdwGrid(field(), [control], value), IDW_ERRORS.invalid);
    rejected(() => computeIdwGrid(field(), [control], 10, value), IDW_ERRORS.invalid);
  }
  rejected(() => computeIdwGrid({ name: "synthetic", ring: [] }, [control]), IDW_ERRORS.invalid);
  rejected(() => computeIdwGrid(field(), [{ ...control, lat: NaN }]), IDW_ERRORS.invalid);
  rejected(() => computeIdwGrid(field(), [{ ...control, dose: Infinity }]), IDW_ERRORS.invalid);
});

test("near-limit grid succeeds, over-limit and degenerate long fields fail", () => {
  const near = field(0.015);
  assert(estimateIdwWorkload(near, [control]).cells > 20_000);
  assert(computeIdwGrid(near, [control]).grid.length > 20_000);
  rejected(() => computeIdwGrid(field(0.02), [control]));
  rejected(() => computeIdwGrid({
    name: "synthetic-line", ring: [[15, 1], [15, 80], [15, 1]],
  }, [control]));
});

test("UI clears the selected result and preflights before quota or computation", () => {
  const source = readFileSync(new URL("../ElaborazioniMappe.tsx", import.meta.url), "utf8");
  const run = source.slice(source.indexOf("const runIdw ="), source.indexOf("const currentResult ="));
  const clear = run.indexOf("next.delete(selPolyIdx)");
  const estimate = run.indexOf("estimateIdwWorkload(");
  const quota = run.indexOf("await getMyUsage(");
  const compute = run.indexOf("computeIdwGrid(");
  const register = run.indexOf("await registerGeneratedMap(");
  const publish = run.indexOf("new Map(prev).set(selPolyIdx, result)");
  assert(clear >= 0 && clear < estimate && estimate < quota && quota < compute);
  assert(compute < register && register < publish);
  assert.match(run.slice(estimate, quota), /catch[\s\S]*setQuotaError[\s\S]*return;/);
});
