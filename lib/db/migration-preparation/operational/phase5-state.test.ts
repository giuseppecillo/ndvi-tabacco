import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TABLES } from "./data.mjs";
import { APP_ROLES,POLICY_SPEC } from "./phase5-cases.mjs";
import { validateState } from "./phase5-state";

function state() {
  return {
    roles:APP_ROLES.map(rolname=>({rolname,rolcanlogin:false,rolsuper:false,
      rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false,
      can_assume_admin:false})),
    memberships:[],
    tables:Object.entries(TABLES).map(([relname,columns])=>({relname,columns,
      owner:"app_migrator",relrowsecurity:true,relforcerowsecurity:true})),
    policies:Object.keys(POLICY_SPEC).flatMap(relname=>POLICY_SPEC[relname].map(p=>({
      relname,polname:p.name,polcmd:p.command,polpermissive:true,
      qual:p.qual,check_expr:p.check,roles:p.roles,
    }))),
  };
}
test("accept exact policy/NOLOGIN/owner/FORCE schema preconditions",()=>{
  assert.doesNotThrow(()=>validateState(state()));
});
test("fail closed on missing/altered policies or an additional policy",()=>{
  const missing=state();missing.policies.pop();
  assert.throws(()=>validateState(missing));
  const changed=state();changed.policies[0].qual="false";
  assert.throws(()=>validateState(changed));
  const extra=state();extra.policies.push({...extra.policies[0],polname:"extra"});
  assert.throws(()=>validateState(extra));
});
test("fail closed on LOGIN, role escalation and missing FORCE",()=>{
  const login=state();login.roles[0].rolcanlogin=true;
  assert.throws(()=>validateState(login));
  const escalated=state();escalated.roles[0].can_assume_admin=true;
  assert.throws(()=>validateState(escalated));
  const force=state();force.tables[0].relforcerowsecurity=false;
  assert.throws(()=>validateState(force));
});
test("offline runner audit: explicit opt-in, no COMMIT, no URL fallback or global changes",()=>{
  const source=readFileSync(new URL("./run-phase5.ts",import.meta.url),"utf8");
  assert.ok(source.includes('--authorized-synthetic-phase5'));
  assert.ok(source.includes('client.query("ROLLBACK")'));
  assert.ok(source.includes('verify.query("ROLLBACK")'));
  assert.ok(source.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
  assert.doesNotMatch(source,/\bDATABASE_URL\b|REPLIT_PROD_BACKUP_URL|rejectUnauthorized\s*:\s*false/);
  assert.doesNotMatch(source,/query\(["'`]COMMIT\b|ALTER ROLE|REVOKE|CREATE DATABASE/i);
  assert.ok(source.includes('JSON.stringify(after)===JSON.stringify(before)'));
});
