import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { Request, Response } from "express";
import router, { erroreOsservazioneGrano, erroreOsservazioneTabacco } from "./osservazioni";
import pool from "../lib/db";
import { PRIMO_POMODORO } from "@workspace/tomato-calculations";

test("tomato POST and GET preserve crop, profile, phase, coordinates and dose using only a mocked pool", async () => {
  const body = {
    id: "synthetic-tomato", coltura: "pomodoro", data: "2026-11-08", dataTrapianto: "2026-10-19",
    cliente: "Synthetic customer", appezzamento: "Synthetic field", lat: 41.1, lng: 14.2,
    varieta: PRIMO_POMODORO, faseFenologica: "Sviluppo", faseFonte: "Fase osservata in campo", bbch: null,
    resa: 100, azotoGiaDistribuito: 0, azotoTotale: 250, quotaAzoto: 18.8,
    dose: 18.8, media: .2, ottimale: .4, discostamento: .2,
    densitaValore: 30000, pianteHaEquivalenti: 30000, densitaUnita: "piante/ha", giorni: 20,
    n1: .2, n2: .2, n3: .2, n4: .2, n5: .2, etaPiantina: "standard",
  };
  const post = router.stack.find(layer => layer.route?.path === "/osservazioni"
    && layer.route.stack.some(handler => handler.method === "post"))!.route!.stack[0].handle;
  const get = router.stack.find(layer => layer.route?.path === "/osservazioni"
    && layer.route.stack.some(handler => handler.method === "get"))!.route!.stack[0].handle;
  const writes: unknown[][] = [];
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    if (sql.trimStart().startsWith("INSERT")) {
      writes.push(values);
      return { rows: [{ createdAt: "2026-11-08T12:00:00Z" }] };
    }
    return { rows: [{ ...body, createdAt: "2026-11-08T12:00:00Z" }] };
  });
  let status = 0;
  let payload: unknown;
  const res = {
    locals: { account: { id: "synthetic-owner", role: "admin" } },
    status(value: number) { status = value; return this; },
    json(value: unknown) { payload = value; return this; },
  } as unknown as Response;
  try {
    await post({ body } as Request, res, () => {});
    assert.equal(status, 201);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][3], "pomodoro");
    assert.equal(writes[0][9], PRIMO_POMODORO);
    assert.equal(writes[0][21], 18.8);
    assert.equal(writes[0][22], "Sviluppo");
    assert.equal(writes[0][24], "Fase osservata in campo");
    assert.equal(writes[0][28], 41.1);
    assert.equal(writes[0][29], 14.2);
    await get({} as Request, res, () => {});
    const rows = payload as typeof body[];
    assert.equal(rows[0].coltura, "pomodoro");
    assert.equal(rows[0].varieta, PRIMO_POMODORO);
    assert.equal(rows[0].dose, 18.8);
    for (const change of [{ dose: 30 }, { faseFonte: null }, { varieta: "unknown" }, { ottimale: .5 }]) {
      await post({ body: { ...body, ...change } } as Request, res, () => {});
      assert.equal(status, 400);
      assert.equal(writes.length, 1);
    }
  } finally { query.mock.restore(); }
});

const pianoGranoValido = (): Record<string, unknown> => ({
  coltura: "grano duro",
  varieta: "Redidenari",
  resa: 50,
  densitaValore: 385,
  densitaUnita: "semi/m²",
  giorni: 130,
  bbch: "20–29",
  faseFonte: "BBCH confermato in campo",
  faseFenologica: "Accestimento",
  n1: 0.4,
  n2: 0.4,
  n3: 0.4,
  n4: 0.4,
  n5: 0.4,
  media: 0.4,
  ottimale: 0.5411764705882353,
  discostamento: 0.1411764705882353,
  azotoTotale: 150,
  azotoGiaDistribuito: 60,
  dose: 12,
  quotaAzoto: 12,
});

test("standard grain accepts the frontend parity matrix, including clamped quotas and residual plans", () => {
  // Same independently specified expectations as App.test.ts; no database calls.
  const fixtures = [
    { yield: 40, factor: 0.9, total: 108, quotas: [27, 40, 40, 20] },
    { yield: 40, factor: 1, total: 120, quotas: [27, 40, 40, 20] },
    { yield: 40, factor: 1.1, total: 132, quotas: [27, 40, 44, 22] },
    { yield: 50, factor: 0.9, total: 135, quotas: [28, 40, 45, 22] },
    { yield: 50, factor: 1, total: 150, quotas: [31, 45, 50, 25] },
    { yield: 50, factor: 1.1, total: 165, quotas: [34, 49, 54, 27] },
    { yield: 60, factor: 0.9, total: 162, quotas: [34, 48, 53, 27] },
    { yield: 60, factor: 1, total: 180, quotas: [36, 50, 59, 30] },
    { yield: 60, factor: 1.1, total: 198, quotas: [36, 50, 60, 30] },
  ];
  const phases = [
    { bbch: "00–09", label: "Semina / emergenza", das: 10, reference: 0.27 },
    { bbch: "20–29", label: "Accestimento", das: 100, reference: 0.4 + 50 / 85 * 0.15 },
    { bbch: "30–32", label: "Inizio levata", das: 150, reference: 0.65 + 14 / 29 * 0.07 },
    { bbch: "37–39", label: "Foglia a bandiera", das: 180, reference: 0.73 + 14 / 24 * 0.12 },
  ];
  for (const fixture of fixtures) {
    assert.equal(Math.round(fixture.yield * 3 * fixture.factor), fixture.total);
    for (const [index, phase] of phases.entries()) {
      for (const relativeNdvi of [0, 0.5, 1, 1.1]) {
        for (const applied of [0, fixture.total - 2.4, fixture.total - 10.4, fixture.total, fixture.total + 5]) {
          const mean = phase.reference * relativeNdvi;
          const dose = Math.min(
            Math.max(0, Math.round(fixture.total - applied)),
            Math.round(fixture.quotas[index] * Math.max(0, 1 - relativeNdvi)),
          );
          const plan = {
            ...pianoGranoValido(), varieta: "Redidenari", resa: fixture.yield,
            densitaValore: fixture.factor === 0.9 ? 192.5 : fixture.factor === 1.1 ? 577.5 : 385,
            giorni: phase.das, bbch: phase.bbch, faseFenologica: phase.label,
            n1: mean, n2: mean, n3: mean, n4: mean, n5: mean, media: mean,
            ottimale: phase.reference, discostamento: phase.reference - mean,
            azotoTotale: fixture.total, azotoGiaDistribuito: applied, dose, quotaAzoto: dose,
          };
          assert.equal(erroreOsservazioneGrano(plan), null, JSON.stringify({ fixture, phase, relativeNdvi, applied }));
          assert.match(erroreOsservazioneGrano({ ...plan, dose: dose + 1, quotaAzoto: dose + 1 }) ?? "", /quota ricalcolata/);
        }
      }
    }
  }
});

// Independent varietal references: never derive expected PMG or totals from the
// production module, otherwise app and API could share the same regression.
const varietaStandard = [
  { varieta: "Redidenari", semiMq: 385, pmg: 55.8 },
  { varieta: "Telemaco", semiMq: 385, pmg: 53.2 },
  { varieta: "President", semiMq: 325, pmg: 59.2 },
  { varieta: "Federico II", semiMq: 350, pmg: 51.4 },
  { varieta: "Egeo", semiMq: 385, pmg: 55.8 },
  { varieta: "Minosse", semiMq: 405, pmg: 55.6 },
  { varieta: "Spineto", semiMq: 425, pmg: 56.5 },
  { varieta: "Farah", semiMq: 475, pmg: 56.8 },
  { varieta: "Furio Camillo", semiMq: 425, pmg: 50.6 },
  { varieta: "Marco Aurelio", semiMq: 425, pmg: 50.6 },
  { varieta: "Nazareno", semiMq: 375, pmg: 45.3 },
  { varieta: "Quadrato", semiMq: 425, pmg: 56.5 },
  { varieta: "Giulio", semiMq: 385, pmg: 53.2 },
];

const pianoSemina = (input: Record<string, unknown>): Record<string, unknown> => ({
  ...pianoGranoValido(),
  giorni: 10, bbch: "00–09", faseFenologica: "Semina / emergenza",
  n1: 0, n2: 0, n3: 0, n4: 0, n5: 0,
  media: 0, ottimale: 0.27, discostamento: 0.27,
  azotoGiaDistribuito: 0, dose: 31, quotaAzoto: 31,
  ...input,
});

test("all standard varieties validate PMG conversions, yields and bounded density corrections", () => {
  const yields = [
    { resa: 0.1, totals: [0, 0, 0, 0, 0], doses: [0, 0, 0, 0, 0] },
    { resa: 40, totals: [108, 120, 132, 115, 125], doses: [27, 27, 27, 27, 27] },
    { resa: 50, totals: [135, 150, 165, 144, 156], doses: [28, 31, 34, 30, 32] },
    { resa: 60, totals: [162, 180, 198, 173, 187], doses: [34, 36, 36, 36, 36] },
    // Round yield * 3 first, then apply the density correction.
    { resa: 50.17, totals: [136, 151, 166, 145, 157], doses: [28, 31, 35, 30, 33] },
    { resa: 72, totals: [194, 216, 238, 207, 225], doses: [36, 36, 36, 36, 36] },
  ];
  for (const variety of varietaStandard) {
    // The extremes are warnings in the app, not prohibitions: retain the
    // existing +/-10% cap instead of inventing new agronomic limits.
    for (const [ratio, index] of [[0.01, 0], [0.6, 0], [0.84, 3], [1, 1], [1.16, 4], [1.4, 2], [3, 2]]) {
      const semiMq = variety.semiMq * ratio;
      for (const [densitaUnita, densitaValore] of [
        ["semi/m²", semiMq],
        ["semi/ha", semiMq * 10_000],
        ["kg/ha", semiMq * variety.pmg / 100],
      ] as const) {
        for (const fixture of yields) {
          const plan = pianoSemina({
            varieta: variety.varieta, resa: fixture.resa, densitaUnita, densitaValore,
            azotoTotale: fixture.totals[index], dose: fixture.doses[index], quotaAzoto: fixture.doses[index],
            // A client-supplied equivalent must not influence the calculation.
            pianteHaEquivalenti: 1,
          });
          const label = JSON.stringify({ variety, ratio, densitaUnita, fixture });
          assert.equal(erroreOsservazioneGrano(plan), null, label);
          assert.match(erroreOsservazioneGrano({
            ...plan, azotoTotale: fixture.totals[index] + 1,
          }) ?? "", /fabbisogno grano/, label);
          assert.match(erroreOsservazioneGrano({
            ...plan, azotoTotale: fixture.totals[index] - 1,
          }) ?? "", /fabbisogno grano|non sono validi/, label);
        }
      }
    }
  }
});

test("preserves the app's existing PMG floating-point rounding at half-unit boundaries", () => {
  // The original kg/ha conversion produces 389.99999999999994 seeds/m²,
  // not exactly 390. Do not introduce an epsilon that changes agronomic advice.
  for (const [densitaUnita, densitaValore, azotoTotale, dose] of [
    ["kg/ha", 230.88, 157, 33],
    ["semi/m²", 390, 158, 33],
    ["semi/ha", 3_900_000, 158, 33],
  ]) {
    assert.equal(erroreOsservazioneGrano(pianoSemina({
      varieta: "President", resa: 50, densitaUnita, densitaValore, azotoTotale, dose, quotaAzoto: dose,
    })), null);
  }
});

test("standard grain rejects missing or invalid yield, density and variety without defaults", () => {
  for (const { varieta, semiMq } of varietaStandard) {
    const plan = { ...pianoGranoValido(), varieta, densitaValore: semiMq };
    for (const key of ["resa", "densitaValore"]) {
      for (const value of [undefined, null, "", "  ", true, false, NaN, Infinity, -Infinity, "abc", {}, [], 0, -1]) {
        assert.match(erroreOsservazioneGrano({ ...plan, [key]: value }) ?? "", /Resa e densità/, `${varieta}: ${key}=${String(value)}`);
      }
    }
    for (const densitaUnita of [undefined, null, "", "piante/ha", "semi/m2", "KG/HA", {}, true]) {
      assert.match(erroreOsservazioneGrano({ ...plan, densitaUnita }) ?? "", /Resa e densità/);
    }
    for (const azotoTotale of [undefined, null, "", true, NaN, Infinity]) {
      assert.match(erroreOsservazioneGrano({ ...plan, azotoTotale }) ?? "", /non sono completi/);
    }
  }
  for (const varieta of [undefined, null, "", "sconosciuta", "redidenari", "toString", "__proto__", "constructor", {}, true]) {
    assert.match(erroreOsservazioneGrano({ ...pianoGranoValido(), varieta }) ?? "", /varietà/);
  }
  // Retain numeric string handling at the API boundary.
  assert.equal(erroreOsservazioneGrano({
    ...pianoGranoValido(), resa: "50", densitaValore: "385", azotoTotale: "150",
  }), null);
  for (const input of [
    { resa: Number.MAX_VALUE },
    { densitaValore: Number.MAX_VALUE, densitaUnita: "kg/ha" },
  ]) {
    assert.ok(erroreOsservazioneGrano({ ...pianoGranoValido(), ...input }));
  }
  // Same tolerance as the existing RGT NATUR and dose checks.
  assert.equal(erroreOsservazioneGrano({ ...pianoGranoValido(), azotoTotale: 150.009 }), null);
  assert.match(erroreOsservazioneGrano({ ...pianoGranoValido(), azotoTotale: 150.02 }) ?? "", /fabbisogno grano/);
});

test("rejects standard totals with consistently forged doses, even when the dose is zero", () => {
  const plan = pianoSemina({ azotoTotale: 150 });
  assert.equal(erroreOsservazioneGrano(plan), null);
  for (const input of [
    { azotoTotale: 300, dose: 36, quotaAzoto: 36 },
    { azotoTotale: 108, dose: 27, quotaAzoto: 27 },
    { azotoTotale: 300, azotoGiaDistribuito: 300, dose: 0, quotaAzoto: 0 },
    { azotoTotale: 300, n1: 0.27, n2: 0.27, n3: 0.27, n4: 0.27, n5: 0.27, media: 0.27, discostamento: 0, dose: 0, quotaAzoto: 0 },
    { resa: 60 },
    { densitaValore: 577.5 },
    // Telemaco's PMG, incorrectly reused for Redidenari, would give 150 N.
    { densitaUnita: "kg/ha", densitaValore: 204.82 },
  ]) {
    assert.match(erroreOsservazioneGrano({ ...plan, ...input }) ?? "", /fabbisogno grano/);
  }
});

test("POST rejects forged standard nitrogen plans before any database write, including legacy crop aliases", async () => {
  const layer = router.stack.find((item) => item.route?.path === "/osservazioni"
    && item.route.stack.some((handler) => handler.method === "post"));
  assert.ok(layer?.route);
  const save = layer.route.stack[0].handle;
  const query = mock.method(pool, "query", async () => {
    throw new Error("Invalid plans must never reach PostgreSQL");
  });
  try {
    for (const cropField of ["coltura", "tipoIntervento"]) {
      for (const input of [
        { azotoTotale: 300, dose: 36, quotaAzoto: 36 },
        { azotoTotale: 108, dose: 27, quotaAzoto: 27 },
        { resa: undefined }, { densitaValore: null }, { densitaUnita: "piante/ha" }, { varieta: "unknown" },
      ]) {
        const body = pianoSemina({ id: "qa-forged-standard", ...input });
        delete body.coltura;
        body[cropField] = "grano duro";
        let status = 0;
        let payload: unknown;
        const response = {
          locals: { account: { id: "qa-synthetic-owner", role: "admin" } },
          status(value: number) { status = value; return this; },
          json(value: unknown) { payload = value; return this; },
        } as unknown as Response;
        await save({ body } as Request, response, () => {});
        assert.equal(status, 400, JSON.stringify({ cropField, input }));
        assert.ok((payload as { error: string }).error);
      }
    }
    assert.equal(query.mock.callCount(), 0);
  } finally {
    query.mock.restore();
  }
});

test("save dispatch validates both coltura and legacy tipoIntervento without connecting to PostgreSQL", async () => {
  const layer = router.stack.find((item) => item.route?.path === "/osservazioni"
    && item.route.stack.some((handler) => handler.method === "post"));
  assert.ok(layer?.route);
  const save = layer.route.stack[0].handle;
  const writes: unknown[][] = [];
  const query = mock.method(pool, "query", async (_sql: string, values: unknown[]) => {
    writes.push(values);
    return { rows: [{ createdAt: "2026-01-01T00:00:00.000Z" }] };
  });
  try {
    for (const cropField of ["coltura", "tipoIntervento"] as const) {
      for (const dose of [14, 13]) {
        const body: Record<string, unknown> = {
          ...pianoGranoValido(), id: "qa-standard-parity", varieta: "Telemaco",
          data: "2026-01-01", cliente: "Synthetic customer",
          resa: 40, densitaValore: 385,
          giorni: 10, bbch: "00–09", faseFenologica: "Semina / emergenza",
          n1: 0.135, n2: 0.135, n3: 0.135, n4: 0.135, n5: 0.135,
          media: 0.135, ottimale: 0.27, discostamento: 0.135,
          azotoTotale: 120, azotoGiaDistribuito: 0, dose, quotaAzoto: dose,
        };
        delete body.coltura;
        body[cropField] = "grano duro";
        let status = 0;
        let payload: unknown;
        const response = {
          locals: { account: { id: "qa-synthetic-owner", role: "admin" } },
          status(value: number) { status = value; return this; },
          json(value: unknown) { payload = value; return this; },
        } as unknown as Response;
        const previousWrites = writes.length;
        await save({ body } as Request, response, () => {});
        assert.equal(status, dose === 14 ? 201 : 400);
        assert.equal(writes.length - previousWrites, dose === 14 ? 1 : 0);
        if (dose === 14) {
          assert.deepEqual(payload, { ok: true, createdAt: "2026-01-01T00:00:00.000Z" });
          assert.equal(writes.at(-1)?.[3], "grano duro");
          assert.equal(writes.at(-1)?.[21], 14);
          assert.equal(writes.at(-1)?.[30], "qa-synthetic-owner");
        }
      }
    }
  } finally {
    query.mock.restore();
  }
});

test("RGT NATUR validates its own phase quotas and rejects tampered plans", () => {
  for (const [bbch, phase, reference, quota] of [
    ["00–09", "Semina / emergenza", 0.27, 30],
    ["30–39", "Levata", 0.65 + 14 / 29 * 0.07, 90],
    ["41–49", "Botticella", 0.85, 60],
  ] as const) {
    const das = bbch === "00–09" ? 10 : bbch === "30–39" ? 150 : 190;
    const mean = reference / 2;
    const plan = {
      ...pianoGranoValido(), varieta: "RGT NATUR", resa: 60, densitaValore: 220, densitaUnita: "kg/ha",
      giorni: das, bbch, faseFenologica: phase, azotoTotale: 180, azotoGiaDistribuito: 0,
      n1: mean, n2: mean, n3: mean, n4: mean, n5: mean, media: mean,
      ottimale: reference, discostamento: reference - mean, dose: quota / 2, quotaAzoto: quota / 2,
    };
    assert.equal(erroreOsservazioneGrano(plan), null);
    assert.ok(erroreOsservazioneGrano({ ...plan, azotoTotale: 300 }));
    assert.ok(erroreOsservazioneGrano({ ...plan, dose: quota, quotaAzoto: quota }));
    assert.ok(erroreOsservazioneGrano({ ...plan, bbch: "20–29" }));
    assert.ok(erroreOsservazioneGrano({ ...plan, densitaUnita: "piante/ha" }));
    assert.equal(erroreOsservazioneGrano({
      ...plan, n1: reference, n2: reference, n3: reference, n4: reference, n5: reference,
      media: reference, discostamento: 0, dose: 0, quotaAzoto: 0,
    }), null);
    assert.equal(erroreOsservazioneGrano({ ...plan, azotoGiaDistribuito: 175, dose: 5, quotaAzoto: 5 }), null);
  }
});

test("RGT NATUR retains its yield and density checks in all supported units", () => {
  for (const [resa, total, quota] of [[40, 120, 20], [50, 150, 25], [60, 180, 30]]) {
    for (const [densitaUnita, densitaValore] of [
      ["kg/ha", 220], ["semi/m²", 440], ["semi/ha", 4_400_000],
    ]) {
      const plan = pianoSemina({
        varieta: "RGT NATUR", resa, densitaUnita, densitaValore,
        azotoTotale: total, dose: quota, quotaAzoto: quota,
      });
      assert.equal(erroreOsservazioneGrano(plan), null);
      assert.match(erroreOsservazioneGrano({ ...plan, azotoTotale: total + 1 }) ?? "", /fabbisogno grano/);
      assert.match(erroreOsservazioneGrano({ ...plan, resa: undefined }) ?? "", /Resa e densità/);
      assert.match(erroreOsservazioneGrano({ ...plan, densitaValore: null }) ?? "", /Resa e densità/);
    }
  }
});

const pianoTabaccoValido = (): Record<string, unknown> => ({
  coltura: "tabacco",
  giorni: 42,
  etaPiantina: "standard",
  resa: 4.5,
  n1: 0.5,
  n2: 0.5,
  n3: 0.5,
  n4: 0.5,
  n5: 0.5,
  media: 0.5,
  ottimale: 0.64,
  discostamento: 0.14,
  fabbisognoN: 120,
  azotoTotale: 120,
  azotoGiaDistribuito: 0,
  dose: 26.3,
});

test("accepts the canonical grain plan produced by the app", () => {
  assert.equal(erroreOsservazioneGrano(pianoGranoValido()), null);
});

test("accepts the proportional tobacco NDVI plan", () => {
  assert.equal(erroreOsservazioneTabacco(pianoTabaccoValido()), null);
});

test("validates independent tobacco curve and nursery-age expectations", () => {
  const cases = [
    { giorni: 0, etaPiantina: "standard", reference: 0.28 },
    { giorni: 7, etaPiantina: "standard", reference: 0.31 },
    { giorni: 0, etaPiantina: "avanzata", reference: 0.31 },
    { giorni: 0, etaPiantina: "extra", reference: 0.34 },
    { giorni: 35, etaPiantina: "standard", reference: 0.56 },
    { giorni: 28, etaPiantina: "avanzata", reference: 0.56 },
    { giorni: 21, etaPiantina: "extra", reference: 0.56 },
    { giorni: 55, etaPiantina: "standard", reference: 0.70 },
    { giorni: 60, etaPiantina: "standard", reference: 0.745 },
    { giorni: 65, etaPiantina: "standard", reference: 0.79 },
    { giorni: 75, etaPiantina: "standard", reference: 0.80 },
    { giorni: 85, etaPiantina: "standard", reference: 0.80 },
    { giorni: 90, etaPiantina: "standard", reference: 0.775 },
    { giorni: 95, etaPiantina: "standard", reference: 0.75 },
    { giorni: 110, etaPiantina: "standard", reference: 0.68 },
    { giorni: 130, etaPiantina: "standard", reference: 0.60 },
    { giorni: 160, etaPiantina: "extra", reference: 0.60 },
  ];
  for (const { reference, ...input } of cases) {
    const plan = {
      ...pianoTabaccoValido(), ...input,
      n1: reference, n2: reference, n3: reference, n4: reference, n5: reference,
      media: reference, ottimale: reference, discostamento: 0, dose: 0,
    };
    assert.equal(erroreOsservazioneTabacco(plan), null, JSON.stringify(input));
    assert.match(erroreOsservazioneTabacco({ ...plan, ottimale: reference + 0.01 }) ?? "", /calendario fenologico/);
  }
});

test("preserves tobacco quota rounding and rejects altered doses", () => {
  const cases = [
    { reading: 0.5, azotoTotale: 120, azotoGiaDistribuito: 0, dose: 26.3 },
    { reading: 0.5, azotoTotale: 120.04, azotoGiaDistribuito: 100, dose: 20 },
    { reading: 0.5, azotoTotale: 120.06, azotoGiaDistribuito: 100, dose: 20.1 },
    { reading: 0, azotoTotale: 120, azotoGiaDistribuito: 0, dose: 120 },
    { reading: 0.5, azotoTotale: 120, azotoGiaDistribuito: 125, dose: 0 },
    { reading: 0.64, azotoTotale: 120, azotoGiaDistribuito: 0, dose: 0 },
    { reading: 1, azotoTotale: 120, azotoGiaDistribuito: 0, dose: 0 },
  ];
  for (const { reading, ...input } of cases) {
    const plan = {
      ...pianoTabaccoValido(), ...input,
      n1: reading, n2: reading, n3: reading, n4: reading, n5: reading,
      media: reading, discostamento: Math.max(0, 0.64 - reading),
    };
    assert.equal(erroreOsservazioneTabacco(plan), null, JSON.stringify(input));
    assert.match(erroreOsservazioneTabacco({ ...plan, dose: input.dose + 0.1 }) ?? "", /dose tabacco/);
  }
});

test("retains tobacco API input validation and legacy standard-age defaults", () => {
  for (const value of [undefined, null, "", true, NaN, Infinity, -0.1, 1.1]) {
    assert.match(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), n1: value }) ?? "", /letture NDVI/);
  }
  for (const key of ["media", "ottimale", "discostamento", "giorni", "resa", "fabbisognoN", "azotoTotale", "azotoGiaDistribuito", "dose"]) {
    assert.match(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), [key]: undefined }) ?? "", /non sono completi/);
  }
  for (const key of ["giorni", "resa", "fabbisognoN", "azotoTotale", "azotoGiaDistribuito", "dose", "ottimale"]) {
    assert.match(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), [key]: -1 }) ?? "", /non sono validi/);
  }
  assert.match(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), media: 0.4 }) ?? "", /media NDVI/);
  assert.match(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), discostamento: 0.2 }) ?? "", /deficit NDVI/);
  for (const etaPiantina of [undefined, null, "", "legacy"]) {
    assert.equal(erroreOsservazioneTabacco({ ...pianoTabaccoValido(), etaPiantina }), null);
  }
});

test("requires zero N for tobacco at or above its NDVI reference", () => {
  const piano = pianoTabaccoValido();
  piano.n1 = 0.8;
  piano.n2 = 0.8;
  piano.n3 = 0.8;
  piano.n4 = 0.8;
  piano.n5 = 0.8;
  piano.media = 0.8;
  piano.discostamento = 0;
  piano.dose = 0;
  assert.equal(erroreOsservazioneTabacco(piano), null);

  piano.dose = 1;
  assert.match(erroreOsservazioneTabacco(piano) ?? "", /dose tabacco/);
});

test("caps the tobacco indication at the residual nitrogen plan", () => {
  const piano = pianoTabaccoValido();
  piano.azotoGiaDistribuito = 100;
  piano.dose = 20;
  assert.equal(erroreOsservazioneTabacco(piano), null);

  piano.dose = 26.3;
  assert.match(erroreOsservazioneTabacco(piano) ?? "", /dose tabacco/);
});

test("uses the revised tobacco peak and flowering reference in API validation", () => {
  const piano = pianoTabaccoValido();
  piano.giorni = 75;
  piano.n1 = piano.n2 = piano.n3 = piano.n4 = piano.n5 = 0.8;
  piano.media = 0.8;
  piano.ottimale = 0.8;
  piano.discostamento = 0;
  piano.dose = 0;
  assert.equal(erroreOsservazioneTabacco(piano), null);

  piano.giorni = 95;
  piano.n1 = piano.n2 = piano.n3 = piano.n4 = piano.n5 = 0.75;
  piano.media = 0.75;
  piano.ottimale = 0.75;
  assert.equal(erroreOsservazioneTabacco(piano), null);

  piano.ottimale = 0.8;
  assert.match(erroreOsservazioneTabacco(piano) ?? "", /calendario fenologico/);
});

test("requires zero N when the observed NDVI is at or above its reference", () => {
  const piano = pianoGranoValido();
  piano.n1 = 0.6;
  piano.n2 = 0.6;
  piano.n3 = 0.6;
  piano.n4 = 0.6;
  piano.n5 = 0.6;
  piano.media = 0.6;
  piano.discostamento = -0.05882352941176472;
  piano.dose = 0;
  piano.quotaAzoto = 0;
  assert.equal(erroreOsservazioneGrano(piano), null);

  piano.dose = 12;
  piano.quotaAzoto = 12;
  assert.match(erroreOsservazioneGrano(piano) ?? "", /quota ricalcolata/);
});

test("rejects missing, blank, and boolean NDVI readings", () => {
  for (const valore of [null, "", true, undefined]) {
    const piano = pianoGranoValido();
    piano.n1 = valore;
    assert.match(erroreOsservazioneGrano(piano) ?? "", /NDVI/);
  }
});

test("rejects incomplete grain nitrogen plan values", () => {
  const piano = pianoGranoValido();
  delete piano.azotoGiaDistribuito;
  assert.match(erroreOsservazioneGrano(piano) ?? "", /non sono completi/);
});