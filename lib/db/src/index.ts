import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { runtimeConnectionConfig } from "./runtime-connection-config";

const { Pool } = pg;

export const pool = new Pool(runtimeConnectionConfig(process.env));
export const db = drizzle(pool, { schema });

export * from "./schema";
export { verifyRuntimeIdentity } from "./runtime-identity";
export { verifyProductionRuntimePreflight } from "./production-runtime-preflight";
