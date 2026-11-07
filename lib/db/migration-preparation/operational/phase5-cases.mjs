// Pure synthetic specification: no environment, pg import, connection or execution.
import { TABLES } from "./data.mjs";

export const APP_ROLES = ["app_migrator", "app_runtime", "app_readonly"];
export const API_ROLES = ["anon", "authenticated", "service_role"];
export const POLICY_SPEC = Object.freeze(Object.fromEntries(Object.keys(TABLES).map(table =>
  [table, [
    { name: "migration_owner", command: "*", roles: ["app_migrator"], qual: "true", check: "true" },
    { name: "backend_read", command: "r", roles: ["app_readonly", "app_runtime"], qual: "true", check: null },
    ...(["app_users","privacy_requests","osservazioni"].includes(table) ? [
      { name: "backend_write", command: "*", roles: ["app_runtime"], qual: "true", check: "true" },
    ] : []),
    ...(table === "security_events" ? [
      { name: "backend_audit_insert", command: "a", roles: ["app_runtime"], qual: null, check: "true" },
      { name: "backend_audit_anonymize", command: "w", roles: ["app_runtime"], qual: "true", check: "true" },
    ] : []),
  ]]
)));

export function insertStatement(table, row) {
  if (!Object.hasOwn(TABLES, table) ||
      Object.keys(row).some(column => !TABLES[table].includes(column))) {
    throw Error("UNAPPROVED_SYNTHETIC_FIELDS");
  }
  const columns = Object.keys(row);
  return { sql: `INSERT INTO public."${table}" (${columns.map(c => `"${c}"`).join(",")}) VALUES (${columns.map((_,i) => `$${i+1}`).join(",")})`,
    parameters: Object.values(row) };
}

export function makePhase5Plan(token) {
  if (!/^[a-f0-9]{32}$/.test(token)) throw Error("SYNTHETIC_TOKEN_REQUIRED");
  const prefix = `qa_p5_${token}`;
  const id = label => `${prefix}_${label}`;
  const user = suffix => ({ id: id(`user_${suffix}`),
    email: `${prefix}.${suffix}@example.invalid`, clerk_user_id: id(`clerk_${suffix}`),
    name: "QA sintetico", role: "user", status: "active" });
  const observation = suffix => ({
    id: id(`obs_${suffix}`), owner_id: id(`user_${suffix === "c" ? "a" : suffix}`),
    observation_id: `QA-${suffix}`, data: "2026-11-07", tipo_intervento: "tabacco",
    giorni: 30, eta_piantina: "QA", cliente: "Azienda sintetica QA", appezzamento: "QA",
    resa: 60, varieta: "QA", n1: 0.4, n2: 0.4, n3: 0.4, n4: 0.4, n5: 0.4,
    media: 0.4, ottimale: 0.5, discostamento: -0.2, dose: 18,
    lat: 0, lng: 0, azoto_totale: 180, azoto_gia_distribuito: 0, quota_azoto: 90,
  });
  const rows = suffix => ({
    app_users: user(suffix),
    security_state: { key: id(`state_${suffix}`), value: "QA sintetico" },
    privacy_requests: { id: id(`privacy_${suffix}`),
      user_id: id(`user_${suffix === "c" ? "a" : suffix}`), type: "QA", message: "Solo test sintetico" },
    security_events: { id: id(`event_${suffix}`), actor_id: id("user_a"),
      target_id: id("user_b"), action: "QA_SYNTHETIC" },
    osservazioni: observation(suffix),
  });
  const a = rows("a"), b = rows("b"), c = rows("c");
  const fixtures = [
    ["app_users",a.app_users], ["app_users",b.app_users],
    ["security_state",a.security_state],
    ["privacy_requests",a.privacy_requests], ["privacy_requests",b.privacy_requests],
    ["security_events",a.security_events], ["security_events",b.security_events],
    ["osservazioni",a.osservazioni], ["osservazioni",b.osservazioni],
  ].map(([table,row]) => ({ table, ...insertStatement(table,row) }));
  const cases = [];
  const add = (role,name,statement,expect="allow",extra={}) =>
    cases.push({ role,name,...statement,expect,...extra });
  const predicate = table => ({
    key: table === "security_state" ? "key" : "id",
    value: a[table][table === "security_state" ? "key" : "id"],
  });
  const field = { app_users: "name", security_state: "value", privacy_requests: "message",
    security_events: "action", osservazioni: "cliente" };
  for (const role of APP_ROLES) for (const table of Object.keys(TABLES)) {
    add(role,`${role}: SELECT ${table}`,{
      sql: `SELECT count(*)::int AS n FROM public."${table}"`,parameters:[],
    },"allow",{ scalar: table === "security_state" ? 1 : 2 });
  }
  for (const table of ["app_users","privacy_requests","osservazioni"]) {
    const p = predicate(table);
    add("app_runtime",`runtime INSERT ${table}`,insertStatement(table,c[table]),"allow",{ affected:1 });
    add("app_runtime",`runtime UPDATE ${table}`,{
      sql:`UPDATE public."${table}" SET "${field[table]}"=$1 WHERE "${p.key}"=$2`,
      parameters:["QA aggiornato",p.value],
    },"allow",{ affected:1 });
    add("app_runtime",`runtime DELETE ${table}`,{
      sql:`DELETE FROM public."${table}" WHERE "${p.key}"=$1`,parameters:[p.value],
    },"allow",{ affected:1, ...(table === "app_users" ? { checkCascade: id("user_a") } : {}) });
  }
  add("app_runtime","runtime INSERT audit",insertStatement("security_events",c.security_events),"allow",{affected:1});
  for (const column of ["actor_id","target_id"]) {
    add("app_runtime",`anonimizzazione ${column}`,{
      sql:`UPDATE public.security_events SET "${column}"=NULL WHERE id=$1 RETURNING "${column}" AS anonymized`,
      parameters:[id("event_a")],
    },"allow",{affected:1,anonymized:true});
  }
  for (const table of Object.keys(TABLES)) {
    const p=predicate(table);
    const mutations=[
      insertStatement(table,c[table]),
      {sql:`UPDATE public."${table}" SET "${field[table]}"=$1 WHERE "${p.key}"=$2`,parameters:["QA vietato",p.value]},
      {sql:`DELETE FROM public."${table}" WHERE "${p.key}"=$1`,parameters:[p.value]},
      {sql:`TRUNCATE TABLE public."${table}"`,parameters:[]},
    ];
    mutations.forEach((statement,i) => add("app_readonly",`readonly deny ${table} ${i}`,statement,"deny"));
    add("app_migrator",`migrator UPDATE ${table}`,mutations[1],"allow",{affected:1});
  }
  for (const statement of [
    insertStatement("security_state",c.security_state),
    {sql:"UPDATE public.security_state SET value=$1 WHERE key=$2",parameters:["QA",id("state_a")]},
    {sql:"DELETE FROM public.security_state WHERE key=$1",parameters:[id("state_a")]},
    ...["id","action","created_at"].map(column => ({
      sql:`UPDATE public.security_events SET "${column}"="${column}" WHERE id=$1`,
      parameters:[id("event_a")],
    })),
    {sql:"DELETE FROM public.security_events WHERE id=$1",parameters:[id("event_a")]},
    {sql:"TRUNCATE public.security_events",parameters:[]},
  ]) add("app_runtime",`runtime deny protected ${cases.length}`,statement,"deny");
  for (const role of API_ROLES) for (const table of Object.keys(TABLES)) {
    add(role,`${role}: deny SELECT ${table}`,{
      sql:`SELECT count(*) FROM public."${table}"`,parameters:[],
    },"deny");
    add(role,`${role}: deny INSERT ${table}`,insertStatement(table,c[table]),"deny");
  }
  const probe = `${prefix}_probe`;
  add("app_migrator","migrator CREATE ALTER DROP probe",{
    sql:`CREATE TABLE public."${probe}"(id text); ALTER TABLE public."${probe}" ADD COLUMN qa integer; DROP TABLE public."${probe}"`,
    parameters:[],
  },"allow");
  for (const role of ["app_runtime","app_readonly"]) {
    add(role,`${role}: deny public DDL`,{sql:`CREATE TABLE public."${probe}"(id text)`,parameters:[]},"deny");
    add(role,`${role}: deny disabling RLS`,{
      sql:"ALTER TABLE public.osservazioni DISABLE ROW LEVEL SECURITY",parameters:[],
    },"deny");
    add(role,`${role}: TEMP capability`,{
      sql:`CREATE TEMP TABLE "${prefix}_temp"(id integer)`,parameters:[],
    },"probe");
    add(role,`${role}: large object capability`,{
      sql:"SELECT pg_catalog.lo_create(0) AS qa_oid",parameters:[],
    },"probe",{largeObject:true});
    add(role,`${role}: large object bytes capability`,{
      sql:"SELECT pg_catalog.lo_from_bytea(0,decode('00010203','hex')) AS qa_oid",parameters:[],
    },"probe",{largeObject:true});
  }
  return {prefix,probe,temp:`${prefix}_temp`,fixtures,cases,
    ids:Object.keys(TABLES).map(table=>({table,key:table==="security_state"?"key":"id",
      values:table==="security_state"?[id("state_a"),id("state_c")]:
        ["a","b","c"].map(suffix=>rows(suffix)[table].id)}))};
}
