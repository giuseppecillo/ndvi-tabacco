/**
 * INACTIVE alternative to initializeSecurity(). The existing entrypoint is NOT
 * changed. At activation, inventory all columns/constraints and probe privileges
 * too; this small startup check is not a schema equivalence certificate.
 */
export interface ReadonlyQueryClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export async function inspectPreparedStartup(client: ReadonlyQueryClient): Promise<void> {
  const tables = ["app_users", "security_state", "privacy_requests", "security_events", "osservazioni"];
  const found = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])",
    [tables],
  );
  const existing = new Set(found.rows.map(row => row.table_name));
  if (tables.some(table => !existing.has(table))) {
    throw new Error("Required application tables missing; authorized migration required.");
  }
  const admin = await client.query(
    "SELECT u.id FROM public.security_state s JOIN public.app_users u ON u.id=s.value WHERE s.key='initial_admin' AND u.role='admin'",
  );
  if (admin.rows.length !== 1) {
    throw new Error("Existing administrator mapping missing; no automatic bootstrap is permitted.");
  }
}
