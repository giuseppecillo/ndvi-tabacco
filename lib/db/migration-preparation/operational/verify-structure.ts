// Post-COMMIT verification only. No DDL, DML, source connection or LOGIN activation.
import { targetClient, assertTarget, verifyTargetTls } from "./target";
import { TABLES } from "./data.mjs";

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--readonly-created-structure") {
    throw new Error("READONLY_STRUCTURE_VERIFICATION_FLAG_REQUIRED");
  }
  const names = Object.keys(TABLES);
  const client = targetClient();
  client.on("error", () => {});
  let transaction = false;
  let report: Record<string, unknown> | undefined;
  const require = (condition: boolean) => {
    if (!condition) throw new Error("STRUCTURE_VERIFICATION_FAILED");
  };
  const probe = async () => {
    const result = await client.query("SELECT current_setting('transaction_read_only') AS mode");
    require(result.rows[0]?.mode === "on");
  };
  const select = async (sql: string, parameters: unknown[] = []) => {
    await probe();
    return client.query(sql, parameters);
  };
  try {
    await client.connect();
    verifyTargetTls(client);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transaction = true;
    await probe();
    const identity = await assertTarget(client);
    const roles = await select(`SELECT rolname, rolcanlogin, rolsuper, rolcreatedb,
      rolcreaterole, rolreplication, rolbypassrls FROM pg_catalog.pg_roles
      WHERE rolname=ANY($1::text[]) ORDER BY rolname`,
    [["app_runtime", "app_readonly", "app_migrator"]]);
    require(roles.rows.length === 3 && roles.rows.every(row =>
      ["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolreplication","rolbypassrls"]
        .every(flag => row[flag] === false)));
    const tables = await select(`SELECT c.relname, pg_get_userbyid(c.relowner) AS owner,
      c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls,
      ARRAY(SELECT a.attname::text FROM pg_catalog.pg_attribute a
        WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        ORDER BY a.attnum) AS columns
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname=ANY($1::text[])
      ORDER BY c.relname`, [names]);
    require(tables.rows.length === 5 && tables.rows.every(row =>
      row.owner === "app_migrator" && row.rls === true && row.force_rls === true &&
      row.columns.length === TABLES[row.relname].length &&
      row.columns.every((column: string) => TABLES[row.relname].includes(column))));
    const api = await select(`SELECT r.role_name, c.relname,
      has_table_privilege(r.role_name::name,c.oid,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS table_access,
      has_any_column_privilege(r.role_name::name,c.oid,
        'SELECT,INSERT,UPDATE,REFERENCES') AS column_access
      FROM unnest($1::text[]) AS r(role_name)
      CROSS JOIN pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($2::text[])`,
    [["anon","authenticated","service_role"], names]);
    require(api.rows.length === 15 && api.rows.every(row =>
      row.table_access === false && row.column_access === false));
    const readonly = await select(`SELECT c.relname,
      has_table_privilege('app_readonly',c.oid,'SELECT') AS can_read,
      has_table_privilege('app_readonly',c.oid,
        'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS can_write,
      has_any_column_privilege('app_readonly',c.oid,'INSERT,UPDATE,REFERENCES') AS column_write
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[])`, [names]);
    require(readonly.rows.length === 5 && readonly.rows.every(row =>
      row.can_read === true && row.can_write === false && row.column_write === false));
    const audit = await select(`SELECT
      has_column_privilege('app_runtime','public.security_events','actor_id','UPDATE') AS actor,
      has_column_privilege('app_runtime','public.security_events','target_id','UPDATE') AS target,
      has_table_privilege('app_runtime','public.security_events','UPDATE,DELETE,TRUNCATE') AS broad_write,
      EXISTS(SELECT FROM pg_catalog.pg_attribute a
        WHERE a.attrelid='public.security_events'::regclass AND a.attnum>0
          AND NOT a.attisdropped AND a.attname NOT IN ('actor_id','target_id')
          AND has_column_privilege('app_runtime',a.attrelid,a.attnum,'UPDATE')) AS other_column`);
    require(audit.rows[0]?.actor === true && audit.rows[0]?.target === true &&
      audit.rows[0]?.broad_write === false && audit.rows[0]?.other_column === false);
    const policies = await select(`SELECT c.relname,p.polname
      FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[])`, [names]);
    require(policies.rows.length === 15);
    // Count under the owner policy, not under a role that RLS might hide rows from.
    await client.query("SET LOCAL ROLE app_migrator");
    const counts = await select(names.map(name =>
      `SELECT '${name}'::text AS table_name,count(*)::text AS row_count FROM public."${name}"`
    ).join(" UNION ALL "));
    require(counts.rows.length === 5 && counts.rows.every(row => row.row_count === "0"));
    report = {
      status: "POINT4_COMMITTED_AND_READONLY_VERIFIED",
      tls: identity.transport,
      roles: roles.rows,
      tables: tables.rows.map(row => ({
        name: row.relname, owner: row.owner, rls: row.rls, forceRls: row.force_rls,
        columns: row.columns.length,
      })),
      policies: policies.rows.length,
      dataApiTableAndColumnChecksDenied: api.rows.length,
      readonlyTableWriteChecksDenied: readonly.rows.length,
      auditUpdatesRestrictedToActorAndTarget: true,
      rows: counts.rows,
      importedRows: 0,
    };
  } finally {
    try {
      if (transaction) await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  }
  console.log(JSON.stringify({ ...report, verificationRollbackCompleted: true, connectionClosed: true }));
}
main().catch(() => {
  console.error("POST_COMMIT_VERIFICATION_BLOCKED; committed structure is not automatically altered or removed.");
  process.exitCode = 1;
});
