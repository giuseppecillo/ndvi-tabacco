import {
  storedPlanSchema, storedUseSchema, type StoredPlan, type StoredUse,
  planKey, contractPrefix, usagePrefix, useKey, planState, PRO_BYTES, STANDARD_LIMIT,
} from "./plan-model";

export type UsageOwner = { id: string; role: string };
export type ArchiveRow = { owner_id: string; observations: number | string; visits: number | string; bytes: number | string };
export type ByteRow = { owner_id: string; bytes: number | string };
export type PlanRow = ByteRow & { key: string; value: string };
export type UsageInput = {
  accounts: UsageOwner[]; ready: boolean; now: Date;
  data: ArchiveRow[]; personal: ByteRow[]; records: PlanRow[];
};
type Counts = { visit: number; map: number };
type OwnerState = {
  bytes: number; plan: StoredPlan | null; history: StoredPlan[];
  periods: Map<string, Counts>; mapsTotal: number;
};

/**
 * Request-local indexes only: no persistent counters, cache, DB or side effects.
 * Each metadata row is visited and validated once, irrespective of account or
 * contract count. Do not retain parsed usage events after counting them.
 */
export function assembleUsage({ accounts, ready, now, data, personal, records }: UsageInput) {
  const archive = new Map(data.map(row => [row.owner_id, row]));
  const personalBytes = new Map(personal.map(row => [row.owner_id, row.bytes]));
  const owners = new Map<string, OwnerState>(accounts.map(account => [account.id, {
    bytes: 0, plan: null, history: [], periods: new Map(), mapsTotal: 0,
  }]));
  for (const row of records) {
    const own = owners.get(row.owner_id);
    if (!own) continue; // SQL scopes owners too; never expose unexpected rows.
    own.bytes += Number(row.bytes); // Include unknown namespaces just as before.
    if (row.key === planKey(row.owner_id)) {
      const plan = storedPlanSchema.parse(JSON.parse(row.value));
      if (plan.userId !== row.owner_id) throw new Error("Invalid plan ownership");
      own.plan = plan;
    } else if (row.key.startsWith(contractPrefix(row.owner_id))) {
      const contract = storedPlanSchema.parse(JSON.parse(row.value));
      if (contract.userId !== row.owner_id || row.key !== `${contractPrefix(row.owner_id)}${contract.periodId}`) {
        throw new Error("Invalid contract ownership");
      }
      own.history.push(contract);
    } else if (row.key.startsWith(usagePrefix(row.owner_id))) {
      const use = storedUseSchema.parse(JSON.parse(row.value));
      if (use.userId !== row.owner_id || row.key !== useKey(use)) throw new Error("Invalid usage ownership");
      const counts = own.periods.get(use.periodId) ?? { visit: 0, map: 0 };
      counts[use.kind]++;
      own.periods.set(use.periodId, counts);
      if (use.kind === "map") own.mapsTotal++;
    }
  }
  return accounts.map(account => {
    const own = owners.get(account.id)!;
    const plan = own.plan;
    const counts = (period: string, kind: StoredUse["kind"]) => own.periods.get(period)?.[kind] ?? 0;
    const stored = archive.get(account.id);
    const storageBytes = Number(stored?.bytes ?? 0) + Number(personalBytes.get(account.id) ?? 0) + own.bytes;
    return {
      userId: account.id,
      planManagementReady: ready,
      plan: account.role === "admin" ? "admin" as const : plan?.plan ?? "unassigned" as const,
      state: account.role === "admin" ? "exempt" as const : plan ? planState(plan, now) : "unassigned" as const,
      periodId: plan?.periodId ?? null, startsOn: plan?.startsOn ?? null, expiresAt: plan?.expiresAt ?? null,
      visitsUsed: plan ? counts(plan.periodId, "visit") : null,
      mapsUsed: plan ? counts(plan.periodId, "map") : null,
      visitsTotal: Number(stored?.visits ?? 0), observationsTotal: Number(stored?.observations ?? 0),
      mapsTotal: own.mapsTotal,
      storageBytes, storageMb: storageBytes / 1_000_000,
      visitsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      mapsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      storageLimitBytes: plan?.plan === "pro" && account.role !== "admin" ? PRO_BYTES : null,
      trackingSince: plan?.trackingSince ?? null,
      periods: own.history.sort((a,b) => b.startsOn.localeCompare(a.startsOn)).map(p => ({
        periodId: p.periodId, plan: p.plan, startsOn: p.startsOn, expiresAt: p.expiresAt,
        visitsUsed: counts(p.periodId, "visit"), mapsUsed: counts(p.periodId, "map"),
      })),
    };
  });
}
