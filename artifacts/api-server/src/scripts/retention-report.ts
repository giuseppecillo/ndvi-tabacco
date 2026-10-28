import { readFile } from "node:fs/promises";
import { retentionReport, type RetentionSnapshot, type RetentionReview } from "../lib/retention";
import { readRetentionSnapshot } from "../lib/retention-snapshot";
import { logger } from "../lib/logger";

async function main() {
  const args = process.argv.slice(2);
  const source = args.filter(a => a === "--database" || a === "--example" || a.startsWith("--snapshot="));
  if (source.length !== 1 || args.some(a => !source.includes(a) && !a.startsWith("--reviews=")) ||
      args.filter(a => a.startsWith("--reviews=")).length > 1) {
    throw new Error("Choose exactly one source: --example, --snapshot=FILE, or --database; optional --reviews=FILE");
  }
  const reviewsPath = args.find(a => a.startsWith("--reviews="))?.slice("--reviews=".length);
  if (args.includes("--reviews=")) throw new Error("MISSING_REVIEWS_PATH");
  const reviews: RetentionReview[] = reviewsPath ? JSON.parse(await readFile(reviewsPath, "utf8")) : [];
  let snapshot: RetentionSnapshot;
  let now = new Date();
  if (source[0] === "--example") {
    // Fixed, synthetic data only. Can be verified without connecting to any database.
    now = new Date("2031-10-28T10:00:00Z");
    snapshot = { unownedObservations: 0, unlinkedSecurityEvents: 0, accounts: [{
      accountId: "synthetic-account", createdAt: "2026-10-28T10:00:00Z",
      role: "user", status: "active", observations: 4, privacyRequests: 1,
      openPrivacyRequests: 0, securityEvents: 3, sharedSecurityEvents: 0,
    }] };
  } else if (source[0].startsWith("--snapshot=")) {
    snapshot = JSON.parse(await readFile(source[0].slice("--snapshot=".length), "utf8"));
  } else {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
    const { default: pool } = await import("../lib/db");
    try {
      const client = await pool.connect();
      try { snapshot = await readRetentionSnapshot(client); }
      finally { client.release(); }
    } finally { await pool.end(); }
  }
  process.stdout.write(JSON.stringify(retentionReport(snapshot, reviews, now), null, 2) + "\n");
}
main().catch(() => {
  // Never log connection strings, exception-register contents or personal information.
  logger.error({ code: "RETENTION_REPORT_FAILED" },
    "Report non generato: controllare sorgente, formato e date. Nessuna cancellazione eseguita.");
  process.exitCode = 1;
});
