import { createHash } from "node:crypto";

// Every imported/exported field is named. Never depend on physical column order.
export const TABLES = Object.freeze({
  app_users: ["id","clerk_user_id","email","name","role","status","subscription_duration_days",
    "subscription_expires_at","privacy_version","privacy_ack_at","invitation_id","invited_at","created_at"],
  security_state: ["key","value"],
  privacy_requests: ["id","user_id","type","message","status","response","created_at"],
  security_events: ["id","actor_id","target_id","action","created_at"],
  osservazioni: ["id","owner_id","observation_id","data","data_trapianto","tipo_intervento",
    "giorni","eta_piantina","cliente","appezzamento","resa","varieta","n1","n2","n3","n4","n5",
    "media","ottimale","discostamento","dose","created_at","lat","lng","piante_semi_ha",
    "piante_semi_unita","piante_ha_equivalenti","fase_fenologica","bbch","fase_fonte",
    "azoto_totale","azoto_gia_distribuito","quota_azoto"],
});
const quote = (value) => `"${value}"`;
export function copyHeader(table) {
  if (!Object.hasOwn(TABLES, table)) throw new Error("UNAPPROVED_TABLE");
  return `COPY public.${quote(table)} (${TABLES[table].map(quote).join(", ")}) FROM stdin;`;
}
export function validatedCopyHeader(line) {
  const match = /^COPY (?:"public"|public)\.(?:"([a-z_]+)"|([a-z_]+)) \(([^)]+)\) FROM stdin;$/.exec(line);
  if (!match) throw new Error("COPY_WITH_EXPLICIT_COLUMNS_REQUIRED");
  const table = match[1] ?? match[2];
  if (!Object.hasOwn(TABLES, table)) throw new Error("UNAPPROVED_TABLE");
  const columns = match[3].split(",").map((column) => column.trim().replace(/^"([a-z0-9_]+)"$/, "$1"));
  if (columns.length !== TABLES[table].length || new Set(columns).size !== columns.length ||
      columns.some((column) => !TABLES[table].includes(column))) {
    throw new Error("COPY_COLUMNS_MISMATCH");
  }
  return { table, columns };
}

// Pass only validated COPY sections; never execute SQL preambles/functions from a dump.
export async function* applicationCopy(lines, counts = {}) {
  let active;
  const seen = new Set();
  for await (const line of lines) {
    if (line.length > 16 * 1024 * 1024) throw new Error("COPY_ROW_TOO_LARGE");
    if (!active) {
      if (!line.startsWith("COPY ")) continue;
      const { table } = validatedCopyHeader(line);
      if (seen.has(table) || (table !== "app_users" && !seen.has("app_users"))) {
        throw new Error("COPY_ORDER_OR_DUPLICATE");
      }
      seen.add(table);
      counts[table] = 0;
      active = table;
    } else if (line === "\\.") {
      active = undefined;
    } else {
      counts[active]++;
    }
    yield line + "\n";
  }
  if (active || seen.size !== Object.keys(TABLES).length) throw new Error("INCOMPLETE_APPLICATION_COPY");
}

export function countAssertions(counts) {
  return Object.keys(TABLES).map((table) => {
    const count = counts[table];
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("INVALID_ROW_COUNT");
    return `DO $verify$ BEGIN IF (SELECT count(*) FROM public.${quote(table)}) <> ${count} ` +
      `THEN RAISE EXCEPTION 'Imported count mismatch'; END IF; END $verify$;\n`;
  }).join("");
}

// Call only after explicit approval to read real data and freeze the source.
// Caller supplies a connected client; no URLs or application side effects here.
export async function fingerprint(client, table) {
  if (!Object.hasOwn(TABLES, table)) throw new Error("UNAPPROVED_TABLE");
  const columns = TABLES[table].map(quote).join(", ");
  const key = table === "security_state" ? "key" : "id";
  const hash = createHash("sha256");
  let last = null;
  let count = 0;
  for (;;) {
    const probe = await client.query("SELECT current_setting('transaction_read_only') AS read_only");
    if (probe.rows[0]?.read_only !== "on") throw new Error("READ_ONLY_REQUIRED");
    const page = await client.query(`SELECT ${quote(key)} AS page_key, to_jsonb(t)::text AS canonical
      FROM (SELECT ${columns} FROM public.${quote(table)}
        WHERE ($1::text IS NULL OR ${quote(key)} COLLATE "C" > $1::text COLLATE "C")
        ORDER BY ${quote(key)} COLLATE "C" LIMIT 1000) AS t
      ORDER BY ${quote(key)} COLLATE "C"`, [last]);
    if (!page.rows.length) break;
    for (const row of page.rows) hash.update(row.canonical).update("\n");
    count += page.rows.length;
    last = page.rows.at(-1).page_key;
  }
  return { count, sha256: hash.digest("hex") };
}
