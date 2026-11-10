export const OBSERVATION_DELETION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const OBSERVATION_DELETION_WAIT_MS = 15_000;

/**
 * Limit only the client's wait, not the server operation. The caller must
 * reconcile with GET on timeout: cancellation cannot establish a DELETE's outcome.
 * Keep all UI effects outside the operation so a late response cannot apply them.
 */
export async function waitForObservationDeletion<T>(
  operation: Promise<T>,
  timeoutMs = OBSERVATION_DELETION_WAIT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Unconfirmed observation deletion")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** UI hint only: the API independently enforces the window using its own clock. */
export function canDeleteObservation(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && Number.isFinite(now)
    && created <= now && now - created <= OBSERVATION_DELETION_WINDOW_MS;
}
