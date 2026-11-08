import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

export const STANDARD_LIMIT = 50;
export const PRO_BYTES = 50_000_000_000; // Decimal GB, not GiB or network traffic.
export class PlanError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}
export const storedPlanSchema = z.object({
  version: z.literal(1), userId: z.string(), periodId: z.string().uuid(),
  plan: z.enum(["standard", "pro"]), startsOn: z.string(),
  expiresAt: z.string().datetime(), trackingSince: z.string().datetime(),
  requestId: z.string().uuid(),
});
export type StoredPlan = z.infer<typeof storedPlanSchema>;
export const storedUseSchema = z.object({
  version: z.literal(1), userId: z.string(), periodId: z.string().uuid(),
  kind: z.enum(["visit", "map"]), entryId: z.string(), createdAt: z.string().datetime(),
});
export type StoredUse = z.infer<typeof storedUseSchema>;
export const planKey = (userId: string) => `nc_plan:${encodeURIComponent(userId)}`;
export const contractPrefix = (userId: string) => `nc_contract:${encodeURIComponent(userId)}:`;
export const usagePrefix = (userId: string) => `nc_usage:${encodeURIComponent(userId)}:`;
export const useKey = (use: Pick<StoredUse, "userId" | "periodId" | "kind" | "entryId">) =>
  `${usagePrefix(use.userId)}${use.periodId}:${use.kind}:${use.entryId}`;

export function validDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= "2000-01-01" && value <= "2200-12-31"
    && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function annualExpiry(startsOn: string) {
  if (!validDay(startsOn)) throw new PlanError("INVALID_START_DATE", "Data di decorrenza non valida.", 400);
  const date = new Date(`${startsOn}T00:00:00Z`);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0); // Feb 29 -> Feb 28.
  return date.toISOString();
}
export function visitFingerprint(customer: string, day: string) {
  // Exactly the grouping used by Storico Rilievi: trimmed customer + calendar day.
  return createHash("sha256").update(JSON.stringify([customer.trim(), day.slice(0, 10)])).digest("hex");
}
export function planState(plan: StoredPlan, now = new Date()) {
  if (now.getTime() < Date.parse(`${plan.startsOn}T00:00:00Z`)) return "scheduled" as const;
  return now.getTime() >= Date.parse(plan.expiresAt) ? "expired" as const : "active" as const;
}
export function assertActive(plan: StoredPlan, now = new Date()) {
  const state = planState(plan, now);
  if (state !== "active") throw new PlanError(
    state === "scheduled" ? "PLAN_NOT_STARTED" : "SUBSCRIPTION_EXPIRED",
    state === "scheduled" ? "Il piano non è ancora iniziato." : "Abbonamento scaduto. Contatta l’amministratore per il rinnovo.", 403);
}
export function assertQuota(plan: StoredPlan, kind: StoredUse["kind"], used: number, alreadyCounted: boolean) {
  if (plan.plan === "standard" && !alreadyCounted && used >= STANDARD_LIMIT) {
    throw new PlanError(kind === "visit" ? "VISIT_QUOTA_EXCEEDED" : "MAP_QUOTA_EXCEEDED",
      kind === "visit"
        ? "Raggiunto il limite di 50 visite annuali. Lo storico resta disponibile."
        : "Raggiunto il limite di 50 mappe annuali. Lo storico resta disponibile.");
  }
}
export function nextPlan(
  userId: string,
  input: { plan: "standard" | "pro"; startsOn: string; renew: boolean; expectedPeriodId: string | null; requestId: string },
  old: StoredPlan | null, now = new Date(),
): StoredPlan {
  if (old?.requestId === input.requestId) return old; // Retry must never reset quotas.
  if (input.expectedPeriodId !== (old?.periodId ?? null)) {
    throw new PlanError("PLAN_CHANGED", "Il piano è stato aggiornato. Ricarica prima di riprovare.");
  }
  if (old && !input.renew && old.startsOn !== input.startsOn) {
    throw new PlanError("RENEWAL_REQUIRED", "Per cambiare la decorrenza seleziona esplicitamente il rinnovo annuale.");
  }
  const expiresAt = annualExpiry(input.startsOn);
  return {
    version: 1, userId, plan: input.plan, startsOn: input.startsOn, expiresAt,
    periodId: !old || input.renew ? randomUUID() : old.periodId,
    trackingSince: old?.trackingSince ?? now.toISOString(), requestId: input.requestId,
  };
}
