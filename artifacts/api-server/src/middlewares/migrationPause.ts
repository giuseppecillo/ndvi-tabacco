// Registered after Clerk, before account routes. Default-off; no database queries.
import type { RequestHandler, Request } from "express";

export function createMigrationPause(
  env: NodeJS.ProcessEnv,
  verifiedUserId: (request: Request) => string | null,
): RequestHandler {
  const flag = env.NITROCROP_MIGRATION_PAUSE ?? "0";
  if (!["0", "1"].includes(flag)) throw new Error("MIGRATION_PAUSE_FLAG_INVALID");
  const paused = flag === "1";
  const pilots = new Set((env.NITROCROP_MIGRATION_QA_CLERK_IDS ?? "")
    .split(",").map(value => value.trim()).filter(Boolean));
  if ([...pilots].some(id => !/^user_[A-Za-z0-9]{8,64}$/.test(id))) {
    throw new Error("MIGRATION_QA_ALLOWLIST_INVALID");
  }
  return (request,response,next): void => {
    if (!paused || (request.path !== "/api" && !request.path.startsWith("/api/")) ||
        request.path === "/api/healthz") {
      next();
      return;
    }
    // Resolver must be Clerk getAuth AFTER clerkMiddleware, BEFORE account sync.
    const identity = verifiedUserId(request);
    if (identity && pilots.has(identity)) {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Retry-After", "300");
    response.status(503).json({ error: "Migrazione in corso. Riprova tra pochi minuti." });
  };
}
