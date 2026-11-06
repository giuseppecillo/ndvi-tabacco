import type { Observation } from "../../src/App";

/** Entirely invented GPS observations. Never seed these into a database. */
export const observations: Observation[] = [
  [12.0003, 42.0003],
  [12.0009, 42.0003],
  [12.0003, 42.0006],
  [12.0009, 42.0006],
].map(([lng, lat], i) => ({
  id: `QA-IDW-${i + 1}`,
  coltura: "tabacco",
  data: "2026-06-01",
  dataTrapianto: "2026-05-01",
  giorni: 31,
  etaPiantina: "standard",
  cliente: "QA sintetico",
  appezzamento: "Campo sintetico IDW",
  resa: 3,
  varieta: "Burley (Non Cimato)",
  n1: 0.4, n2: 0.4, n3: 0.4, n4: 0.4, n5: 0.4,
  media: 0.4,
  ottimale: 0.5,
  discostamento: -20,
  dose: 30,
  azotoTotale: 100,
  azotoGiaDistribuito: 20,
  lat,
  lng,
}));
