// Application pool configuration. Pure: no env mutation or connection.
import { X509Certificate } from "node:crypto";
import type { PoolConfig } from "pg";
import { SUPABASE_RUNTIME_CA } from "./supabase-runtime-ca";

export const RUNTIME_HOST = "aws-0-eu-west-1.pooler.supabase.com";
export const RUNTIME_PROJECT = "bhnaarbzpmcniesxyldx";
const CA_SHA256 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";
export function runtimeConnectionConfig(env: NodeJS.ProcessEnv): PoolConfig {
  const backend = env.NITROCROP_DB_BACKEND ?? "replit";
  if (backend === "replit") {
    if (!env.DATABASE_URL) throw new Error("REPLIT_DATABASE_URL_REQUIRED");
    return { connectionString: env.DATABASE_URL };
  }
  if (backend !== "supabase") throw new Error("DATABASE_BACKEND_INVALID");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("GLOBAL_TLS_DISABLE_NOT_ALLOWED");
  let url: URL;
  let username: string;
  let password: string;
  try {
    url = new URL(env.NITROCROP_RUNTIME_DATABASE_URL ?? "");
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch { throw new Error("RUNTIME_CONNECTION_INVALID"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== RUNTIME_HOST || (url.port && url.port !== "5432") ||
      url.pathname !== "/postgres" || url.hash ||
      username !== `app_runtime.${RUNTIME_PROJECT}` || !password ||
      [...url.searchParams].some(([key,value]) => key !== "sslmode" || value !== "verify-full") ||
      [...url.searchParams].length > 1) throw new Error("RUNTIME_DESTINATION_OR_ROLE_INVALID");
  const certificate = new X509Certificate(SUPABASE_RUNTIME_CA);
  if (!certificate.ca || certificate.fingerprint256 !== CA_SHA256 ||
      Date.now() < Date.parse(certificate.validFrom) ||
      Date.now() > Date.parse(certificate.validTo)) throw new Error("RUNTIME_CA_NOT_APPROVED");
  // Explicit properties avoid connectionString sslmode overriding strict TLS.
  return {
    host: RUNTIME_HOST, port: 5432, database: "postgres", user: username, password,
    ssl: { ca: SUPABASE_RUNTIME_CA, rejectUnauthorized: true, servername: RUNTIME_HOST },
    application_name: "nitrocrop_backend_runtime", max: 5,
    connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
  };
}
