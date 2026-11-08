// Frozen pre-optimization usageFor reducer. Offline comparison only; no DB import.
import {
  storedPlanSchema, storedUseSchema, type StoredUse, planKey, contractPrefix,
  usagePrefix, useKey, planState, PRO_BYTES, STANDARD_LIMIT,
} from "../plan-model";
import type { UsageInput } from "../usage-report";

export function baselineUsage({ accounts, ready, now, data, personal, records }: UsageInput) {
  return accounts.map(account => {
    const own = records.filter(row => row.owner_id === account.id);
    const currentRow = own.find(row => row.key === planKey(account.id));
    const plan = currentRow ? storedPlanSchema.parse(JSON.parse(currentRow.value)) : null;
    if (plan && plan.userId !== account.id) throw new Error("Invalid plan ownership");
    const history = own.filter(row => row.key.startsWith(contractPrefix(account.id))).map(row => {
      const contract = storedPlanSchema.parse(JSON.parse(row.value));
      if (contract.userId !== account.id || row.key !== `${contractPrefix(account.id)}${contract.periodId}`) throw new Error("Invalid contract ownership");
      return contract;
    });
    const ledger = own.filter(row => row.key.startsWith(usagePrefix(account.id))).map(row => {
      const use = storedUseSchema.parse(JSON.parse(row.value));
      if (use.userId !== account.id || row.key !== useKey(use)) throw new Error("Invalid usage ownership");
      return use;
    });
    const counts = (period: string, kind: StoredUse["kind"]) => ledger.filter(use => use.periodId === period && use.kind === kind).length;
    const stored = data.find(row => row.owner_id === account.id);
    const personalBytes = personal.find(row => row.owner_id === account.id)?.bytes ?? 0;
    const storageBytes = Number(stored?.bytes ?? 0) + Number(personalBytes)
      + own.reduce((sum, row) => sum + Number(row.bytes), 0);
    return {
      userId: account.id, planManagementReady: ready,
      plan: account.role === "admin" ? "admin" as const : plan?.plan ?? "unassigned" as const,
      state: account.role === "admin" ? "exempt" as const : plan ? planState(plan, now) : "unassigned" as const,
      periodId: plan?.periodId ?? null, startsOn: plan?.startsOn ?? null, expiresAt: plan?.expiresAt ?? null,
      visitsUsed: plan ? counts(plan.periodId, "visit") : null,
      mapsUsed: plan ? counts(plan.periodId, "map") : null,
      visitsTotal: Number(stored?.visits ?? 0), observationsTotal: Number(stored?.observations ?? 0),
      mapsTotal: ledger.filter(use => use.kind === "map").length,
      storageBytes, storageMb: storageBytes / 1_000_000,
      visitsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      mapsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      storageLimitBytes: plan?.plan === "pro" && account.role !== "admin" ? PRO_BYTES : null,
      trackingSince: plan?.trackingSince ?? null,
      periods: history.sort((a,b) => b.startsOn.localeCompare(a.startsOn)).map(p => ({
        periodId: p.periodId, plan: p.plan, startsOn: p.startsOn, expiresAt: p.expiresAt,
        visitsUsed: counts(p.periodId, "visit"), mapsUsed: counts(p.periodId, "map"),
      })),
    };
  });
}
