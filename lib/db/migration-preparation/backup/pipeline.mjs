// Library only: no CLI, no credential lookup, no implicit application connection.
import { spawn } from "node:child_process";
import { createWriteStream, lstatSync, openSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export async function encryptDump({
  dumpArgs, env, recipient, outputPath, timeoutMs = 300_000,
  maxBytes = 512 * 1024 * 1024, programs = {},
}) {
  if (!/^age1[a-z0-9]{58}$/.test(recipient ?? "")) throw new Error("INVALID_PUBLIC_RECIPIENT");
  if (!Array.isArray(dumpArgs) || !env || !outputPath) throw new Error("EXPLICIT_INPUTS_REQUIRED");
  // No fallback to process.env, ~/.pgpass, pg_service.conf or an application URL.
  const allowed = new Set(["PATH", "PGHOST", "PGPORT", "PGUSER", "PGDATABASE",
    "PGPASSFILE", "PGSERVICEFILE", "PGSSLMODE", "PGSSLROOTCERT", "PGOPTIONS", "PGPASSWORD"]);
  if (Object.keys(env).some((key) => !allowed.has(key))) throw new Error("UNEXPECTED_ENVIRONMENT");
  if (!env.PGPASSFILE || !env.PGSERVICEFILE) throw new Error("EXPLICIT_LIBPQ_FILES_REQUIRED");
  const parent = lstatSync(dirname(outputPath));
  if (!parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o777) !== 0o700) {
    throw new Error("PRIVATE_OUTPUT_DIRECTORY_REQUIRED");
  }
  // O_EXCL: never overwrite or remove an existing archive, including symlinks.
  const fd = openSync(outputPath, "wx", 0o600);
  const children = [];
  const work = [];
  const abort = new AbortController();
  let timer;
  let forceKill;
  let failed = false;
  let rawBytes = 0;
  let encryptedBytes = 0;
  const rawHash = createHash("sha256");
  const encryptedHash = createHash("sha256");
  const stop = () => {
    if (failed) return;
    failed = true;
    abort.abort();
    for (const child of children) child.kill("SIGTERM");
    forceKill = setTimeout(() => {
      for (const child of children) child.kill("SIGKILL");
    }, 1000);
    forceKill.unref();
  };
  function launch(program, args, stage) {
    const child = spawn(program, args, {
      env: stage === "DUMP" ? env : { PATH: env.PATH ?? "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    children.push(child);
    // Discard stderr: connection errors may contain credentials or source data.
    child.stderr.resume();
    child.stdin.on("error", stop);
    const done = new Promise((resolve, reject) => {
      child.once("error", () => reject(new Error(`${stage}_FAILED`)));
      child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`${stage}_FAILED`)));
    });
    done.catch(stop);
    work.push(done);
    return child;
  }
  // The stream owns the descriptor, including abort/error cleanup. Node's
  // flush option fsyncs successful output before closing it.
  const output = createWriteStream(outputPath, { fd, autoClose: true, flush: true });
  const outputClosed = new Promise((resolve) => output.once("close", resolve));
  output.on("error", stop);
  try {
    const restore = launch(programs.restore ?? "pg_restore", ["--file=/dev/null"], "PARSER");
    const age = launch(programs.age ?? "age", ["--encrypt", "--recipient", recipient], "ENCRYPTION");
    const dump = launch(programs.dump ?? "pg_dump", dumpArgs, "DUMP");
    restore.stdout.resume();
    dump.stdin.end();
    const raw = new Transform({
      transform(chunk, _encoding, callback) {
        rawBytes += chunk.length;
        if (rawBytes > maxBytes) return callback(new Error("BYTE_LIMIT"));
        rawHash.update(chunk);
        callback(null, chunk);
      },
    });
    const encrypted = new Transform({
      transform(chunk, _encoding, callback) {
        encryptedBytes += chunk.length;
        encryptedHash.update(chunk);
        callback(null, chunk);
      },
    });
    // Both destinations receive precisely the same bytes, with backpressure.
    raw.pipe(restore.stdin);
    work.push(pipeline(dump.stdout, raw, age.stdin, { signal: abort.signal }));
    work.push(pipeline(age.stdout, encrypted, output, { signal: abort.signal }));
    timer = setTimeout(stop, timeoutMs);
    await Promise.all(work);
    await outputClosed;
    if (failed || rawBytes === 0 || encryptedBytes === 0) throw new Error("INCOMPLETE_PIPELINE");
    return {
      rawBytes, encryptedBytes,
      rawSha256: rawHash.digest("hex"),
      encryptedSha256: encryptedHash.digest("hex"),
    };
  } catch {
    stop();
    output.destroy();
    await Promise.allSettled(work);
    await outputClosed;
    // Only this invocation's newly-created partial ciphertext is removed.
    unlinkSync(outputPath);
    throw new Error("BACKUP_PIPELINE_FAILED_NO_VALID_ARCHIVE");
  } finally {
    clearTimeout(timer);
    clearTimeout(forceKill);
  }
}
