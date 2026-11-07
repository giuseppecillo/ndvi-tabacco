// Pure guards and injected-client reader. No pg_dump, connection or secret lookup.
import { checkServerIdentity } from "node:tls";
export const EXPECTED = Object.freeze({
  database: "neondb",
  project: "late-darkness-39148782",
  branch: "br-winter-salad-apdld73l",
  role: "neondb_owner",
});

export function verifyClientTls(client) {
  const host = client.connectionParameters?.host;
  const socket = client.connection?.stream;
  if (typeof host !== "string" || !/^[a-z0-9.-]+\.neon\.tech$/.test(host) ||
      socket?.encrypted !== true || socket.authorized !== true || socket.authorizationError ||
      typeof socket.getPeerCertificate !== "function" || typeof socket.getProtocol !== "function") {
    throw new Error("CLIENT_TLS_NOT_VERIFIED");
  }
  const certificate = socket.getPeerCertificate();
  const protocol = socket.getProtocol();
  if (!certificate?.raw?.length || checkServerIdentity(host, certificate) ||
      !["TLSv1.2", "TLSv1.3"].includes(protocol)) {
    throw new Error("CLIENT_TLS_NOT_VERIFIED");
  }
  return { encrypted: true, certificateAuthorized: true, hostnameVerified: true, protocol };
}

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
  // pg_stat_ssl describes the PostgreSQL backend connection, not necessarily
  // client -> Neon TLS proxy. Require independently verified client transport
  // BEFORE SQL, even if pg_stat_ssl claims SSL is active.
  const transport = verifyClientTls(client);
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
    const checks = {
      oneRow: result.rows?.length === 1,
      database: row?.database === EXPECTED.database,
      project: row?.project === EXPECTED.project,
      branch: row?.branch === EXPECTED.branch,
      role: row?.role === EXPECTED.role,
      primary: row?.recovery === false,
      tls: transport.encrypted && transport.certificateAuthorized && transport.hostnameVerified,
      serverMajor: /^16[0-9]{4}$/.test(String(row?.server_version_num)),
    };
    if (!Object.values(checks).every(Boolean)) {
      const error = new Error("PRIMARY_IDENTITY_NOT_CONFIRMED");
      error.checks = checks; // Booleans only; never unexpected identity values.
      throw error;
    }
    return { primary: true, readOnly: true, tls: true, transport,
      backendReportsTls: row.tls_active === true,
      database: row.database, project: row.project, branch: row.branch };
  } finally {
    if (started) await client.query("ROLLBACK");
  }
}
