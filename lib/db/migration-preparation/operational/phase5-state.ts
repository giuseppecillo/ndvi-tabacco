import type { Client } from "pg";
import { TABLES } from "./data.mjs";
import { APP_ROLES, POLICY_SPEC } from "./phase5-cases.mjs";

export const tableNames = Object.keys(TABLES);
export function requireCheck(ok: boolean, code: string): asserts ok {
  if (!ok) throw new Error(code);
}
export async function captureState(client: Client) {
  const roles = await client.query(`SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,
    rolcreaterole,rolreplication,rolbypassrls,rolconfig,
    pg_has_role(rolname,'postgres','SET') AS can_assume_admin
    FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname`,[APP_ROLES]);
  const memberships = await client.query(`SELECT r.rolname,m.admin_option,m.inherit_option,m.set_option
    FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.roleid
    WHERE m.member='postgres'::regrole AND r.rolname=ANY($1::text[]) ORDER BY r.rolname`,[APP_ROLES]);
  const tables = await client.query(`SELECT c.relname,pg_get_userbyid(c.relowner) AS owner,
    c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,
    ARRAY(SELECT a.attname::text FROM pg_catalog.pg_attribute a
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
    ARRAY(SELECT format('%s|%s|%s|%s',a.attname,a.atttypid,a.attnotnull,coalesce(a.attacl::text,''))
      FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0
      AND NOT a.attisdropped ORDER BY a.attnum) AS column_signature
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname=ANY($1::text[])
    ORDER BY c.relname`,[tableNames]);
  const policies = await client.query(`SELECT c.relname,p.polname,p.polcmd::text,p.polpermissive,
    pg_get_expr(p.polqual,p.polrelid) AS qual,
    pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr,
    ARRAY(SELECT r.rolname::text FROM pg_catalog.pg_roles r WHERE r.oid=ANY(p.polroles)
      ORDER BY r.rolname) AS roles
    FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,p.polname`,[tableNames]);
  return {roles:roles.rows,memberships:memberships.rows,tables:tables.rows,policies:policies.rows};
}
export function validateState(state: Awaited<ReturnType<typeof captureState>>) {
  requireCheck(state.roles.length===3,"ROLE_PRECONDITION");
  for(const row of state.roles) {
    requireCheck(["rolcanlogin","rolsuper","rolcreatedb","rolcreaterole","rolreplication",
      "rolbypassrls","can_assume_admin"].every(flag=>row[flag]===false),"ROLE_PRECONDITION");
  }
  requireCheck(state.tables.length===5,"TABLE_PRECONDITION");
  for(const row of state.tables) {
    requireCheck(row.owner==="app_migrator" && row.relrowsecurity && row.relforcerowsecurity &&
      row.columns.length===TABLES[row.relname].length &&
      row.columns.every((column:string)=>TABLES[row.relname].includes(column)),"TABLE_PRECONDITION");
  }
  requireCheck(state.policies.length===15,"POLICY_PRECONDITION");
  const normalize=(value: string|null)=>value===null?null:value.replace(/[()\s]/g,"").toLowerCase();
  for(const row of state.policies) {
    const expected=POLICY_SPEC[row.relname]?.find(p=>p.name===row.polname);
    requireCheck(!!expected && row.polcmd===expected.command && row.polpermissive===true &&
      normalize(row.qual)===expected.qual && normalize(row.check_expr)===expected.check &&
      JSON.stringify(row.roles)===JSON.stringify(expected.roles),"POLICY_PRECONDITION");
  }
}
export async function ownerCounts(client: Client) {
  await client.query("SET LOCAL ROLE app_migrator");
  const result=await client.query(tableNames.map(table=>
    `SELECT '${table}' AS table_name,count(*)::text AS n FROM public."${table}"`
  ).join(" UNION ALL "));
  await client.query("SET LOCAL ROLE postgres");
  return result.rows;
}
export async function assertNoProbeObjects(client: Client, probe: string, temp: string, oids: number[]) {
  const relations=await client.query(`SELECT count(*)::int AS n
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname='public' AND c.relname=$1)
       OR (n.nspname LIKE 'pg_temp_%' AND c.relname=$2)`,[probe,temp]);
  requireCheck(relations.rows[0]?.n===0,"PROBE_RELATION_REMAINS");
  if(oids.length) {
    const objects=await client.query(`SELECT count(*)::int AS n
      FROM pg_catalog.pg_largeobject_metadata WHERE oid=ANY($1::oid[])`,[oids]);
    requireCheck(objects.rows[0]?.n===0,"PROBE_LARGE_OBJECT_REMAINS");
  }
}
