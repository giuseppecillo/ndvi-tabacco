// Optional alternative to PC installation; requires distinct owner approval.
import { mkdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

let directory;
try {
  if (process.argv.length !== 3 || process.argv[2] !== "--authorized-create-deliverable-age-key") {
    throw new Error("KEY_CREATION_AND_DELIVERY_APPROVAL_REQUIRED");
  }
  const root = fileURLToPath(new URL("../../../../generated-artifacts/backup-keys/", import.meta.url));
  mkdirSync(root, { recursive: true, mode: 0o700 });
  directory = mkdtempSync(root + "owner-");
  const env = { PATH: process.env.PATH ?? "" };
  execFileSync("age-keygen", ["--output", directory + "/private-key.txt"],
    { env, stdio: ["ignore", "ignore", "pipe"] });
  const recipient = execFileSync("age-keygen", ["-y", directory + "/private-key.txt"],
    { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (!/^age1[a-z0-9]{58}$/.test(recipient)) throw new Error("INVALID_GENERATED_RECIPIENT");
  writeFileSync(directory + "/public-recipient.txt", recipient + "\n",
    { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ status: "KEY_CREATED_OWNER_DELIVERY_REQUIRED",
    directory, publicRecipient: recipient }));
} catch {
  if (directory) {
    for (const name of ["private-key.txt", "public-recipient.txt"]) {
      try { unlinkSync(directory + "/" + name); } catch { /* newly-created files only */ }
    }
    try { rmdirSync(directory); } catch { /* no existing key is touched */ }
  }
  console.error("KEY_CREATION_BLOCKED_OR_FAILED; no secret key printed.");
  process.exitCode = 1;
}
