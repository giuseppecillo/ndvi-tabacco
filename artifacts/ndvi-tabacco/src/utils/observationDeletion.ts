export const OBSERVATION_DELETION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** UI hint only: the API independently enforces the window using its own clock. */
export function canDeleteObservation(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && Number.isFinite(now)
    && created <= now && now - created <= OBSERVATION_DELETION_WINDOW_MS;
}
