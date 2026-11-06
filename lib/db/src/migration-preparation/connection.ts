/**
 * INACTIVE PREPARATION. Not exported by @workspace/db and not imported by either
 * live pool. Pure functions only: no environment reads, sockets or queries.
 */
import type { PoolConfig } from "pg";

export type DatabasePurpose = "runtime" | "readonly" | "migration";
const roles: Record<DatabasePurpose, string> = {
  runtime: "app_runtime",
  readonly: "app_readonly",
  migration: "app_migrator",
};

export interface PreparedConnection {
  url: string;
  expectedHost: string;
  purpose: DatabasePurpose;
  ca?: string;
  migrationApproved?: boolean;
}

/** Credentials must be supplied by the future secret flow, never CLI arguments. */
export function prepareConnection(input: PreparedConnection): PoolConfig {
  if (!Object.hasOwn(roles, input.purpose)) throw new Error("Unsupported database purpose.");
  if (input.purpose === "migration" && input.migrationApproved !== true) {
    throw new Error("Migration configuration requires separate approval.");
  }
  let url: URL;
  try { url = new URL(input.url); }
  catch { throw new Error("Invalid PostgreSQL connection configuration."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("PostgreSQL protocol required.");
  }
  if (!input.expectedHost || url.hostname !== input.expectedHost || !url.password || !url.pathname.slice(1)) {
    throw new Error("Database destination or credentials do not match the approved configuration.");
  }
  const username = decodeURIComponent(url.username);
  // Supavisor uses role.projectRef; current_user must also be verified after connect.
  const requiredRole = roles[input.purpose];
  if (username !== requiredRole && !new RegExp(`^${requiredRole}\\.[A-Za-z0-9_-]+$`).test(username)) {
    throw new Error("Administrative or unexpected database role rejected.");
  }
  if (url.hash || url.searchParams.has("options")) {
    throw new Error("Connection overrides are not permitted.");
  }
  for (const [key, value] of url.searchParams) {
    if (key !== "sslmode" || value !== "verify-full") {
      throw new Error("Only certificate-verified TLS connection options are permitted.");
    }
  }
  // node-postgres parses sslmode from connectionString and can replace ssl.
  // Strip it so our explicit certificate verification cannot be overridden.
  url.search = "";
  return {
    connectionString: url.toString(),
    ssl: input.ca ? { rejectUnauthorized: true, ca: input.ca } : { rejectUnauthorized: true },
    max: input.purpose === "runtime" ? 3 : 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: `nitrocrop-${input.purpose}`,
    ...(input.purpose === "readonly" ? { options: "-c default_transaction_read_only=on" } : {}),
  };
}

export interface RoleInspection {
  currentUser: string;
  sessionUser: string;
  superuser: boolean;
  createRole: boolean;
  createDatabase: boolean;
  replication: boolean;
  bypassRls: boolean;
  ownsApplicationObjects: boolean;
  canCreateInApplicationSchema: boolean;
  canCreateSchema: boolean;
  canAssumePrivilegedRole: boolean;
  hasWritePrivileges: boolean;
  hasSequenceMutationPrivileges: boolean;
  hasUnsafeFunctionAccess: boolean;
}

/**
 * Future startup must obtain this information from PostgreSQL itself.
 * A username check alone does not establish actual database permissions.
 * Missing/incomplete inspections are rejected, not treated as false.
 */
export function assertOrdinaryRole(
  purpose: "runtime" | "readonly",
  inspection: RoleInspection,
): void {
  if (!["runtime", "readonly"].includes(purpose)) throw new Error("Ordinary backend role required.");
  if (inspection.currentUser !== roles[purpose] || inspection.sessionUser !== roles[purpose]) {
    throw new Error("Database session role does not match the intended backend.");
  }
  const forbidden: (keyof RoleInspection)[] = [
    "superuser", "createRole", "createDatabase", "replication", "bypassRls",
    "ownsApplicationObjects", "canCreateInApplicationSchema", "canCreateSchema",
    "canAssumePrivilegedRole", "hasUnsafeFunctionAccess",
    ...(purpose === "readonly" ? ["hasWritePrivileges", "hasSequenceMutationPrivileges"] as const : []),
  ];
  if (forbidden.some(key => inspection[key] !== false)) {
    throw new Error("Database privileges exceed the approved ordinary backend permissions.");
  }
  if (typeof inspection.hasWritePrivileges !== "boolean" || typeof inspection.hasSequenceMutationPrivileges !== "boolean") {
    throw new Error("Incomplete database privilege inspection.");
  }
}
