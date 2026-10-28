/** Operational reminders only. Nothing in this module authorizes or performs deletion. */
const DAY = 86_400_000;
export interface RetentionAccount {
  accountId: string;
  createdAt: string;
  role: "admin" | "user";
  status: "active" | "suspended" | "deleting";
  observations: number;
  privacyRequests: number;
  openPrivacyRequests: number;
  securityEvents: number;
  sharedSecurityEvents: number;
}
export interface RetentionReview {
  accountId: string;
  decision: "hold" | "no_hold";
  reviewedAt: string;
  reviewUntil: string;
  reviewer: string;
  reference: string;
}
export interface RetentionSnapshot {
  accounts: RetentionAccount[];
  unownedObservations: number;
  unlinkedSecurityEvents: number;
}
function date(value: string) {
  // Require an unambiguous instant rather than a host-local calendar date.
  if (typeof value !== "string") throw new Error("INVALID_RETENTION_DATE");
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!iso || +iso[2] < 1 || +iso[2] > 12 || +iso[3] < 1 ||
      +iso[3] > new Date(Date.UTC(+iso[1], +iso[2], 0)).getUTCDate() ||
      +iso[4] > 23 || +iso[5] > 59 || +iso[6] > 59) throw new Error("INVALID_RETENTION_DATE");
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) throw new Error("INVALID_RETENTION_DATE");
  return result;
}
export function retentionDeadline(createdAt: string): Date {
  const created = date(createdAt);
  const year = created.getUTCFullYear() + 5;
  const month = created.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = new Date(created);
  end.setUTCFullYear(year, month, 1);
  end.setUTCDate(Math.min(created.getUTCDate(), lastDay));
  return end;
}
function count(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("INVALID_RETENTION_COUNT");
}
export function retentionReport(snapshot: RetentionSnapshot, reviews: RetentionReview[], now = new Date()) {
  if (!Number.isFinite(now.getTime()) || !Array.isArray(snapshot.accounts) || !Array.isArray(reviews)) {
    throw new Error("INVALID_RETENTION_INPUT");
  }
  count(snapshot.unownedObservations);
  count(snapshot.unlinkedSecurityEvents);
  const ledger = new Map<string, RetentionReview>();
  for (const review of reviews) {
    if (!review.accountId || ledger.has(review.accountId) ||
        !["hold", "no_hold"].includes(review.decision) || !review.reviewer?.trim() || !review.reference?.trim()) {
      throw new Error("INVALID_RETENTION_REVIEW");
    }
    const reviewedAt = date(review.reviewedAt).getTime();
    const until = date(review.reviewUntil).getTime();
    if (reviewedAt > now.getTime() || until <= reviewedAt || until - reviewedAt > 30 * DAY) {
      throw new Error("INVALID_RETENTION_REVIEW_WINDOW");
    }
    ledger.set(review.accountId, review);
  }
  const ids = new Set<string>();
  const accounts = snapshot.accounts.map(account => {
    if (!account.accountId || ids.has(account.accountId) || !["admin", "user"].includes(account.role) ||
        !["active", "suspended", "deleting"].includes(account.status)) throw new Error("INVALID_RETENTION_ACCOUNT");
    ids.add(account.accountId);
    for (const n of [account.observations, account.privacyRequests, account.openPrivacyRequests,
      account.securityEvents, account.sharedSecurityEvents]) count(n);
    if (account.openPrivacyRequests > account.privacyRequests ||
        account.sharedSecurityEvents > account.securityEvents) throw new Error("INVALID_RETENTION_COUNT");
    const createdAt = date(account.createdAt);
    const deadline = retentionDeadline(account.createdAt);
    const left = deadline.getTime() - now.getTime();
    const stage = left <= 0 ? "due" : left <= 7 * DAY ? "warning_7d"
      : left <= 30 * DAY ? "warning_30d" : left <= 90 * DAY ? "warning_90d" : "not_due";
    const blockers = ["administrator_confirmation_required", "provider_and_backup_plan_required"];
    if (createdAt > now) blockers.push("creation_date_in_future");
    if (account.role === "admin") blockers.push("administrator_account_requires_separate_plan");
    if (account.status === "deleting") blockers.push("previous_deletion_incomplete");
    if (account.openPrivacyRequests) blockers.push("open_privacy_requests_review_required");
    if (account.sharedSecurityEvents) blockers.push("shared_audit_references_review_required");
    const review = ledger.get(account.accountId);
    if (!review) blockers.push("exception_review_missing");
    else if (review.decision === "hold") {
      blockers.push("retention_hold");
      if (date(review.reviewUntil) <= now) blockers.push("hold_review_overdue");
    } else if (date(review.reviewUntil) <= now) blockers.push("exception_review_expired");
    return {
      accountId: account.accountId, role: account.role, status: account.status,
      observations: account.observations, privacyRequests: account.privacyRequests,
      openPrivacyRequests: account.openPrivacyRequests, securityEvents: account.securityEvents,
      sharedSecurityEvents: account.sharedSecurityEvents,
      createdAt: createdAt.toISOString(), deadline: deadline.toISOString(),
      daysUntilDeadline: Math.ceil(left / DAY), stage, blockers,
      deletionAuthorized: false as const,
    };
  });
  return {
    generatedAt: now.toISOString(),
    mode: "READ_ONLY_NO_DELETION" as const,
    warnings: [
      ...(snapshot.unownedObservations ? ["unowned_observations_require_individual_review"] : []),
      ...(snapshot.unlinkedSecurityEvents ? ["unlinked_events_have_no_reliable_account_deadline"] : []),
    ],
    unownedObservations: snapshot.unownedObservations,
    unlinkedSecurityEvents: snapshot.unlinkedSecurityEvents,
    accounts,
  };
}
