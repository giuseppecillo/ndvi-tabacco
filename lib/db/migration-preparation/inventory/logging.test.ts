import test from "node:test";
import assert from "node:assert/strict";
import {readLoggingMetadata, BEGIN_READ_ONLY, READ_ONLY_PROBE, METADATA_QUERIES} from "./catalog";
import {LOGGING_QUERIES} from "./logging-queries";

function fixture(readonly="on") {
  const calls:string[]=[];
  return {calls,async query(sql:string) {
    calls.push(sql);
    if(sql===READ_ONLY_PROBE) return {rows:[{transaction_read_only:readonly}]};
    if(sql===METADATA_QUERIES.identity) return {rows:[{
      database:"postgres",current_user:"postgres",session_user:"postgres",
    }]};
    if(sql===LOGGING_QUERIES.permissions) return {rows:Array.from({length:5},()=>({can_set:false}))};
    return {rows:[]};
  }};
}
test("logging mode permits only three fixed metadata SELECTs, each preceded by read-only probe",async()=>{
  const client=fixture();
  await readLoggingMetadata(client);
  assert.deepEqual(client.calls,[BEGIN_READ_ONLY,READ_ONLY_PROBE,METADATA_QUERIES.identity,
    READ_ONLY_PROBE,LOGGING_QUERIES.permissions,READ_ONLY_PROBE,LOGGING_QUERIES.extensions,"ROLLBACK"]);
  assert.ok(client.calls.every(sql=>sql===BEGIN_READ_ONLY || sql==="ROLLBACK" ||
    sql===READ_ONLY_PROBE || sql===METADATA_QUERIES.identity ||
    Object.values(LOGGING_QUERIES).includes(sql)));
});
test("read-only not on stops before the first metadata SELECT and always rolls back",async()=>{
  const client=fixture("off");
  await assert.rejects(readLoggingMetadata(client),/TRANSACTION_NOT_READ_ONLY/);
  assert.deepEqual(client.calls,[BEGIN_READ_ONLY,READ_ONLY_PROBE,"ROLLBACK"]);
});
test("metadata failure still rolls back",async()=>{
  const client=fixture();
  const old=client.query;
  client.query=async sql=>{
    if(sql===LOGGING_QUERIES.permissions) throw Error("synthetic metadata rejection");
    return old(sql);
  };
  await assert.rejects(readLoggingMetadata(client),/synthetic metadata rejection/);
  assert.equal(client.calls.at(-1),"ROLLBACK");
});
