// INACTIVE: register BEFORE auth/account/DB middleware only after rollout approval.
// Blocks even GET endpoints, which can otherwise update account/security data.
export function migrationPause(paused) {
  return (request, response, next) => {
    const api = request.path === "/api" || request.path.startsWith("/api/");
    if (paused && api && request.path !== "/api/healthz") {
      response.setHeader("Retry-After", "300");
      return response.status(503).json({ error: "Migrazione in corso. Riprova tra pochi minuti." });
    }
    return next();
  };
}
