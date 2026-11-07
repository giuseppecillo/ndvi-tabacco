import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

let root = process.cwd();
while (!existsSync(join(root, "scripts/post-merge.sh"))) {
  const parent = dirname(root);
  if (parent === root) throw new Error("Workspace root not found");
  root = parent;
}
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const forbidden = /drizzle-kit\s+(?:push|migrate)|\brun\s+(?:push(?:-force|-deployment)?|migrate)\b|\bdb:(?:push|migrate)\b/i;

test("post-merge executes dependency installation only (stubbed pnpm; offline)", () => {
  const result = spawnSync("bash", ["-c", `
    pnpm() { printf '%s\\n' "$*"; }
    export -f pnpm
    source "$1"
  `, "offline-post-merge-test", resolve(root, "scripts/post-merge.sh")], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "install --frozen-lockfile");
  assert.doesNotMatch(read("scripts/post-merge.sh"), forbidden);
});
test("API startup verifies schema before listening, with no legacy initializer", () => {
  const entry = read("artifacts/api-server/src/index.ts");
  assert.ok(entry.indexOf("await verifySecuritySchema()") < entry.indexOf("app.listen("));
  assert.doesNotMatch(entry, /initializeSecurity|drizzle|migration-preparation/);
  const security = read("artifacts/api-server/src/lib/security-db.ts");
  assert.doesNotMatch(security, /initializeSecurity|CREATE TABLE|ALTER TABLE|advisory_xact_lock/);
  const startup = security.slice(security.indexOf("export async function verifySecuritySchema"),
    security.indexOf("export async function audit"));
  assert.match(startup, /verifyApplicationSchema\(client\)/);
  assert.match(startup, /finally\s*{\s*client\.release\(\)/);
  assert.doesNotMatch(startup, /\.query\(|bootstrapEmail\(|randomUUID\(/);
  // Audit writes remain request-driven, not deleted as part of this migration.
  assert.match(security, /export async function audit/);
});
test("automatic package lifecycle and service build/start paths have no schema push", () => {
  const packages = ["package.json", "scripts/package.json", "lib/db/package.json"];
  for (const directory of ["artifacts", "lib"]) {
    for (const name of readdirSync(resolve(root, directory))) {
      const path = `${directory}/${name}/package.json`;
      if (existsSync(resolve(root, path))) packages.push(path);
      const artifact = `${directory}/${name}/.replit-artifact/artifact.toml`;
      if (existsSync(resolve(root, artifact))) assert.doesNotMatch(read(artifact), forbidden, artifact);
    }
  }
  for (const path of new Set(packages)) {
    if (!existsSync(resolve(root, path))) continue;
    const scripts = JSON.parse(read(path)).scripts ?? {};
    for (const [name, command] of Object.entries(scripts)) {
      if (/^(?:(?:pre|post)?(?:install|build|start|dev|publish)|prepare|prepublishOnly)$/.test(name)) {
        assert.doesNotMatch(String(command), forbidden, `${path}: ${name}`);
      }
    }
  }
  assert.doesNotMatch(read(".replit"), forbidden);
  assert.doesNotMatch(read("artifacts/api-server/build.mjs"), forbidden);
});
