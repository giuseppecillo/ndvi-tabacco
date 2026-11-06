import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { Request, Response } from "express";
import router, { erroreOsservazioneGrano, erroreOsservazioneTabacco } from "./osservazioni";
import pool from "../lib/db";

const pianoGranoValido = (): Record<string, unknown> => ({
  coltura: "grano duro",
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
          locals: { account: { id: "qa-synthetic-owner" } },
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