// Only catalog/privilege reads. Never invokes a mutator, SET ROLE or a fixture.
import { targetClient, assertTarget, verifyTargetTls } from "./target";

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--readonly-preflight") {
    throw new Error("READONLY_PREFLIGHT_FLAG_REQUIRED");
  }
  const client = targetClient();
  client.on("error", () => {});
  let transaction = false;
  let report: unknown;
  const probe = async () => {
    const p = await client.query("SELECT current_setting('transaction_read_only') AS mode");
    if (p.rows[0]?.mode !== "on") throw new Error("READ_ONLY_REQUIRED");
  };
  try {
    await client.connect();
    verifyTargetTls(client);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transaction = true;
    await probe();
    await assertTarget(client);
    await probe();
    const result = await client.query(`SELECT r.rolname, r.rolcanlogin,
      pg_has_role(current_user,r.oid,'SET') AS admin_can_assume,
      EXISTS(SELECT FROM pg_catalog.pg_auth_members m
        WHERE m.roleid=r.oid AND m.member=current_user::regrole
          AND m.admin_option) AS admin_has_admin_option,
      has_database_privilege(r.oid,current_database(),'TEMP') AS can_create_temp,
      has_schema_privilege(r.oid,'public','CREATE') AS can_create_public,
      has_function_privilege(r.oid,'pg_catalog.lo_create(oid)','EXECUTE') AS can_create_lo,
      has_function_privilege(r.oid,'pg_catalog.lo_from_bytea(oid,bytea)','EXECUTE') AS can_create_lo_bytes
      FROM pg_catalog.pg_roles r WHERE r.rolname=ANY($1::text[]) ORDER BY r.rolname`,
    [["app_runtime","app_readonly","app_migrator","anon","authenticated","service_role"]]);
    report = { status: "PHASE5_PREPARATION_METADATA_ONLY", roles: result.rows,
      applicationDataRead: false, writesExecuted: false };
  } finally {
    try { if (transaction) await client.query("ROLLBACK"); }
    finally { await client.end(); }
  }
  console.log(JSON.stringify(report));
}
main().catch(() => {
  console.error("PHASE5_READONLY_PREFLIGHT_BLOCKED; no credential details printed.");
  process.exitCode = 1;
});
