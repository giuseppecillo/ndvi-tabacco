import { test } from "node:test";
import assert from "node:assert/strict";
import { alphabetical } from "./alphabetical";
import { catalogueCrops } from "../catalogue/filterCatalogue";

test("sorts varieties naturally, ignoring case and accents without changing source data", () => {
  const source = Object.freeze([
    Object.freeze({ id: "z", name: "Zeta" }),
    Object.freeze({ id: "a10", name: "Àlfa 10" }),
    Object.freeze({ id: "a2", name: "alfa 2" }),
    Object.freeze({ id: "b", name: "Beta" }),
  ]);
  const sorted = alphabetical(source, item => item.name);
  assert.deepEqual(sorted.map(item => item.id), ["a2", "a10", "b", "z"]);
  assert.equal(source[0].id, "z");
  assert.equal(sorted[0], source[2]);
});

test("sorts crops by translated labels and preserves original crop identifiers", () => {
  const rows = [["Tabacco"], ["Grano duro"], ["Pomodoro"], ["Aglio"], ["Tabacco"]];
  const labels: Record<string, string> = {
    Tabacco: "Tobacco", "Grano duro": "Durum wheat", Pomodoro: "Tomato", Aglio: "Garlic",
  };
  assert.deepEqual(catalogueCrops(rows), ["Aglio", "Grano duro", "Pomodoro", "Tabacco"]);
  assert.deepEqual(catalogueCrops(rows, s => labels[s], "en-GB"), ["Grano duro", "Aglio", "Tabacco", "Pomodoro"]);
});
