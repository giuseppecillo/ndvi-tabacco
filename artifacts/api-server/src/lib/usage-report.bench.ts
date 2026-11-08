/**
 * Offline CPU/RSS benchmark only. Imports no DB/pool and reads no environment
 * credentials. Separate child per case/strategy avoids cross-case RSS pollution.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { assembleUsage } from "./usage-report";
import { baselineUsage } from "./test-support/usage-baseline";
import { syntheticUsage } from "./test-support/usage-synthetic";

const cases = [
  { name: "single-owner", owners: 1, events: 100_000, periods: 20 },
  { name: "admin-list", owners: 100, events: 1_000, periods: 5 },
  { name: "large-admin-list", owners: 100, events: 10_000, periods: 20 },
];
const samples = 5;
if (process.argv[2] === "--child") {
  const index = Number(process.argv[3]);
  const strategy = process.argv[4];
  assert.ok(Number.isInteger(index) && cases[index]);
  assert.ok(strategy === "baseline" || strategy === "indexed");
  const config = cases[index];
  const input = syntheticUsage(config.owners, config.events, config.periods);
  const run = strategy === "baseline" ? baselineUsage : assembleUsage;
  const fixtureHeapMb = process.memoryUsage().heapUsed / 1_000_000;
  run({ ...input, accounts: [] }); // Module initialization outside timing.
  const elapsed: number[] = [];
  let digest = "";
  for (let sample = 0; sample < samples; sample++) {
    global.gc?.();
    const start = performance.now();
    const result = run(input);
    elapsed.push(performance.now() - start);
    digest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  }
  elapsed.sort((a,b) => a-b);
  process.stdout.write(JSON.stringify({
    case: config.name, strategy, owners: config.owners,
    periodsPerOwner: config.periods, ledgerEvents: config.owners * config.events,
    metadataRows: input.records.length,
    // Observation rows are already aggregated, NOT generated or timed here.
    observationCountInAggregateFixtures: input.data.reduce((n,r) => n + Number(r.observations), 0),
    samples, minMs: elapsed[0], medianMs: elapsed[Math.floor(samples/2)], maxMs: elapsed.at(-1),
    fixtureHeapMb, peakRssMb: process.resourceUsage().maxRSS * 1024 / 1_000_000, digest,
  }) + "\n");
} else {
  process.stdout.write(JSON.stringify({
    scope: "in-memory reducer only; no SQL, network, DB, disk I/O, pg_column_size or lock timings",
    node: process.version, platform: process.platform, cpu: cpus()[0]?.model, samples,
    generatedAt: new Date().toISOString(),
  }) + "\n");
  for (let index = 0; index < cases.length; index++) {
    let digest = "";
    for (const strategy of ["baseline", "indexed"]) {
      const child = spawnSync(process.execPath, ["--expose-gc", __filename, "--child", String(index), strategy], {
        encoding: "utf8", maxBuffer: 1_000_000,
      });
      if (child.status !== 0) throw new Error(`Offline benchmark child failed: ${child.stderr}`);
      const result = JSON.parse(child.stdout);
      if (digest) assert.equal(result.digest, digest, "Response differs from original reducer");
      digest = result.digest;
      process.stdout.write(child.stdout);
    }
  }
}
