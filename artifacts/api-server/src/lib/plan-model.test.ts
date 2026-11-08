import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { annualExpiry, validDay, visitFingerprint, nextPlan, assertActive, assertQuota, PRO_BYTES, PlanError } from "./plan-model";
const now = new Date("2026-11-08T12:00:00Z");
const input = () => ({ plan: "standard" as const, startsOn: "2026-11-08", renew: false,
  expectedPeriodId: null, requestId: randomUUID() });
test("calendar dates and one calendar-year expiry, including leap day", () => {
  assert.equal(annualExpiry("2024-02-29"), "2025-02-28T00:00:00.000Z");
  assert.equal(annualExpiry("2023-03-01"), "2024-03-01T00:00:00.000Z");
  for (const day of ["2026-02-29","2026-13-01","2026-00-01","","2026-11-31","2026-11-08junk"]) {
    assert.equal(validDay(day), false);
    assert.throws(() => annualExpiry(day), PlanError);
  }
});
test("visits group by trimmed customer and day, never GPS/field/individual observation", () => {
  const first = visitFingerprint(" Azienda sintetica ", "2026-11-08");
  assert.equal(first, visitFingerprint("Azienda sintetica", "2026-11-08"));
  assert.equal(new Set(Array.from({length:7},()=>visitFingerprint("Azienda sintetica", "2026-11-08"))).size,1);
  assert.notEqual(first,visitFingerprint("Altra azienda","2026-11-08"));
  assert.notEqual(first,visitFingerprint("Azienda sintetica","2026-11-09"));
  assert.ok(!first.includes("Azienda"));
});
test("upgrade/downgrade preserves period, date and counters; renewal requires explicit action", () => {
  const initial = nextPlan("owner",input(),null,now);
  const upgraded = nextPlan("owner",{...input(),plan:"pro",expectedPeriodId:initial.periodId},initial,now);
  assert.equal(upgraded.periodId,initial.periodId);
  assert.equal(upgraded.trackingSince,initial.trackingSince);
  assert.throws(()=>nextPlan("owner",{...input(),startsOn:"2026-11-09",expectedPeriodId:initial.periodId},initial,now),PlanError);
  const renewed = nextPlan("owner",{...input(),renew:true,startsOn:"2027-11-08",expectedPeriodId:initial.periodId},initial,now);
  assert.notEqual(renewed.periodId,initial.periodId);
  assert.equal(renewed.trackingSince,initial.trackingSince);
});
test("retry of annual renewal is idempotent and stale renewals cannot reset quota twice", () => {
  const initial = nextPlan("owner",input(),null,now);
  const renewal = {...input(),renew:true,expectedPeriodId:initial.periodId};
  const renewed = nextPlan("owner",renewal,initial,now);
  assert.deepEqual(nextPlan("owner",renewal,renewed,now),renewed);
  assert.throws(()=>nextPlan("owner",{...renewal,requestId:randomUUID()},renewed,now),PlanError);
});
test("both Standard limits allow exactly50, including further observations of an existing visit", () => {
  const plan=nextPlan("owner",input(),null,now);
  for (const kind of ["visit","map"] as const) {
    assert.doesNotThrow(()=>assertQuota(plan,kind,49,false));
    assert.doesNotThrow(()=>assertQuota(plan,kind,50,true));
    assert.throws(()=>assertQuota(plan,kind,50,false),PlanError);
    assert.throws(()=>assertQuota(plan,kind,90,false),PlanError);
  }
});
test("Pro has50 decimalGB and no numeric visit/map caps; future and expired plans block new work", () => {
  const plan=nextPlan("owner",{...input(),plan:"pro"},null,now);
  assert.equal(PRO_BYTES,50_000_000_000);
  assert.doesNotThrow(()=>assertQuota(plan,"visit",100_000,false));
  assert.doesNotThrow(()=>assertQuota(plan,"map",100_000,false));
  assert.throws(()=>assertActive(plan,new Date("2026-11-07T23:59:59Z")),PlanError);
  assert.doesNotThrow(()=>assertActive(plan,now));
  assert.throws(()=>assertActive(plan,new Date(plan.expiresAt)),PlanError);
});
