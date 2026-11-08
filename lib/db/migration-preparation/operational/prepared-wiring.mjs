// Pure transformation for a candidate build. NEVER writes application sources.
export function preparedDatabaseSource(source) {
  const original='export const pool = new Pool({ connectionString: process.env.DATABASE_URL });';
  const guard=`if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}`;
  if(!source.includes(original) || !source.includes(guard)) throw Error("DATABASE_WIRING_SOURCE_CHANGED");
  return source.replace('import * as schema from "./schema";',
    'import * as schema from "./schema";\nimport { runtimeConnectionConfig } from "./runtime-connection-config";')
    .replace(guard,"").replace(original,'export const pool = new Pool(runtimeConnectionConfig(process.env));')
    + '\nexport { verifyRuntimeIdentity } from "./runtime-identity";\n';
}
export function preparedStartupSource(source) {
  const anchor="await verifySecuritySchema();";
  if(!source.includes(anchor)) throw Error("STARTUP_WIRING_SOURCE_CHANGED");
  return 'import { pool, verifyRuntimeIdentity } from "@workspace/db";\n'+source.replace(anchor,
    'await verifyRuntimeIdentity(pool, process.env.NITROCROP_DB_BACKEND === "supabase");\n  '+anchor);
}
export function preparedAppSource(source) {
  const clerk='import { clerkMiddleware } from "@clerk/express";';
  const anchor='app.use("/api", (_req, res, next) => {';
  if(!source.includes(clerk) || !source.includes(anchor)) throw Error("APP_WIRING_SOURCE_CHANGED");
  return source.replace(clerk,
    'import { clerkMiddleware, getAuth } from "@clerk/express";\nimport { createMigrationPause } from "./middlewares/migrationPause";')
    .replace(anchor,'app.use(createMigrationPause(process.env, (req) => getAuth(req).userId));\n'+anchor);
}
