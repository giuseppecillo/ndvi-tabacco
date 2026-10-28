import test from "node:test";
import assert from "node:assert/strict";
import { retentionDeadline, retentionReport, type RetentionAccount, type RetentionReview } from "./retention";
import { readRetentionSnapshot } from "./retention-snapshot";

const now = new Date("2031-10-28T10:00:00Z");
const account: RetentionAccount = {
  accountId: "one", createdAt: "2026-10-28T10:00:00Z", role: "user", status: "active",
  observations: 2, privacyRequests: 2, openPrivacyRequests: 0, securityEvents: 3, sharedSecurityEvents: 0,
};
const review: RetentionReview = {
  accountId: "one", reviewedAt: "2031-10-27T10:00:00Z", reviewUntil: "2031-11-03T10:00:00Z",
  reviewer: "operator-synthetic", reference: "case-synthetic", decision: "no_hold",
};
function report(accounts = [account], reviews: RetentionReview[] = []) {
  return retentionReport({ accounts, unownedObservations: 0, unlinkedSecurityEvents: 0 }, reviews, now);
}
test("five calendar years preserve the instant and clamp leap-day anniversaries", () => {
  assert.equal(retentionDeadline(account.createdAt).toISOString(), now.toISOString());
  assert.equal(retentionDeadline("2024-02-29T23:17:10.123Z").toISOString(), "2029-02-28T23:17:10.123Z");
  assert.equal(retentionDeadline("2026-10-28T11:00:00+01:00").toISOString(), now.toISOString());
  assert.throws(() => retentionDeadline("2026-10-28"));
  assert.throws(() => retentionDeadline("not-a-dateZ"));
  assert.throws(() => retentionDeadline("2026-02-30T10:00:00Z"));
});
test("warnings have exact boundaries; being due never authorizes deletion", () => {
  for (const [days, stage] of [[91, "not_due"], [90, "warning_90d"], [30, "warning_30d"],
    [7, "warning_7d"], [0, "due"], [-1, "due"]] as const) {
    const at = new Date(now.getTime() - days * 86400000);
    const row = retentionReport({ accounts: [account], unownedObservations: 0, unlinkedSecurityEvents: 0 }, [], at).accounts[0];
    assert.equal(row.stage, stage);
    assert.equal(row.deletionAuthorized, false);
    assert.ok(row.blockers.includes("administrator_confirmation_required"));
  }
});
test("all account data share the original deadline, independent of status or later additions", () => {
  const a = report().accounts[0];
  const b = report([{ ...account, status: "suspended", observations: 900, privacyRequests: 50 }]).accounts[0];
  assert.equal(a.deadline, b.deadline);
  assert.equal(b.stage, "due");
  assert.ok(report([{ ...account, role: "admin" }]).accounts[0].blockers.includes("administrator_account_requires_separate_plan"));
});
test("exception review fails closed, including expired holds and missing registers", () => {
  assert.ok(report().accounts[0].blockers.includes("exception_review_missing"));
  assert.ok(!report([account], [review]).accounts[0].blockers.includes("exception_review_missing"));
  const expired = { ...review, decision: "hold" as const, reviewUntil: "2031-10-28T10:00:00Z" };
  assert.ok(report([account], [expired]).accounts[0].blockers.includes("hold_review_overdue"));
  assert.ok(report([account], [expired]).accounts[0].blockers.includes("retention_hold"));
  assert.ok(report([account], [{ ...expired, decision: "no_hold" }]).accounts[0].blockers.includes("exception_review_expired"));
  assert.throws(() => report([account], [review, review]));
  assert.throws(() => report([account], [{ ...review, reviewedAt: "2031-12-01T10:00:00Z" }]));
  assert.throws(() => report([account], [{ ...review, reviewUntil: "2033-01-01T00:00:00Z" }]));
});
test("account isolation, pending rights, shared logs and unowned data remain explicit", () => {
  const result = retentionReport({ accounts: [account, { ...account, accountId: "two",
    openPrivacyRequests: 1, sharedSecurityEvents: 1, status: "deleting" }],
    unownedObservations: 1, unlinkedSecurityEvents: 1 }, [review], now);
  assert.equal(result.accounts[0].accountId, "one");
  assert.ok(!result.accounts[0].blockers.includes("open_privacy_requests_review_required"));
  assert.ok(result.accounts[1].blockers.includes("open_privacy_requests_review_required"));
  assert.ok(result.accounts[1].blockers.includes("shared_audit_references_review_required"));
  assert.ok(result.accounts[1].blockers.includes("previous_deletion_incomplete"));
  assert.equal(result.warnings.length, 2);
  assert.throws(() => report([account, account]));
  assert.throws(() => report([{ ...account, observations: -1 }]));
});
test("offline snapshots cannot leak unrecognized personal fields into the report", () => {
  const row = { ...account, email: "synthetic@example.invalid", lat: 44, message: "private-synthetic" };
  const output = JSON.stringify(report([row]));
  assert.doesNotMatch(output, /synthetic@example|private-synthetic|"lat"|"email"|"message"/);
});
test("snapshot uses a read-only consistent transaction and owner-scoped counts", async () => {
  const sql: string[] = [];
  const client = { async query(query: string) {
    sql.push(query);
    if (query.includes("FROM app_users u")) return { rows: [{ ...account, createdAt: new Date(account.createdAt) }] };
    if (query.includes("AS \"unownedObservations\"")) return { rows: [{ unownedObservations: 0, unlinkedSecurityEvents: 0 }] };
    return { rows: [] };
  } };
  const snapshot = await readRetentionSnapshot(client);
  assert.match(sql[0], /REPEATABLE READ READ ONLY/);
  assert.equal(sql.at(-1), "COMMIT");
  assert.match(sql[1], /o\.owner_id=u\.id/);
  assert.match(sql[1], /p\.user_id=u\.id/);
  assert.match(sql[1], /e\.actor_id=u\.id OR e\.target_id=u\.id/);
  assert.match(sql[2], /NOT EXISTS/);
  assert.doesNotMatch(sql.join("\n"), /\b(DELETE|UPDATE|INSERT|TRUNCATE|ALTER)\b/);
  assert.equal(snapshot.accounts[0].createdAt, account.createdAt.replace("Z", ".000Z"));
});
test("snapshot failures roll back without continuing to produce a report", async () => {
  const sql: string[] = [];
  await assert.rejects(readRetentionSnapshot({ async query(query) {
    sql.push(query);
    if (query.startsWith("\n")) throw new Error("synthetic-read-failure");
    return { rows: [] };
  } }));
  assert.equal(sql.at(-1), "ROLLBACK");
});
