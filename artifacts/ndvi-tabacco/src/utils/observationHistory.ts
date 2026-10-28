import type { Observation } from "../App";

export interface ObservationGroup {
  key: string;
  cliente: string;
  date: string;
  observations: Observation[];
}

/** Group by the survey day, not the day on which a record was saved. */
export function groupObservations(observations: Observation[]): ObservationGroup[] {
  const groups = new Map<string, ObservationGroup>();
  for (const observation of observations) {
    const cliente = (observation.cliente ?? "").trim();
    const date = (observation.data ?? "").slice(0, 10);
    const key = JSON.stringify([cliente, date]);
    let group = groups.get(key);
    if (!group) {
      group = { key, cliente, date, observations: [] };
      groups.set(key, group);
    }
    group.observations.push(observation);
  }
  for (const group of groups.values()) {
    group.observations.sort((a, b) => {
      const at = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const bt = b.createdAt ? Date.parse(b.createdAt) : NaN;
      return (Number.isFinite(bt) ? bt : -Infinity) - (Number.isFinite(at) ? at : -Infinity) || a.id.localeCompare(b.id);
    });
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || a.cliente.localeCompare(b.cliente));
}

/** Display a consistent sign, regardless of legacy crop-specific stored deltas. */
export function ndviDeviation(observation: Pick<Observation, "media" | "ottimale">) {
  if (!Number.isFinite(observation.media) || !Number.isFinite(observation.ottimale)) {
    return { absolute: null, percent: null };
  }
  const absolute = observation.media - observation.ottimale;
  return { absolute, percent: observation.ottimale > 0 ? absolute / observation.ottimale * 100 : null };
}
