import type { RetentionAccount, RetentionSnapshot } from "./retention";

interface Reader {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}
/** A dedicated connection is required: the entire snapshot is read-only and coherent. */
export async function readRetentionSnapshot(client: Reader): Promise<RetentionSnapshot> {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    // Correlated owner filters avoid both cross-account data exposure and multiplied counts.
    const { rows } = await client.query(`
      SELECT u.id AS "accountId", u.created_at AS "createdAt", u.role, u.status,
        (SELECT count(*)::int FROM osservazioni o WHERE o.owner_id=u.id) AS observations,
        (SELECT count(*)::int FROM privacy_requests p WHERE p.user_id=u.id) AS "privacyRequests",
        (SELECT count(*)::int FROM privacy_requests p WHERE p.user_id=u.id
          AND p.status NOT IN ('completed','rejected')) AS "openPrivacyRequests",
        (SELECT count(*)::int FROM security_events e WHERE e.actor_id=u.id OR e.target_id=u.id) AS "securityEvents",
        (SELECT count(*)::int FROM security_events e WHERE
          (e.actor_id=u.id AND e.target_id IS NOT NULL AND e.target_id<>u.id) OR
          (e.target_id=u.id AND e.actor_id IS NOT NULL AND e.actor_id<>u.id)) AS "sharedSecurityEvents"
      FROM app_users u ORDER BY u.created_at,u.id
    `);
    const { rows: global } = await client.query(`
      SELECT (SELECT count(*)::int FROM osservazioni WHERE owner_id IS NULL) AS "unownedObservations",
        (SELECT count(*)::int FROM security_events e WHERE
          (e.actor_id IS NULL AND e.target_id IS NULL)
          OR (e.actor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app_users u WHERE u.id=e.actor_id))
          OR (e.target_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app_users u WHERE u.id=e.target_id))
        ) AS "unlinkedSecurityEvents"
    `);
    const accounts = rows.map(row => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    })) as RetentionAccount[];
    await client.query("COMMIT");
    return { accounts, ...global[0] } as RetentionSnapshot;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
