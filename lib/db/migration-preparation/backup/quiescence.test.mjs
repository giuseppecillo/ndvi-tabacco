import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {QUIESCENCE_SQL,observeQuiescence} from "./quiescence.mjs";

function fake({sessions=[],prepared=0,subscriptions=0,schedulers=[],mode="on",fail=false}={}) {
  const calls=[];
  return {calls,async query(sql) {
    calls.push(sql);
    if(sql.startsWith("BEGIN") || sql==="ROLLBACK") return {rows:[]};
    if(sql.includes("current_setting")) return {rows:[{mode}]};
    if(fail) throw Error("synthetic metadata failure");
    if(sql===QUIESCENCE_SQL.sessions) return {rows:sessions};
    if(sql===QUIESCENCE_SQL.prepared) return {rows:[{n:prepared}]};
    if(sql===QUIESCENCE_SQL.subscriptions) return {rows:[{n:subscriptions}]};
    if(sql===QUIESCENCE_SQL.schedulers) return {rows:schedulers};
    throw Error("unapproved query");
  }};
}
test("clear metadata observation is read-only and always ends in rollback",async()=>{
  const client=fake();assert.equal((await observeQuiescence(client)).clear,true);
  assert.equal(client.calls.at(-1),"ROLLBACK");
  assert.equal(client.calls.filter(sql=>sql.includes("current_setting")).length,4);
});
test("idle clients and opaque workers block; absence of transactions alone is insufficient",async()=>{
  for(const sessions of [
    [{backend_type:"client backend",state:"idle",transaction_open:false}],
    [{backend_type:null,state:null,transaction_open:false}],
    [{backend_type:"logical replication worker",state:"active",transaction_open:true}],
  ]) assert.equal((await observeQuiescence(fake({sessions}))).clear,false);
});
test("prepared transactions, subscriptions and schedulers each block",async()=>{
  for(const scenario of [{prepared:1},{subscriptions:1},{schedulers:[{extname:"pg_cron"}]}])
    assert.equal((await observeQuiescence(fake(scenario))).clear,false);
});
test("readonly failure and query errors rollback without retries",async()=>{
  for(const scenario of [{mode:"off"},{fail:true}]) {
    const client=fake(scenario);
    await assert.rejects(observeQuiescence(client));
    assert.equal(client.calls.at(-1),"ROLLBACK");
    assert.equal(client.calls.filter(sql=>sql.startsWith("BEGIN")).length,1);
  }
});
test("observation SQL has no application row reads or mutation functions",()=>{
  for(const sql of Object.values(QUIESCENCE_SQL)) {
    assert.match(sql,/^SELECT/);
    assert.doesNotMatch(sql,/\bpublic\.|pg_terminate_backend|pg_cancel_backend|pg_stat_clear_snapshot|\b(CREATE|ALTER|INSERT|UPDATE|DELETE|COMMIT)\b/i);
  }
  const source=readFileSync(new URL("./verify-quiescence.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\bDATABASE_URL\b|SUPABASE_QA_ADMIN_URL|pg_dump|rejectUnauthorized\s*:\s*false/);
  assert.ok(source.includes("--writers-stopped-confirmed"));
  assert.ok(source.includes("--authorized-phase6-readonly-check"));
});
