import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canDeleteObservation, OBSERVATION_DELETION_WINDOW_MS as DAY, waitForObservationDeletion } from "./observationDeletion";
import { ObservationDeleteButton } from "../components/ObservationDeleteButton";
import type { Observation } from "../App";
import { setLanguage, t } from "../i18n/runtime";

const now = Date.parse("2026-11-10T12:00:00Z");
test("DELETE wait ends even when the transport ignores cancellation forever", async () => {
  await assert.rejects(waitForObservationDeletion(new Promise(() => {}), 5), /Unconfirmed/);
});
test("DELETE deadline includes a response body that never finishes", async () => {
  const response = { json: () => new Promise(() => {}) };
  await assert.rejects(waitForObservationDeletion(
    Promise.resolve(response).then(response => response.json()), 5,
  ), /Unconfirmed/);
});
test("late DELETE settlement cannot turn a timeout into confirmation or an unhandled rejection", async () => {
  for (const rejectLate of [false, true]) {
    let settle!: () => void;
    const pending = new Promise<string>((resolve, reject) => {
      settle = () => rejectLate ? reject(new Error("late failure")) : resolve("late success");
    });
    let confirmed = false;
    await assert.rejects(waitForObservationDeletion(pending, 5).then(() => { confirmed = true; }), /Unconfirmed/);
    settle();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(confirmed, false);
  }
});
test("confirmed DELETE and immediate failure settle normally", async () => {
  assert.deepEqual(await waitForObservationDeletion(Promise.resolve({ deletedIds: ["QA-123"] })), { deletedIds: ["QA-123"] });
  await assert.rejects(waitForObservationDeletion(Promise.reject(new Error("network"))), /network/);
});
test("deletion window uses creation instant, includes 24h boundary, rejects future/missing/invalid dates", () => {
  assert(canDeleteObservation(new Date(now).toISOString(), now));
  assert(canDeleteObservation(new Date(now - DAY).toISOString(), now));
  assert(!canDeleteObservation(new Date(now - DAY - 1).toISOString(), now));
  assert(!canDeleteObservation(new Date(now + 1).toISOString(), now));
  for (const date of [null, undefined, "", "invalid"]) assert(!canDeleteObservation(date, now));
  assert(canDeleteObservation("2026-11-09T14:00:00+02:00", now));
});
test("delete controls and accessible labels are localized; expired or pending records stay disabled", () => {
  try {
    for (const [language, label] of [["it", "Elimina rilievo QA-123"], ["en", "Delete observation QA-123"], ["es", "Eliminar observación QA-123"]] as const) {
      setLanguage(language);
      const observation = { id: "QA-123", createdAt: new Date(now - 1000).toISOString() } as Observation;
      const render = (patch: object = {}) => renderToStaticMarkup(createElement(ObservationDeleteButton, {
        observation, deletionNow: now, onDelete() {}, ...patch,
      }));
      assert(render().includes(label));
      assert(!render().includes('disabled=""'));
      assert(render({ deletingId: "other" }).includes('disabled=""'));
      assert(render({ observation: { ...observation, createdAt: null } }).includes('disabled=""'));
      assert(render({ observation: { ...observation, createdAt: new Date(now - DAY - 1).toISOString() } }).includes('disabled=""'));
      assert.notEqual(t("Elimina rilievi delle ultime 24 ore"), language === "it" ? "" : "Elimina rilievi delle ultime 24 ore");
    }
  } finally { setLanguage("it"); }
});
