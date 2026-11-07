import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TABLES } from "./data.mjs";
import { makePhase5Plan, POLICY_SPEC, APP_ROLES, API_ROLES, insertStatement } from "./phase5-cases.mjs";

const plan = makePhase5Plan("a".repeat(32));
test("exactly nine explicitly synthetic fixtures in the existing five tables", () => {
  assert.equal(plan.fixtures.length,9);
  assert.deepEqual(new Set(plan.fixtures.map(f=>f.table)),new Set(Object.keys(TABLES)));
  for(const f of plan.fixtures) {
    assert.ok(f.parameters.some(v=>typeof v==="string" && v.startsWith(plan.prefix)));
    assert.match(f.sql,/^INSERT INTO public\."/);
    assert.equal((f.sql.match(/\$\d+/g)??[]).length,f.parameters.length);
  }
  for(const f of plan.fixtures.filter(f=>f.table==="app_users")) {
    assert.ok(f.parameters.some(v=>typeof v==="string" && v.endsWith("@example.invalid")));
  }
});
test("unique cases, approved roles and no transaction/credential/escalation commands", () => {
  assert.equal(new Set(plan.cases.map(c=>c.name)).size,plan.cases.length);
  for(const c of plan.cases) {
    assert.ok([...APP_ROLES,...API_ROLES].includes(c.role));
    assert.ok(["allow","deny","probe"].includes(c.expect));
    assert.doesNotMatch(c.sql,/\b(COMMIT|BEGIN|SET\s+ROLE|CREATE\s+ROLE|ALTER\s+ROLE|GRANT|REVOKE|COPY)\b/i);
  }
});
test("all fifteen policy definitions and their exact role/command expectations", () => {
  assert.equal(Object.values(POLICY_SPEC).flat().length,15);
  assert.deepEqual(POLICY_SPEC.security_events.map(p=>p.name),
    ["migration_owner","backend_read","backend_audit_insert","backend_audit_anonymize"]);
  for(const table of Object.keys(TABLES)) {
    assert.equal(POLICY_SPEC[table].filter(p=>p.name==="migration_owner").length,1);
    assert.equal(POLICY_SPEC[table].filter(p=>p.name==="backend_read").length,1);
  }
});
test("audit has two NULL-only positive updates; other audit mutations must be denied", () => {
  const anonymize=plan.cases.filter(c=>c.anonymized);
  assert.equal(anonymize.length,2);
  assert.ok(anonymize.every(c=>c.expect==="allow" && /SET "(actor_id|target_id)"=NULL/.test(c.sql)));
  for(const field of ["id","action","created_at"]) {
    assert.ok(plan.cases.some(c=>c.role==="app_runtime" && c.expect==="deny" &&
      c.sql.startsWith(`UPDATE public.security_events SET "${field}"`)));
  }
});
test("global capability probes only create bounded synthetic TEMP/large objects", () => {
  const probes=plan.cases.filter(c=>c.expect==="probe");
  assert.equal(probes.length,6);
  assert.equal(probes.filter(c=>c.largeObject).length,4);
  assert.ok(probes.every(c=>["app_runtime","app_readonly"].includes(c.role)));
  assert.ok(probes.every(c=>c.sql.includes(plan.prefix) || /pg_catalog\.lo_(create|from_bytea)/.test(c.sql)));
});
test("identifiers cannot be supplied as arbitrary SQL", () => {
  assert.throws(()=>makePhase5Plan("'; COMMIT; --"));
  assert.throws(()=>insertStatement("auth.users",{id:"bad"}));
  assert.throws(()=>insertStatement("app_users",{unexpected:"bad"}));
});
test("manifest never imports connections or accesses a secret/environment", () => {
  const source=readFileSync(new URL("./phase5-cases.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/process\.env|targetClient|DATABASE_URL|SUPABASE_QA_ADMIN_URL|from\s+["']pg["']/);
});
