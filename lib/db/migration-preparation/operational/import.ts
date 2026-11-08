// Explicitly-authorized import only. Never invoked by app/build/post-merge.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { readFileSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { inventoryConfig } from "../inventory/guard";
import { targetClient, assertTarget, HOST, PROJECT } from "./target";
// @ts-ignore Standalone checked JavaScript module, no app dependency.
import { applicationCopy, countAssertions, TABLES } from "./data.mjs";

const children: ReturnType<typeof spawn>[] = [];
let client: ReturnType<typeof targetClient> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let commitSent = false;
try {
  if (process.argv.length !== 8 || process.argv[2] !== "--authorized-import-frozen-source" ||
      process.argv[3] !== "--source-writes-confirmed-frozen" ||
      process.argv[6] !== "--sha256" || !/^[a-f0-9]{64}$/.test(process.argv[7])) {
    throw new Error("EXPLICIT_IMPORT_AND_SOURCE_FREEZE_APPROVAL_REQUIRED");
  }
  const [archive, identity] = process.argv.slice(4, 6);
  const checksum = createHash("sha256");
  for await (const bytes of createReadStream(archive)) checksum.update(bytes);
  if (checksum.digest("hex") !== process.argv[7]) throw new Error("ARCHIVE_CHECKSUM_MISMATCH");
  const caPath = new URL("../inventory/fixtures/supabase-root-2021.pem", import.meta.url);
  const config = inventoryConfig(process.env.SUPABASE_QA_ADMIN_URL ?? "",
    { projectRef: PROJECT, host: HOST }, readFileSync(caPath, "utf8"));
  client = targetClient();
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await assertTarget(client);
  for (const table of Object.keys(TABLES)) {
    const result = await client.query(`SELECT EXISTS(SELECT FROM public."${table}") AS occupied`);
    if (result.rows[0].occupied) throw new Error("TARGET_NOT_EMPTY");
  }
  await client.query("ROLLBACK");
  await client.end();
  client = undefined;
  const baseEnv = { PATH: process.env.PATH ?? "" };
  watchdog = setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 300000);
  function run(program: string, args: string[], env: Record<string, string> = baseEnv) {
    const child = spawn(program, args, { env, stdio: ["pipe", "pipe", "pipe"] });
    children.push(child);
    child.stderr!.resume(); // PG COPY error detail may contain personal data.
    child.stdin!.on("error", () => {});
    const done = new Promise<void>((resolve, reject) => {
      child.on("error", () => reject(new Error("IMPORT_SUBPROCESS_FAILED")));
      child.on("close", (code) => code === 0 ? resolve() : reject(new Error("IMPORT_SUBPROCESS_FAILED")));
    });
    done.catch(() => { for (const process of children) process.kill("SIGTERM"); });
    return { child, done };
  }
  const age = run("age", ["--decrypt", "--identity", identity, archive]);
  const restore = run("pg_restore", ["--data-only", "--schema=public",
    ...Object.keys(TABLES).map((table) => `--table=${table}`), "--file=-"]);
  age.child.stdin!.end();
  age.child.stdout!.pipe(restore.child.stdin!);
  const psql = run("psql", ["-X", "--no-password", "--set=ON_ERROR_STOP=1"], {
    ...baseEnv, PGHOST: HOST, PGPORT: "5432", PGDATABASE: "postgres",
    PGUSER: String(config.user), PGPASSWORD: String(config.password),
    PGSSLMODE: "verify-full", PGSSLROOTCERT: caPath.pathname,
    PGPASSFILE: "/dev/null", PGSERVICEFILE: "/dev/null", PGCONNECT_TIMEOUT: "10",
    PGOPTIONS: "-c statement_timeout=300000 -c lock_timeout=1000 -c search_path=pg_catalog",
  });
  psql.child.stdout!.resume();
  async function write(text: string) {
    if (!psql.child.stdin!.write(text)) {
      await Promise.race([
        once(psql.child.stdin!, "drain"),
        psql.done.then(() => { throw new Error("IMPORT_CONNECTION_CLOSED"); }),
      ]);
    }
  }
  await write("BEGIN ISOLATION LEVEL REPEATABLE READ READ WRITE;\nSET LOCAL ROLE app_migrator;\n");
  // Locks only the five empty TARGET tables, not the source or provider tables.
  for (const table of Object.keys(TABLES)) {
    await write(`LOCK TABLE public."${table}" IN ACCESS EXCLUSIVE MODE;\n`);
    await write(`DO $$ BEGIN IF EXISTS(SELECT FROM public."${table}") THEN
      RAISE EXCEPTION 'Target changed since preflight'; END IF; END $$;\n`);
    // COPY FROM is not supported with effective RLS. Owner bypass is confined
    // to this locked, empty-target transaction and FORCE is restored before COMMIT.
    await write(`ALTER TABLE public."${table}" NO FORCE ROW LEVEL SECURITY;\n`);
  }
  const counts = {};
  const lines = createInterface({ input: restore.child.stdout!, crlfDelay: Infinity });
  for await (const section of applicationCopy(lines, counts)) await write(section);
  // Do not COMMIT merely because stdout ended: require both source processes.
  await Promise.all([age.done, restore.done]);
  await write(countAssertions(counts));
  for (const table of Object.keys(TABLES)) {
    await write(`ALTER TABLE public."${table}" FORCE ROW LEVEL SECURITY;\n`);
  }
  await write(readFileSync(new URL("./import-final-checks.sql", import.meta.url), "utf8") + "\n");
  commitSent = true;
  await write("COMMIT;\n");
  psql.child.stdin!.end();
  await psql.done;
  console.log(JSON.stringify({ status: "IMPORTED_NOT_CUT_OVER", counts }));
} catch {
  for (const child of children) child.kill("SIGTERM");
  console.error(commitSent
    ? "IMPORT_COMMIT_OUTCOME_REQUIRES_READONLY_CHECK; no retry, cleanup or cutover."
    : "IMPORT_BLOCKED_BEFORE_COMMIT; no cutover; transaction rolls back on disconnect.");
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  if (client) {
    try { await client.query("ROLLBACK"); } catch { /* close */ }
    await client.end();
  }
}
