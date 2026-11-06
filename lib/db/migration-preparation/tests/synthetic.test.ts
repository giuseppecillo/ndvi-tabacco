/**
 * Synthetic tests: invoked ONLY by run-isolated.sh in a fresh private cluster.
 * No application imports, credentials, URLs, or environment configuration.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { execFileSync } from "node:child_process";
import { assertOrdinaryRole } from "../../src/migration-preparation/connection";
import { inspectDatabaseRole } from "../../src/migration-preparation/privileges";
import { inspectPreparedStartup } from "../../src/migration-preparation/startup";

const socket = process.argv[2];
assert.match(socket ?? "", /^\/tmp\/nitrocrop-synthetic\.[A-Za-z0-9]+$/);
assert.equal(process.env.NITROCROP_ISOLATED_ENV, "yes");
assert.equal(process.env.DATABASE_URL, undefined);
assert.equal(process.env.PGPASSWORD, undefined);
const clients: Client[] = [];
let passed = 0;
async function connect(user: string, database = "nitrocrop_synthetic") {
  const client = new Client({ host: socket, port: 55439, database, user, ssl: false });
  await client.connect();
  clients.push(client);
  return client;
}
async function test(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${passed}: ${name}`);
}
async function denied(client: Client, sql: string, codes = ["42501", "25006"]) {
  await assert.rejects(client.query(sql), (e: { code?: string }) => codes.includes(e.code ?? ""));
}
const sql = (path: string) => readFileSync(`lib/db/migration-preparation/${path}`, "utf8");

async function main() {
  const admin = await connect("nitrocrop_test_admin", "postgres");
  await admin.query("CREATE DATABASE nitrocrop_synthetic");
  const owner = await connect("nitrocrop_test_admin");
  await test("baseline executes on an empty PostgreSQL target", async () => {
    await owner.query(sql("migrations/0001_empty_target_baseline.sql"));
    const { rows } = await owner.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public'");
    assert.equal(rows[0].n, 60);
  });
  await test("baseline refuses a nonempty target atomically", async () => {
    await assert.rejects(owner.query(sql("migrations/0001_empty_target_baseline.sql")), /empty application target/);
    await owner.query("ROLLBACK");
  });
  await test("role SQL executes; explicit synthetic ownership mapping", async () => {
    assert.equal((await owner.query("SELECT has_database_privilege('public',current_database(),'TEMP') AS allowed")).rows[0].allowed, true);
    await owner.query(sql("roles.sql"));
    for (const table of ["app_users", "security_state", "privacy_requests", "security_events", "osservazioni"]) {
      await owner.query(`ALTER TABLE public.${table} OWNER TO app_migrator`);
    }
    // LOGIN only inside this throwaway cluster, authenticated via private socket.
    // No passwords are created, loaded, or changed.
    await owner.query("ALTER ROLE app_runtime LOGIN; ALTER ROLE app_readonly LOGIN; ALTER ROLE app_migrator LOGIN");
  });
  const runtime = await connect("app_runtime");
  const readonly = await connect("app_readonly");
  const migrator = await connect("app_migrator");
  await test("runtime and readonly pass actual catalog inspection", async () => {
    const runtimeInspection = await inspectDatabaseRole(runtime);
    const readonlyInspection = await inspectDatabaseRole(readonly);
    console.log("CATALOG", JSON.stringify({ runtime: runtimeInspection, readonly: readonlyInspection }));
    assertOrdinaryRole("runtime", runtimeInspection);
    assertOrdinaryRole("readonly", readonlyInspection);
  });
  await test("runtime permitted CRUD and audit insert, named columns only", async () => {
    await runtime.query(`INSERT INTO public.app_users (id,email,clerk_user_id,name,role)
      VALUES ('synthetic-admin','admin@example.invalid','synthetic-clerk','Synthetic admin','admin')`);
    await runtime.query("UPDATE public.app_users SET name='Updated synthetic' WHERE id='synthetic-admin'");
    await runtime.query("INSERT INTO public.security_events (id,action) VALUES ('event-synthetic','synthetic-test')");
    await runtime.query("INSERT INTO public.privacy_requests (id,user_id,type,message) VALUES ('synthetic-request','synthetic-admin','access','Synthetic only')");
    await runtime.query("DELETE FROM public.privacy_requests WHERE id='synthetic-request'");
    await owner.query("INSERT INTO public.security_state (key,value) VALUES ('initial_admin','synthetic-admin')");
  });
  await test("prepared startup reads existing mapping, never bootstraps", async () => {
    await inspectPreparedStartup(readonly);
  });
  await test("readonly SELECT allowed; default read-only is on", async () => {
    assert.equal((await readonly.query("SHOW default_transaction_read_only")).rows[0].default_transaction_read_only, "on");
    assert.equal((await readonly.query("SELECT count(*)::int AS n FROM public.app_users")).rows[0].n, 1);
  });
  await test("readonly writes denied even after disabling session read-only", async () => {
    await readonly.query("SET default_transaction_read_only=off");
    for (const statement of [
      "INSERT INTO public.app_users (id,email) VALUES ('forbidden','forbidden@example.invalid')",
      "UPDATE public.app_users SET name='forbidden'",
      "DELETE FROM public.app_users", "TRUNCATE public.app_users",
    ]) await denied(readonly, statement);
  });
  await test("large-object catalog mutations denied with session read-only off", async () => {
    for (const client of [runtime, readonly]) {
      await denied(client, "SELECT pg_catalog.lo_create(0)");
      await denied(client, "SELECT pg_catalog.lo_from_bytea(0,decode('00','hex'))");
    }
    await owner.query("GRANT EXECUTE ON FUNCTION pg_catalog.lo_create(oid) TO PUBLIC");
    assert.equal((await inspectDatabaseRole(readonly)).hasUnsafeFunctionAccess, true);
    await owner.query("REVOKE EXECUTE ON FUNCTION pg_catalog.lo_create(oid) FROM PUBLIC");
  });
  for (const [name, client] of [["readonly", readonly], ["runtime", runtime]] as const) {
    await test(`${name}: DDL, temporary objects, ownership and escalation denied`, async () => {
      for (const statement of [
        "CREATE TABLE public.forbidden (id int)", "CREATE TEMP TABLE forbidden_temp (id int)",
        "ALTER TABLE public.app_users ADD COLUMN forbidden int", "DROP TABLE public.osservazioni",
        "CREATE SCHEMA forbidden", "SET ROLE app_migrator", "SET ROLE nitrocrop_test_admin",
        "CREATE ROLE forbidden", "ALTER ROLE app_runtime SUPERUSER",
        "GRANT app_migrator TO app_runtime", "ALTER TABLE public.app_users OWNER TO app_runtime",
      ]) await denied(client, statement);
    });
  }
  await test("runtime cannot mutate security state or rewrite audit history", async () => {
    for (const statement of [
      "UPDATE public.security_state SET value='forbidden'",
      "DELETE FROM public.security_events", "UPDATE public.security_events SET action='forbidden'",
    ]) await denied(runtime, statement);
  });
  await test("migrator owns application tables and can perform structural DDL", async () => {
    await migrator.query("ALTER TABLE public.app_users ADD COLUMN synthetic_probe int");
    await migrator.query("ALTER TABLE public.app_users DROP COLUMN synthetic_probe");
    await migrator.query("CREATE TABLE public.synthetic_probe(id int); DROP TABLE public.synthetic_probe");
    assert.equal((await inspectDatabaseRole(migrator)).ownsApplicationObjects, true);
  });
  await test("new definer mutator inaccessible by default, explicit grant detected", async () => {
    await migrator.query(`CREATE FUNCTION public.synthetic_mutator() RETURNS void
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
      AS $$ UPDATE public.app_users SET name='mutated' WHERE id='synthetic-admin' $$`);
    for (const client of [runtime, readonly]) await denied(client, "SELECT public.synthetic_mutator()");
    await migrator.query("GRANT EXECUTE ON FUNCTION public.synthetic_mutator() TO app_readonly");
    assert.equal((await inspectDatabaseRole(readonly)).hasUnsafeFunctionAccess, true);
    const unsafe = await inspectDatabaseRole(readonly);
    assert.throws(() => assertOrdinaryRole("readonly", unsafe));
    await readonly.query("SELECT public.synthetic_mutator()");
    assert.equal((await runtime.query("SELECT name FROM public.app_users")).rows[0].name, "mutated");
    await migrator.query("REVOKE EXECUTE ON FUNCTION public.synthetic_mutator() FROM app_readonly");
    await migrator.query("DROP FUNCTION public.synthetic_mutator()");
  });
  await test("column grants, sequence use and PUBLIC inheritance detected", async () => {
    await migrator.query("GRANT UPDATE(name) ON public.app_users TO app_readonly");
    assert.equal((await inspectDatabaseRole(readonly)).hasWritePrivileges, true);
    await migrator.query("REVOKE UPDATE(name) ON public.app_users FROM app_readonly");
    await migrator.query("CREATE SEQUENCE public.synthetic_seq");
    await denied(readonly, "SELECT nextval('public.synthetic_seq')");
    await migrator.query("GRANT USAGE ON SEQUENCE public.synthetic_seq TO PUBLIC");
    assert.equal((await inspectDatabaseRole(readonly)).hasSequenceMutationPrivileges, true);
    await migrator.query("REVOKE USAGE ON SEQUENCE public.synthetic_seq FROM PUBLIC; DROP SEQUENCE public.synthetic_seq");
    await migrator.query("GRANT UPDATE ON public.app_users TO PUBLIC");
    assert.equal((await inspectDatabaseRole(readonly)).hasWritePrivileges, true);
    await migrator.query("REVOKE UPDATE ON public.app_users FROM PUBLIC");
  });
  await test("transitive NOINHERIT role membership detected and rejected", async () => {
    await owner.query("CREATE ROLE synthetic_bridge NOLOGIN NOINHERIT; GRANT app_migrator TO synthetic_bridge; GRANT synthetic_bridge TO app_runtime");
    assert.equal((await inspectDatabaseRole(runtime)).canAssumePrivilegedRole, true);
    const unsafe = await inspectDatabaseRole(runtime);
    assert.throws(() => assertOrdinaryRole("runtime", unsafe));
    await owner.query("REVOKE synthetic_bridge FROM app_runtime; REVOKE app_migrator FROM synthetic_bridge; DROP ROLE synthetic_bridge");
  });
  await test("database/schema CREATE, ownership and SET ROLE identities detected", async () => {
    await owner.query("GRANT CREATE ON DATABASE nitrocrop_synthetic TO app_runtime");
    assert.equal((await inspectDatabaseRole(runtime)).canCreateSchema, true);
    await owner.query("REVOKE CREATE ON DATABASE nitrocrop_synthetic FROM app_runtime");
    await owner.query("GRANT CREATE ON SCHEMA public TO app_runtime");
    assert.equal((await inspectDatabaseRole(runtime)).canCreateInApplicationSchema, true);
    await owner.query("REVOKE CREATE ON SCHEMA public FROM app_runtime");
    await owner.query("ALTER TABLE public.security_events OWNER TO app_runtime");
    assert.equal((await inspectDatabaseRole(runtime)).ownsApplicationObjects, true);
    await owner.query("ALTER TABLE public.security_events OWNER TO app_migrator");
    await owner.query("SET ROLE app_runtime");
    const impersonated = await inspectDatabaseRole(owner);
    assert.throws(() => assertOrdinaryRole("runtime", impersonated));
    await owner.query("RESET ROLE");
  });
  await test("all baseline constraints and indexes reconstructed", async () => {
    assert.equal((await owner.query(`SELECT count(*)::int AS n FROM pg_constraint
      WHERE connamespace='public'::regnamespace`)).rows[0].n, 12);
    assert.equal((await owner.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public'")).rows[0].n, 8);
    await denied(runtime, "INSERT INTO public.app_users(id,email,role) VALUES('bad','bad@example.invalid','superuser')", ["23514"]);
    await denied(runtime, "INSERT INTO public.app_users(id,email,subscription_duration_days) VALUES('bad','bad@example.invalid',3651)", ["23514"]);
    await denied(runtime, "INSERT INTO public.app_users(id,email,status) VALUES('bad','bad@example.invalid','invalid')", ["23514"]);
    await denied(runtime, "INSERT INTO public.app_users(id,email) VALUES('duplicate','admin@example.invalid')", ["23505"]);
    await denied(runtime, "INSERT INTO public.app_users(id,email,clerk_user_id) VALUES('duplicate','other@example.invalid','synthetic-clerk')", ["23505"]);
    await denied(runtime, "INSERT INTO public.privacy_requests(id,user_id,type,message) VALUES('orphan','missing','access','synthetic')", ["23503"]);
  });
  await test("reordered source: explicit-column COPY roundtrip preserves every field", async () => {
    // Same data columns but deliberately different physical order, like a
    // schema evolved with ALTER TABLE. This is NOT any real source snapshot.
    const { rows: columns } = await owner.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='osservazioni' ORDER BY ordinal_position`);
    const names = columns.map(row => row.column_name as string);
    const required = {
      id: "synthetic-observation", owner_id: "synthetic-admin", observation_id: "123-synthetic",
      data: "2026-11-06", tipo_intervento: "synthetic", giorni: 30, eta_piantina: "synthetic",
      cliente: "Synthetic farm", appezzamento: "Synthetic parcel", resa: 60, varieta: "RGT NATUR",
      n1: 0.4, n2: 0.5, n3: 0.6, n4: 0.7, n5: 0.8, media: 0.6, ottimale: 0.8,
      discostamento: -0.2, dose: 45, lat: 45.1, lng: 9.2, azoto_totale: 180, quota_azoto: 90,
    };
    const selected = Object.keys(required);
    await runtime.query(`INSERT INTO public.osservazioni (${selected.join(",")})
      VALUES (${selected.map((_, i) => `$${i + 1}`).join(",")})`, Object.values(required));
    await owner.query(`CREATE SCHEMA synthetic_source;
      CREATE TABLE synthetic_source.observations AS SELECT ${[...names].reverse().join(",")} FROM public.osservazioni`);
    await assert.rejects(runtime.query(`INSERT INTO public.osservazioni (${selected.join(",")})
      VALUES (${selected.map((_, i) => `$${i + 1}`).join(",")})`, Object.values(required)),
      (error: { code?: string }) => error.code === "23505");
    const { rows: reordered } = await owner.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='synthetic_source' AND table_name='observations' ORDER BY ordinal_position`);
    assert.notDeepEqual(names, reordered.map(row => row.column_name));
    await denied(owner, "INSERT INTO public.osservazioni SELECT * FROM synthetic_source.observations", ["42804"]);
    await owner.query("DELETE FROM public.osservazioni");
    const psql = ["-X", "-v", "ON_ERROR_STOP=1", "-h", socket, "-p", "55439",
      "-U", "nitrocrop_test_admin", "-d", "nitrocrop_synthetic", "-c"];
    const copy = execFileSync("psql", [...psql,
      `COPY (SELECT ${names.join(",")} FROM synthetic_source.observations) TO STDOUT WITH CSV`]);
    execFileSync("psql", [...psql, `COPY public.osservazioni (${names.join(",")}) FROM STDIN WITH CSV`],
      { input: copy });
    const { rows } = await owner.query(`SELECT to_jsonb(a)=to_jsonb(b) AS same
      FROM public.osservazioni a JOIN synthetic_source.observations b ON a.id=b.id`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].same, true);
    await owner.query("DROP SCHEMA synthetic_source CASCADE");
  });
  await test("all 13 account columns survive explicit-column COPY despite source order", async () => {
    const { rows: columns } = await owner.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='app_users' ORDER BY ordinal_position`);
    const names = columns.map(row => row.column_name as string);
    assert.equal(names.length, 13);
    await owner.query(`CREATE SCHEMA synthetic_source;
      CREATE TABLE synthetic_source.users AS SELECT ${[...names].reverse().join(",")} FROM public.app_users;
      CREATE TABLE synthetic_source.restored_users (LIKE public.app_users INCLUDING ALL)`);
    const psql = ["-X", "-v", "ON_ERROR_STOP=1", "-h", socket, "-p", "55439",
      "-U", "nitrocrop_test_admin", "-d", "nitrocrop_synthetic", "-c"];
    const copy = execFileSync("psql", [...psql,
      `COPY (SELECT ${names.join(",")} FROM synthetic_source.users) TO STDOUT WITH CSV`]);
    execFileSync("psql", [...psql, `COPY synthetic_source.restored_users (${names.join(",")}) FROM STDIN WITH CSV`],
      { input: copy });
    const { rows } = await owner.query(`SELECT to_jsonb(a)=to_jsonb(b) AS same
      FROM public.app_users a JOIN synthetic_source.restored_users b ON a.id=b.id`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].same, true);
    await owner.query("DROP SCHEMA synthetic_source CASCADE");
  });
  await test("final privileges clean and synthetic FK cascades enforced", async () => {
    assertOrdinaryRole("runtime", await inspectDatabaseRole(runtime));
    assertOrdinaryRole("readonly", await inspectDatabaseRole(readonly));
    await runtime.query("DELETE FROM public.app_users WHERE id='synthetic-admin'");
    assert.equal((await runtime.query("SELECT count(*)::int AS n FROM public.osservazioni")).rows[0].n, 0);
    await assert.rejects(inspectPreparedStartup(readonly), /administrator mapping missing/);
  });
}
// All sockets are closed even on a failing assertion.
main().then(() => console.log(`TOTAL: ${passed} synthetic checks passed`))
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await Promise.all(clients.map(client => client.end())); });
