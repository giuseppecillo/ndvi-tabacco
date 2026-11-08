import { contractPrefix, planKey, useKey, type StoredPlan, type StoredUse } from "../plan-model";
import type { UsageInput } from "../usage-report";

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

/** Deterministic, fictional rows. bytes is a fixture, NOT pg_column_size. */
export function syntheticUsage(owners: number, events: number, periods: number): UsageInput {
  const input: UsageInput = { accounts: [], ready: true, now: new Date("2026-11-08T12:00:00Z"), data: [], personal: [], records: [] };
  for (let a = 0; a < owners; a++) {
    const id = `synthetic:${a}/%`;
    input.accounts.push({ id, role: "user" });
    input.data.push({ owner_id: id, observations: events * 10, visits: events, bytes: events * 10 * 600 });
    input.personal.push({ owner_id: id, bytes: "256" });
    for (let p = 0; p < periods; p++) {
      const startsOn = `${2026 - p}-01-01`;
      const plan: StoredPlan = {
        version: 1, userId: id, periodId: uuid(p + 1), plan: a % 2 ? "standard" : "pro",
        startsOn, expiresAt: `${2027 - p}-01-01T00:00:00.000Z`,
        trackingSince: "2000-01-01T00:00:00.000Z", requestId: uuid(p + 100),
      };
      input.records.push({ owner_id: id, key: `${contractPrefix(id)}${plan.periodId}`, value: JSON.stringify(plan), bytes: 400 });
      if (p === 0) input.records.push({ owner_id: id, key: planKey(id), value: JSON.stringify(plan), bytes: 400 });
    }
    for (let e = 0; e < events; e++) {
      const use: StoredUse = {
        version: 1, userId: id, periodId: uuid((e % periods) + 1),
        kind: Math.floor(e / periods) % 2 ? "map" : "visit",
        entryId: `synthetic-event-${e}`, createdAt: "2026-01-01T00:00:00.000Z",
      };
      input.records.push({ owner_id: id, key: useKey(use), value: JSON.stringify(use), bytes: "320" });
    }
  }
  return input;
}
