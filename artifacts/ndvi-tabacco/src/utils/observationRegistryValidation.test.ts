import assert from "node:assert/strict";
import { test } from "node:test";
import { observations } from "../../tests/fixtures/idw";
import { isObservationRegistry } from "./observationRegistryValidation";
import { buildObservationPdfRows } from "./observationPdf";
import type { Observation } from "../App";

const row = observations[0];

test("accepts backend catalogue records without sowing/transplant dates and exports safely", () => {
  const catalogue: Observation = {
    ...row, id: "QA-catalogue-no-dates", dataTrapianto: null, dataSemina: null,
    faseFenologica: null, bbch: null, faseFonte: null,
    coltura: "mais", varieta: "QA synthetic maize", createdAt: null,
  };
  const response = [row, catalogue];
  assert.equal(isObservationRegistry(response), true);
  assert.equal(buildObservationPdfRows(response, "it-IT")[1][2], "—");
  assert.equal(isObservationRegistry([...response, null]), false);
});

test("accepts complete records, empty registry and legacy optional metadata", () => {
  assert.equal(isObservationRegistry([]), true);
  assert.equal(isObservationRegistry(observations), true);
  assert.equal(isObservationRegistry([{ ...row, lat: null, lng: null }]), true);
  assert.equal(isObservationRegistry([{ ...row, createdAt: null }]), true);
  assert.equal(isObservationRegistry([{ ...row, faseFenologica: null, bbch: null, faseFonte: null }]), true);
  assert.equal(isObservationRegistry([{ ...row, createdAt: undefined, dataSemina: undefined }]), true);
});

test("rejects malformed collections atomically without changing input", () => {
  for (const value of [
    null, {}, "invalid", [null], [42], [[]],
    [row, null], [row, { ...row, id: undefined }],
    [row, { ...row }], [{ ...row, id: "" }], [{ ...row, id: "  " }],
    [{ id: "incomplete" }], [{ ...row, lat: undefined }],
    [{ ...row, n1: "0.5" }], [{ ...row, dose: NaN }],
    [{ ...row, lat: Infinity }], [{ ...row, lng: "12" }],
    [{ ...row, cliente: {} }], [{ ...row, data: null }],
    [{ ...row, createdAt: 123 }], [{ ...row, quotaAzoto: "20" }],
    [{ ...row, faseFenologica: {} }],
  ]) {
    const before = structuredClone(value);
    assert.equal(isObservationRegistry(value), false, JSON.stringify(value));
    assert.deepEqual(value, before);
  }
});

test("requires every mandatory field, not just the ID", () => {
  for (const field of [
    "id", "coltura", "data", "dataTrapianto", "etaPiantina", "cliente", "appezzamento", "varieta",
    "giorni", "resa", "n1", "n2", "n3", "n4", "n5", "media", "ottimale", "discostamento", "dose", "lat", "lng",
  ]) {
    const incomplete: Record<string, unknown> = { ...row };
    delete incomplete[field];
    assert.equal(isObservationRegistry([row, { ...incomplete, ...(field === "id" ? {} : { id: "second" }) }]), false, field);
  }
});
