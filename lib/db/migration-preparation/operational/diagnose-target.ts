// Metadata-only diagnosis. Never invokes target creation or reads application rows.
import { targetClient, verifyTargetTls } from "./target";

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--readonly-identity") {
    throw new Error("READONLY_DIAGNOSTIC_FLAG_REQUIRED");
  }
  const client = targetClient();
  client.on("error", () => {});
  let transaction = false;
  let report: Record<string, unknown> | undefined;
  try {
    await client.connect();
    const transport = verifyTargetTls(client);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transaction = true;
    const probe = await client.query(
      "SELECT current_setting('transaction_read_only') AS read_only");
    if (probe.rows[0]?.read_only !== "on") throw new Error("READ_ONLY_REQUIRED");
    const result = await client.query(`SELECT current_database() AS database,
      current_user::text AS role,
      (SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()) AS backend_tls`);
    const row = result.rows[0];
    report = {
      status: "TARGET_READONLY_DIAGNOSIS",
      oneRow: result.rows.length === 1,
      databaseExpected: row?.database === "postgres",
      roleExpected: row?.role === "postgres",
      clientTlsVerified: true,
      hostnameVerified: true,
      protocol: transport.protocol,
      backendReportsTls: row?.backend_tls,
      readOnly: true,
      ddlExecuted: false,
    };
  } finally {
    try {
      if (transaction) await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  }
  console.log(JSON.stringify({ ...report, rollbackCompleted: true, connectionClosed: true }));
}
main().catch(() => {
  console.error("TARGET_READONLY_DIAGNOSIS_BLOCKED; no credential details printed.");
  process.exitCode = 1;
});
