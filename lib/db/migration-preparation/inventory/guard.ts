/**
 * Standalone QA inventory, never imported by the application.
 * No environment reads, connection strings in errors, or network calls here.
 */
import type { ClientConfig } from "pg";
import { X509Certificate } from "node:crypto";

export interface ApprovedTarget { projectRef: string; host: string }
export class InventoryBlocked extends Error {
  constructor(public readonly reason: string) { super(reason); }
}
const block = (reason: string): never => { throw new InventoryBlocked(reason); };
// Public CA supplied by the user through the official Supabase dashboard and
// verified against the approved pooler's chain. Not a server-learned root.
export const APPROVED_CA_SHA256 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";
export function validatePublicCa(pem: string): string {
  if (pem.length > 16_384 ||
      !/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----\s*$/.test(pem)) {
    block("PUBLIC_CA_INVALID");
  }
  try {
    const cert = new X509Certificate(pem);
    if (!cert.ca || cert.fingerprint256 !== APPROVED_CA_SHA256 ||
        Date.now() < Date.parse(cert.validFrom) || Date.now() > Date.parse(cert.validTo)) {
      block("PUBLIC_CA_NOT_APPROVED");
    }
  } catch { return block("PUBLIC_CA_NOT_APPROVED"); }
  return pem;
}

export function validateTarget(target: ApprovedTarget): void {
  if (!/^[a-z0-9]{20}$/.test(target.projectRef)) block("INVALID_PROJECT_REFERENCE");
  const direct = `db.${target.projectRef}.supabase.co`;
  const pooler = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/;
  if (target.host !== direct && !pooler.test(target.host)) block("HOST_NOT_SUPABASE");
}

export function inventoryConfig(secret: string, target: ApprovedTarget, ca?: string): ClientConfig {
  validateTarget(target);
  let url: URL;
  try { url = new URL(secret); } catch { return block("INVALID_SECRET_FORMAT"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) block("INVALID_PROTOCOL");
  if (url.hostname !== target.host || (url.port && url.port !== "5432")) block("DESTINATION_MISMATCH");
  if (url.pathname !== "/postgres" || url.hash) block("INVALID_DATABASE_OR_FRAGMENT");
  const entries = [...url.searchParams];
  if (entries.length > 1 || entries.some(([key, value]) => key !== "sslmode" || value !== "verify-full")) {
    block("CONNECTION_OVERRIDES_FORBIDDEN");
  }
  let username: string, password: string;
  try {
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch { return block("INVALID_SECRET_ENCODING"); }
  const isDirect = target.host === `db.${target.projectRef}.supabase.co`;
  if (username !== (isDirect ? "postgres" : `postgres.${target.projectRef}`)) {
    block("ADMIN_IDENTITY_MISMATCH");
  }
  if (!password) block("PASSWORD_REQUIRED");
  // Explicit fields, not connectionString: pg cannot apply URI/env overrides.
  return {
    host: target.host, port: 5432, database: "postgres", user: username, password,
    ssl: { rejectUnauthorized: true, servername: target.host, ...(ca ? { ca: validatePublicCa(ca) } : {}) },
    application_name: "nitrocrop-qa-metadata-only",
    connectionTimeoutMillis: 10_000, query_timeout: 12_000,
    // Never request a session-default change. Effective READ ONLY is established
    // and checked explicitly inside each authorized inventory transaction.
    options: "-c statement_timeout=8000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=15000 -c search_path=pg_catalog",
  };
}

export function cleanInventoryEnvironment(secret: string, target: ApprovedTarget, ca?: string): Record<string, string> {
  inventoryConfig(secret, target, ca); // Validate BEFORE child creation or socket.
  return {
    SUPABASE_QA_ADMIN_URL: secret,
    SUPABASE_QA_PROJECT_REF: target.projectRef,
    SUPABASE_QA_EXPECTED_HOST: target.host,
    NITROCROP_METADATA_ONLY: "yes",
    ...(ca ? { SUPABASE_QA_CA_PEM: ca } : {}),
  };
}

export function assertCleanEnvironment(env: NodeJS.ProcessEnv): void {
  const permitted = new Set([
    "SUPABASE_QA_ADMIN_URL", "SUPABASE_QA_PROJECT_REF",
    "SUPABASE_QA_EXPECTED_HOST", "NITROCROP_METADATA_ONLY", "SUPABASE_QA_CA_PEM",
  ]);
  if (Object.keys(env).some(key => !permitted.has(key))) block("INHERITED_ENVIRONMENT_FORBIDDEN");
  if (env.NITROCROP_METADATA_ONLY !== "yes") block("METADATA_APPROVAL_REQUIRED");
}

export const DRIVER_FAILURES: Readonly<Record<string, string>> = Object.freeze({
  "28P01": "AUTHENTICATION_FAILED", "28000": "AUTHORIZATION_FAILED",
  "42501": "CATALOG_PERMISSION_DENIED", "42703": "CATALOG_COMPATIBILITY_ERROR",
  "42P01": "CATALOG_COMPATIBILITY_ERROR", "08P01": "PROTOCOL_OR_STARTUP_OPTIONS_REJECTED",
  "57P03": "DATABASE_UNAVAILABLE", "57014": "CATALOG_QUERY_TIMEOUT",
  ENOTFOUND: "NETWORK_UNAVAILABLE", EAI_AGAIN: "NETWORK_UNAVAILABLE",
  ECONNREFUSED: "NETWORK_UNAVAILABLE", ETIMEDOUT: "NETWORK_UNAVAILABLE",
  SELF_SIGNED_CERT_IN_CHAIN: "TLS_TRUST_FAILED",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "TLS_TRUST_FAILED",
  DEPTH_ZERO_SELF_SIGNED_CERT: "TLS_TRUST_FAILED", CERT_HAS_EXPIRED: "TLS_TRUST_FAILED",
  ERR_TLS_CERT_ALTNAME_INVALID: "TLS_TRUST_FAILED",
});

export function safeFailure(error: unknown): { status: "blocked"; reason: string } {
  // Never log message/stack/detail/config from a driver, TLS or spawn error.
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const reason = error instanceof InventoryBlocked ? error.reason :
    typeof code === "string" && Object.hasOwn(DRIVER_FAILURES, code)
      ? DRIVER_FAILURES[code] : "CONNECTION_OR_QUERY_FAILED";
  return { status: "blocked", reason };
}

export function redactReport(report: unknown, secret: string): string {
  const url = new URL(secret); // Already validated, never printed.
  const sensitiveValues = [secret, url.password, decodeURIComponent(url.password)];
  return JSON.stringify(report, (_key, value: unknown) => {
    if (typeof value !== "string") return value;
    for (const sensitive of sensitiveValues) {
      if (sensitive) value = (value as string).split(sensitive).join("[REDACTED]");
    }
    return value;
  }, 2);
}
