import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { readFileSync } from "node:fs";
import type { Request, Response } from "express";
import { GRANO_DURO_DB } from "@workspace/grain-calculations";
import { POMODORO_DB } from "@workspace/tomato-calculations";
import { GetCropCatalogueResponse } from "@workspace/api-zod";
import catalogueRouter from "./crop-catalogue";
import observationsRouter from "./osservazioni";
import { cropCatalogue as snapshot } from "@workspace/crop-calculations";
import { CATALOGUE_CROPS, CROP_PROFILES, calculateCrop, cropPhaseSource } from "@workspace/crop-calculations";
import pool from "../lib/db";
import { requireAccount, requirePrivacyAck, requireSubscription } from "../middlewares/access";

test("catalogue GET is protected, read-only and returns exactly the selected display snapshot", async () => {
  const route = catalogueRouter.stack.find(layer => layer.route)?.route;
  assert.ok(route);
  assert.equal(route.path, "/catalogo-colture");
  assert.deepEqual(route.stack.slice(0, 3).map(layer => layer.handle),
    [requireAccount, requireSubscription, requirePrivacyAck]);
  assert.ok(route.stack.every(layer => layer.method === "get"));
  const query = mock.method(pool, "query", () => { throw new Error("Catalogue handler must not query data"); });
  let payload: unknown;
  try {
    await route.stack[3].handle({} as Request, {
      json(value: unknown) { payload = value; },
    } as Response, () => {});
    assert.deepEqual(GetCropCatalogueResponse.parse(payload), snapshot);
    assert.equal(snapshot.rows.length, 488);
    assert.equal(snapshot.columns.length, 24);
    assert.equal(query.mock.calls.length, 0);
    assert.deepEqual(Object.keys(payload as object).sort(), ["columns", "rows"]);
  } finally {
    query.mock.restore();
  }
});

test("all selected crop identities stay separate from the 548 calculation profiles", () => {
  const source = readFileSync("../ndvi-tabacco/src/App.tsx", "utf8");
  const tobaccoBlock = source.split("export const VARIETA_DB:")[1].split("export const PARAMETRI_AZIENDALI_DEFAULT")[0];
  const tobaccoNames = [...tobaccoBlock.matchAll(/label: "([^"]+)"/g)].map(match => match[1]);
  const applicationIdentities = [
    ...Object.keys(GRANO_DURO_DB).map(name => ["grano duro", name]),
    ...Object.keys(POMODORO_DB).map(name => ["pomodoro", name]),
    ...tobaccoNames.map(name => ["tabacco", name]),
  ];
  assert.equal(applicationIdentities.length, 548);
  const key = (pair: string[]) => JSON.stringify(pair.map(value => value.toLocaleLowerCase("it")));
  const existing = new Set(applicationIdentities.map(key));
  assert.equal(existing.size, 548);
  assert.ok(snapshot.rows.every(row => !existing.has(key(row.slice(0, 2)))));
});

test("incomplete catalogue observations cannot reach storage or fall back to tobacco", async () => {
  const post = observationsRouter.stack.find(layer => layer.route?.path === "/osservazioni"
    && layer.route.stack.some(handler => handler.method === "post"))!.route!.stack[0].handle;
  const query = mock.method(pool, "query", () => { throw new Error("Unsupported crop must not reach storage"); });
  try {
    for (const coltura of new Set(snapshot.rows.map(row => row[0]))) {
      let status = 0;
      let payload: unknown;
      const res = {
        status(value: number) { status = value; return this; },
        json(value: unknown) { payload = value; return this; },
      } as unknown as Response;
      await post({ body: { id: "synthetic-catalogue", coltura } } as Request, res, () => {});
      assert.equal(status, 400, coltura);
      assert.deepEqual(payload, { error: "Parametri della coltura incompleti o non validi." });
    }
    assert.equal(query.mock.calls.length, 0);
  } finally {
    query.mock.restore();
  }
});

test("all nine calculation crops save and reload with exact identities, N doses, phases and GPS (mocked storage only)", async () => {
  const post = observationsRouter.stack.find(layer => layer.route?.path === "/osservazioni"
    && layer.route.stack.some(handler => handler.method === "post"))!.route!.stack[0].handle;
  const get = observationsRouter.stack.find(layer => layer.route?.path === "/osservazioni"
    && layer.route.stack.some(handler => handler.method === "get"))!.route!.stack[0].handle;
  let stored: Record<string, unknown> | undefined;
  let writes = 0;
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    if (sql.includes("INSERT INTO osservazioni")) {
      assert.equal(values[30], "synthetic-owner");
      writes++;
      const columns = ["uuid", "data", "dataTrapianto", "coltura", "giorni", "etaPiantina",
        "cliente", "appezzamento", "resa", "varieta", "densitaValore", "densitaUnita", "pianteHaEquivalenti",
        "n1", "n2", "n3", "n4", "n5", "media", "ottimale", "discostamento", "dose",
        "faseFenologica", "bbch", "faseFonte", "azotoTotale", "azotoGiaDistribuito", "quotaAzoto",
        "lat", "lng", "owner_id", "id"];
      stored = Object.fromEntries(columns.map((name, i) => [name, values[i]]));
      return { rows: [{ createdAt: "2026-11-09T10:00:00.000Z" }] };
    }
    assert.ok(sql.includes("FROM osservazioni") && sql.includes("WHERE owner_id=$1"));
    assert.deepEqual(values, ["synthetic-owner"]);
    return { rows: [{ ...stored, createdAt: "2026-11-09T10:00:00.000Z" }] };
  });
  const response = () => {
    let status = 200; let payload: any;
    const res = {
      locals: { account: { id: "synthetic-owner", role: "admin" } },
      status(code: number) { status = code; return this; },
      json(body: unknown) { payload = body; return this; },
    } as unknown as Response;
    return { res, status: () => status, payload: () => payload };
  };
  try {
    for (const crop of CATALOGUE_CROPS) {
      const p = CROP_PROFILES.find(p => p.crop === crop)!;
      const r = calculateCrop({ crop, variety: p.name, phase: "F1", confirmed: true,
        yield: p.yield, applied: 0, readings: [.2, .2, .2, .2, .2] });
      const o = { id: `synthetic-${crop}`, coltura: crop, cliente: "synthetic", appezzamento: "synthetic",
        data: "2026-11-09", giorni: 0, varieta: p.name, resa: p.yield,
        densitaValore: p.plants, densitaUnita: "piante/ha", pianteHaEquivalenti: p.plants,
        n1: .2, n2: .2, n3: .2, n4: .2, n5: .2, media: r.media, ottimale: r.ottimale,
        discostamento: r.discostamento, dose: r.dose, quotaAzoto: r.dose, azotoTotale: r.azotoTotale,
        azotoGiaDistribuito: 0, bbch: null, faseFenologica: `F1 · ${r.attiva!.label}`,
        faseFonte: cropPhaseSource(crop, p.name), lat: 45.123456, lng: 12.345678 };
      const posted = response();
      await post({ body: { ...o, owner_id: "forged-other-owner" } } as Request, posted.res, () => {});
      assert.equal(posted.status(), 201, crop);
      assert.deepEqual(posted.payload(), { ok: true, createdAt: "2026-11-09T10:00:00.000Z" });
      const loaded = response();
      await get({} as Request, loaded.res, () => {});
      const row = loaded.payload()[0];
      for (const key of ["id", "coltura", "varieta", "media", "dose", "ottimale", "discostamento",
        "lat", "lng", "faseFonte", "faseFenologica", "azotoTotale", "azotoGiaDistribuito", "quotaAzoto"] as const) {
        assert.equal(row[key], o[key], `${crop}/${key}`);
      }
      const before = writes;
      const forged = response();
      await post({ body: { ...o, dose: r.dose + 1 } } as Request, forged.res, () => {});
      assert.equal(forged.status(), 400);
      assert.equal(writes, before);
    }
    assert.equal(writes, 9);
  } finally { query.mock.restore(); }
});
