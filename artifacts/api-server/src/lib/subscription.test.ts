import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionInfo, subscriptionExpiry, validSubscriptionDays } from "./subscription";

const now = new Date("2026-10-28T10:00:00.000Z");
const user = { role: "user", subscription_duration_days: 30, subscription_expires_at: subscriptionExpiry(30, now) };
test("duration must be an integer between one and ten years", () => {
  for (const value of [0, -1, 1.5, 3651, null, "", "30", true, NaN]) assert.equal(validSubscriptionDays(value), false);
  for (const value of [1, 30, 3650]) assert.equal(validSubscriptionDays(value), true);
});
test("duration is computed from authoritative server time", () => {
  assert.equal(user.subscription_expires_at.toISOString(), "2026-11-27T10:00:00.000Z");
  assert.equal(subscriptionInfo(user, now).subscriptionDaysRemaining, 30);
});
test("partial remaining day rounds up, not down", () => {
  assert.equal(subscriptionInfo({ ...user, subscription_expires_at: new Date(now.getTime() + 1) }, now).subscriptionDaysRemaining, 1);
});
test("subscription expires exactly at its deadline and never reports negative days", () => {
  for (const expiry of [now, new Date(now.getTime() - 1), null]) {
    const result = subscriptionInfo({ ...user, subscription_expires_at: expiry }, now);
    assert.equal(result.subscriptionExpired, true);
    assert.equal(result.subscriptionDaysRemaining, 0);
  }
});
test("administrator is exempt even if stored expiry is in the past", () => {
  const result = subscriptionInfo({ ...user, role: "admin", subscription_expires_at: now }, now);
  assert.equal(result.subscriptionExpired, false);
  assert.equal(result.subscriptionExempt, true);
  assert.equal(result.subscriptionDaysRemaining, null);
  assert.equal(result.subscriptionExpiresAt, null);
});
