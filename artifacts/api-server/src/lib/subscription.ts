const DAY_MS = 86_400_000;
export const DEFAULT_SUBSCRIPTION_DAYS = 30;
export function validSubscriptionDays(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 3650;
}

export function subscriptionExpiry(days: number, now = new Date()) {
  return new Date(now.getTime() + days * DAY_MS);
}

export function subscriptionInfo(account: {
  role: string;
  subscription_expires_at: Date | null;
  subscription_duration_days: number | null;
}, now = new Date()) {
  const exempt = account.role === "admin";
  const expiry = account.subscription_expires_at;
  const remaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS)) : 0;
  return {
    subscriptionExempt: exempt,
    subscriptionExpiresAt: exempt ? null : expiry?.toISOString() ?? null,
    subscriptionDurationDays: exempt ? null : account.subscription_duration_days,
    subscriptionDaysRemaining: exempt ? null : remaining,
    subscriptionExpired: !exempt && (!expiry || expiry.getTime() <= now.getTime()),
  };
}
