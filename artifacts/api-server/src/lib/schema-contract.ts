/** Application schema contract only; no database client or side effects. */
export interface ColumnContract {
  type: string;
  notNull: boolean;
  defaultExpression: string | null;
}
const col = (type: string, notNull = false, defaultExpression: string | null = null): ColumnContract =>
  ({ type, notNull, defaultExpression });
const text = (notNull = false, value: string | null = null) => col("text", notNull, value);
const number = (notNull = false) => col("numeric", notNull);
const instant = (notNull = false, value: string | null = null) =>
  col("timestamp with time zone", notNull, value);

export const APPLICATION_COLUMNS: Record<string, Record<string, ColumnContract>> = {
  app_users: {
    id: text(true), clerk_user_id: text(), email: text(true), name: text(true, "''::text"),
    role: text(true, "'user'::text"), status: text(true, "'active'::text"),
    privacy_version: text(), privacy_ack_at: instant(), invitation_id: text(), invited_at: instant(),
    created_at: instant(true, "now()"),
    subscription_duration_days: col("integer", false, "30"),
    subscription_expires_at: instant(false, "(now() + '30 days'::interval)"),
  },
  security_state: { key: text(true), value: text(true) },
  privacy_requests: {
    id: text(true), user_id: text(true), type: text(true), message: text(true),
    status: text(true, "'pending'::text"), response: text(true, "''::text"),
    created_at: instant(true, "now()"),
  },
  security_events: {
    id: text(true), actor_id: text(), target_id: text(), action: text(true),
    created_at: instant(true, "now()"),
  },
  osservazioni: {
    id: text(true), owner_id: text(), observation_id: text(), data: text(true),
    data_trapianto: text(), tipo_intervento: text(true), giorni: col("integer", true),
    eta_piantina: col("character varying", true), cliente: text(true), appezzamento: text(true),
    resa: number(true), varieta: text(true),
    n1: number(true), n2: number(true), n3: number(true), n4: number(true), n5: number(true),
    media: number(true), ottimale: number(true), discostamento: number(true), dose: number(true),
    created_at: instant(), lat: number(), lng: number(),
    piante_semi_ha: number(), piante_semi_unita: text(), piante_ha_equivalenti: number(),
    fase_fenologica: text(), bbch: text(), fase_fonte: text(),
    azoto_totale: number(), azoto_gia_distribuito: number(), quota_azoto: number(),
  },
};

export const REQUIRED_UNIQUE_KEYS: Record<string, string[][]> = {
  app_users: [["id"], ["email"], ["clerk_user_id"]],
  security_state: [["key"]], privacy_requests: [["id"]], security_events: [["id"]],
  osservazioni: [["id"], ["owner_id", "observation_id"]],
};
export const REQUIRED_CHECKS = [
  "CHECK (role = ANY (ARRAY['admin'::text, 'user'::text]))",
  "CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleting'::text]))",
  "CHECK (subscription_duration_days >= 1 AND subscription_duration_days <= 3650)",
];

/** Compare known catalog renderings, not arbitrary SQL for execution. */
export const normalizeCatalogExpression = (value: unknown) =>
  typeof value === "string" ? value.replace(/::text\b/g, "").replace(/[\s()]/g, "") : null;

export type SchemaRow = Record<string, unknown>;
export interface SchemaMetadata {
  relations: SchemaRow[];
  columns: SchemaRow[];
  constraints: SchemaRow[];
  indexes: SchemaRow[];
}

const sameColumns = (actual: unknown, expected: string[]) =>
  Array.isArray(actual) && actual.length === expected.length &&
  actual.every((value, index) => value === expected[index]);

/** Pure validation: accepts physical column reordering, never repairs data. */
export function schemaIncompatibilities(metadata: SchemaMetadata): string[] {
  const issues: string[] = [];
  for (const [table, columns] of Object.entries(APPLICATION_COLUMNS)) {
    const relation = metadata.relations.find(row => row.table_name === table);
    if (!relation || !["r", "p"].includes(String(relation.kind))) {
      issues.push(`${table}: required table missing or wrong relation kind`);
      continue;
    }
    if (relation.visible !== true) issues.push(`${table}: public table shadowed by search_path`);
    for (const [name, expected] of Object.entries(columns)) {
      const actual = metadata.columns.find(row => row.table_name === table && row.column_name === name);
      if (!actual) {
        issues.push(`${table}.${name}: required column missing`);
        continue;
      }
      if (actual.type !== expected.type || actual.not_null !== expected.notNull ||
          normalizeCatalogExpression(actual.default_expression) !==
          normalizeCatalogExpression(expected.defaultExpression) ||
          actual.identity !== "" || actual.generated !== "") {
        issues.push(`${table}.${name}: incompatible type, nullability, default or generated value`);
      }
    }
    for (const extra of metadata.columns.filter(row => row.table_name === table &&
      !Object.hasOwn(columns, String(row.column_name)))) {
      if (extra.not_null === true && extra.default_expression === null &&
          extra.identity === "" && extra.generated === "") {
        issues.push(`${table}.${String(extra.column_name)}: extra required column without default`);
      }
    }
    const primary = table === "security_state" ? ["key"] : ["id"];
    if (!metadata.constraints.some(row => row.table_name === table && row.kind === "p" &&
        row.validated === true && row.deferrable === false && sameColumns(row.columns, primary))) {
      issues.push(`${table}: required primary key missing or incompatible`);
    }
    for (const key of REQUIRED_UNIQUE_KEYS[table]) {
      if (!metadata.indexes.some(row => row.table_name === table && row.unique === true &&
          row.valid === true && row.ready === true && row.partial === false &&
          row.expression === false && row.immediate === true && sameColumns(row.columns, key))) {
        issues.push(`${table}: required immediate unique key (${key.join(",")}) missing`);
      }
    }
  }
  for (const [table, name] of [["osservazioni", "owner_id"], ["privacy_requests", "user_id"]]) {
    if (!metadata.constraints.some(row => row.table_name === table && row.kind === "f" &&
        row.validated === true && row.deferrable === false && sameColumns(row.columns, [name]) &&
        row.foreign_schema === "public" && row.foreign_table === "app_users" &&
        sameColumns(row.foreign_columns, ["id"]) && row.delete_action === "c")) {
      issues.push(`${table}.${name}: validated foreign key to app_users(id) ON DELETE CASCADE missing`);
    }
  }
  for (const expected of REQUIRED_CHECKS) {
    if (!metadata.constraints.some(row => row.table_name === "app_users" && row.kind === "c" &&
        row.validated === true && normalizeCatalogExpression(row.definition) ===
        normalizeCatalogExpression(expected))) {
      issues.push("app_users: required validated role/status/subscription check missing or incompatible");
    }
  }
  return issues;
}
