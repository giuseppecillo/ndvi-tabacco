// Pure guards and injected-client reader. No pg_dump, connection or secret lookup.
export const EXPECTED = Object.freeze({
  database: "neondb",
  project: "late-darkness-39148782",
  branch: "br-winter-salad-apdld73l",
  role: "neondb_owner",
});

export function connectionConfig(rawUrl, approvedHostname) {
  if (!rawUrl || !approvedHostname) throw new Error("PRODUCTION_SOURCE_NOT_CONFIGURED");
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error("INVALID_SOURCE_URL"); }
  if (!/^[a-z0-9.-]+\.neon\.tech$/.test(approvedHostname) ||
      /-pooler\b/.test(approvedHostname) ||
      url.hostname !== approvedHostname ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.pathname !== "/neondb" || url.hash ||
      !url.username || !url.password || (url.port && url.port !== "5432")) {
    throw new Error("UNAPPROVED_SOURCE");
  }
  for (const [key, value] of url.searchParams) {
    if (!((key === "sslmode" && ["require", "verify-full"].includes(value)) ||
          (key === "channel_binding" && value === "require"))) {
      throw new Error("UNAPPROVED_CONNECTION_OPTION");
    }
  }
  return {
    host: approvedHostname, port: 5432, database: EXPECTED.database,
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: approvedHostname },
    enableChannelBinding: true,
    connectionTimeoutMillis: 5000, query_timeout: 5000,
    application_name: "nitrocrop_backup_identity_readonly",
    // Session-only startup option; BEGIN READ ONLY remains mandatory.
    options: "-c default_transaction_read_only=on",
  };
}

export async function verifyPrimaryIdentity(client) {
  let started = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    started = true;
    const probe = await client.query(
      "SELECT pg_catalog.current_setting('transaction_read_only') AS read_only");
    if (probe.rows?.length !== 1 || probe.rows[0].read_only !== "on") {
      throw new Error("READ_ONLY_REQUIRED");
    }
    const result = await client.query(`SELECT
      pg_catalog.current_database() AS database, current_user::text AS role,
      pg_catalog.current_setting('neon.project_id', true) AS project,
      pg_catalog.current_setting('neon.branch_id', true) AS branch,
      pg_catalog.pg_is_in_recovery() AS recovery,
      pg_catalog.current_setting('server_version_num') AS server_version_num,
      (SELECT ssl FROM pg_catalog.pg_stat_ssl
        WHERE pid=pg_catalog.pg_backend_pid()) AS tls_active`);
    const row = result.rows?.[0];
    if (result.rows?.length !== 1 || !row || row.database !== EXPECTED.database ||
        row.project !== EXPECTED.project || row.branch !== EXPECTED.branch ||
        row.role !== EXPECTED.role || row.recovery !== false || row.tls_active !== true ||
        !/^16[0-9]{4}$/.test(String(row.server_version_num))) {
      throw new Error("PRIMARY_IDENTITY_NOT_CONFIRMED");
    }
    return { primary: true, readOnly: true, tls: true,
      database: row.database, project: row.project, branch: row.branch };
  } finally {
    if (started) await client.query("ROLLBACK");
  }
}
