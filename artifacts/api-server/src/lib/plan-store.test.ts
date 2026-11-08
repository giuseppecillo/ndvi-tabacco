import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pool from "./db";
import { saveWithUsage, countGeneratedMap, writePlan, locked, usageFor, deletePlanData } from "./plan-store";
import { nextPlan, planKey, useKey, contractPrefix, usagePrefix, visitFingerprint, PRO_BYTES, type StoredUse } from "./plan-model";
import router from "../routes/plans";
import { requireAccount, requireAdmin } from "../middlewares/access";
const owner={id:"synthetic-owner",role:"user" as const};
const other={id:"synthetic-other",role:"user" as const};
type Obs={owner_id:string;cliente:string;data:string;bytes:number;created_at:string};

/** Entirely in-memory SQL protocol double. Never opens a database connection. */
function fixture(t: {after:(fn:()=>void)=>void}, ready = true) {
  let state=new Map<string,string>();
  let observations:Obs[]=[];
  let snapshot: {state:Map<string,string>;observations:Obs[]}|null=null;
  const calls:string[]=[];
  let released=0;
  const query=async (raw:string,args:unknown[]=[]):Promise<{rows:any[];rowCount:number}> => {
    const sql=raw.trim(); calls.push(sql);
    const rows=(items:any[])=>({rows:items,rowCount:items.length});
    if(sql.startsWith("SELECT to_regclass"))return rows([{ready}]);
    if(sql==="BEGIN"){ snapshot={state:new Map(state),observations:structuredClone(observations)}; return rows([]); }
    if(sql==="COMMIT"){snapshot=null;return rows([]);}
    if(sql==="ROLLBACK"){if(snapshot){state=snapshot.state;observations=snapshot.observations;snapshot=null;}return rows([]);}
    if(sql.startsWith("SET LOCAL")||sql.startsWith("SELECT pg_advisory"))return rows([]);
    if(sql.startsWith("SELECT role,status"))return rows([{role:"user",status:"active"}]);
    if(sql.startsWith("SELECT value FROM app_plan_state"))return rows(state.has(String(args[0]))?[{value:state.get(String(args[0]))}]:[]);
    if(sql.startsWith("INSERT INTO app_plan_state")){
      const key=String(args[0]);
      if(!state.has(key)||!sql.includes("DO NOTHING"))state.set(key,String(args[2]));
      return rows([]);
    }
    if(sql.startsWith("UPDATE app_users"))return rows([]);
    if(sql.startsWith("SELECT DISTINCT btrim")){
      const [id,start,end]=args as string[];
      const visits=new Map(observations.filter(o=>o.owner_id===id&&o.created_at>=start&&o.created_at<end)
        .map(o=>[visitFingerprint(o.cliente,o.data),{customer:o.cliente.trim(),day:o.data}]));
      return rows([...visits.values()]);
    }
    if(sql.startsWith("SELECT key,value FROM app_plan_state")){
      return rows([...state].filter(([key])=>key.startsWith(String(args[0]))).map(([key,value])=>({key,value})));
    }
    if(sql.startsWith("SELECT owner_id,key,value,pg_column_size")){
      const ids=args[0] as string[];
      return rows([...state].filter(([key])=>ids.includes(key.split(":")[1]))
        .map(([key,value])=>({key,value,owner_id:JSON.parse(value).userId,bytes:Buffer.byteLength(key+value)})));
    }
    if(sql.startsWith("SELECT owner_id,sum(bytes)"))return rows((args[0] as string[]).map(id=>({owner_id:id,bytes:100})));
    if(sql.startsWith("SELECT owner_id, count(*)")){
      return rows((args[0] as string[]).map(id=>{
        const own=observations.filter(o=>o.owner_id===id);
        return {owner_id:id,observations:own.length,visits:new Set(own.map(o=>visitFingerprint(o.cliente,o.data))).size,
          bytes:own.reduce((sum,o)=>sum+o.bytes,0)};
      }));
    }
    if(sql==="synthetic_save"){
      observations.push({owner_id:String(args[0]),cliente:String(args[1]),data:String(args[2]),bytes:Number(args[3]),created_at:new Date().toISOString()});
      return rows([{ok:true}]);
    }
    if(sql.startsWith("DELETE FROM app_plan_state")){
      for(const [key,value] of state)if(JSON.parse(value).userId===args[0])state.delete(key);
      return rows([]);
    }
    throw new Error(`Unexpected offline query: ${sql.slice(0,60)}`);
  };
  const queryMock=mock.method(pool,"query",query as any);
  const connect=mock.method(pool,"connect",async()=>({query,release:()=>{released++;}}) as any);
  t.after(()=>{queryMock.mock.restore();connect.mock.restore();});
  const seed=(plan:"standard"|"pro"="standard")=>{
    const date=new Date();date.setUTCMonth(0,1);
    const p=nextPlan(owner.id,{plan,startsOn:date.toISOString().slice(0,10),renew:false,expectedPeriodId:null,requestId:randomUUID()},null);
    state.set(planKey(owner.id),JSON.stringify(p));
    state.set(`${contractPrefix(owner.id)}${p.periodId}`,JSON.stringify(p));
    return p;
  };
  const ledger=(periodId:string,kind:"visit"|"map",count:number)=>{
    for(let i=0;i<count;i++){
      const use:StoredUse={version:1,userId:owner.id,periodId,kind,entryId:kind==="visit"?visitFingerprint(`Customer${i}`,"2026-01-01"):randomUUID(),createdAt:new Date().toISOString()};
      state.set(useKey(use),JSON.stringify(use));
    }
  };
  const save=(customer="New customer",bytes=300)=>saveWithUsage(owner,customer,"2026-01-01",
    sql=>sql.query("synthetic_save",[owner.id,customer,"2026-01-01",bytes]));
  return {seed,ledger,save,calls,query,state:()=>state,observations:()=>observations,released:()=>released};
}
test("visit50 commits; visit51 rolls back; existing visit can add points without consuming extra quota",async t=>{
  const f=fixture(t);const p=f.seed();f.ledger(p.periodId,"visit",49);
  await f.save();assert.equal(f.observations().length,1);
  await f.save();assert.equal(f.observations().length,2);
  await assert.rejects(f.save("Customer51"),{code:"VISIT_QUOTA_EXCEEDED"});
  assert.equal(f.observations().length,2);
  assert.equal((await usageFor([owner]))[0].visitsUsed,50);
  assert.equal((await usageFor([owner]))[0].observationsTotal,2);
  assert.ok(f.calls.indexOf("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))")<f.calls.indexOf("synthetic_save"));
  assert.ok(f.calls.includes("ROLLBACK"));assert.equal(f.released(),3);
});
test("map50 is committed once, retries are free, map51 is rejected atomically",async t=>{
  const f=fixture(t);const p=f.seed();f.ledger(p.periodId,"map",49);
  const id=randomUUID();
  assert.equal((await countGeneratedMap(owner,id)).mapsUsed,50);
  assert.equal((await countGeneratedMap(owner,id)).mapsUsed,50);
  await assert.rejects(countGeneratedMap(owner,randomUUID()),{code:"MAP_QUOTA_EXCEEDED"});
  assert.equal((await usageFor([owner]))[0].mapsUsed,50);
});
test("Pro storage exhaustion rolls back BOTH the observation and its visit ledger",async t=>{
  const f=fixture(t);f.seed("pro");
  await assert.rejects(f.save("Large synthetic",PRO_BYTES+1),{code:"STORAGE_QUOTA_EXCEEDED"});
  assert.equal(f.observations().length,0);
  assert.equal([...f.state().keys()].filter(k=>k.startsWith(usagePrefix(owner.id))).length,0);
  assert.ok(f.calls.includes("ROLLBACK"));assert.equal(f.released(),1);
});
test("Pro map measures the archive once inside the transaction and returns that measurement",async t=>{
  const f=fixture(t);f.seed("pro");
  const result=await countGeneratedMap(owner,randomUUID());
  assert.equal(result.mapsUsed,1);
  assert.equal(f.calls.filter(sql=>sql.startsWith("SELECT owner_id, count(*)")).length,1);
  const measurement=f.calls.findIndex(sql=>sql.startsWith("SELECT owner_id, count(*)"));
  assert.ok(measurement>f.calls.findIndex(sql=>sql.startsWith("INSERT INTO app_plan_state")));
  assert.ok(measurement<f.calls.indexOf("COMMIT"));
});
test("Pro map storage overflow rolls back the event as well as its response",async t=>{
  const f=fixture(t);f.seed("pro");
  f.observations().push({owner_id:owner.id,cliente:"Synthetic",data:"2026-01-01",bytes:PRO_BYTES,created_at:new Date().toISOString()});
  await assert.rejects(countGeneratedMap(owner,randomUUID()),{code:"STORAGE_QUOTA_EXCEEDED"});
  assert.equal([...f.state().keys()].filter(k=>k.startsWith(usagePrefix(owner.id))).length,0);
  assert.equal(f.calls.at(-1),"ROLLBACK");
  assert.equal(f.observations().length,1);
});
test("upgrade preserves counts; renewal retains all observations and historical contract counters",async t=>{
  const f=fixture(t);const p=f.seed();await f.save("Historical customer");
  f.ledger(p.periodId,"map",3);
  await locked(owner.id,sql=>writePlan(owner.id,{plan:"pro",startsOn:p.startsOn,renew:false,expectedPeriodId:p.periodId,requestId:randomUUID()},sql));
  let usage=(await usageFor([owner]))[0];
  assert.equal(usage.visitsUsed,1);assert.equal(usage.mapsUsed,3);assert.equal(usage.plan,"pro");
  // A deliberate renewal changes counters only, even when it starts today.
  await locked(owner.id,sql=>writePlan(owner.id,{plan:"standard",startsOn:new Date().toISOString().slice(0,10),renew:true,expectedPeriodId:p.periodId,requestId:randomUUID()},sql));
  usage=(await usageFor([owner]))[0];
  assert.notEqual(usage.periodId,p.periodId);assert.equal(usage.mapsUsed,0);
  assert.equal(usage.visitsUsed,0);
  assert.equal(usage.observationsTotal,1);assert.equal(usage.periods.length,2);
  assert.equal(usage.periods.find(row=>row.periodId===p.periodId)?.mapsUsed,3);
  assert.ok(!f.calls.some(sql=>/^(DELETE FROM osservazioni|TRUNCATE|DROP|ALTER|CREATE)/i.test(sql)));
});
test("usage is scoped to the requested owner; account erasure removes only that owner's plan data",async t=>{
  const f=fixture(t);const p=f.seed();await f.save();f.ledger(p.periodId,"map",1);
  const otherPlan=nextPlan(other.id,{plan:"pro",startsOn:p.startsOn,renew:false,expectedPeriodId:null,requestId:randomUUID()},null);
  f.state().set(planKey(other.id),JSON.stringify(otherPlan));
  const own=(await usageFor([owner]))[0];
  assert.equal(own.userId,owner.id);assert.equal(own.plan,"standard");assert.ok(own.storageBytes>0);
  await deletePlanData(owner.id,{query:f.query} as any);
  assert.ok(f.state().has(planKey(other.id)));
  assert.ok(![...f.state().keys()].some(key=>key.includes(owner.id)));
});
test("unassigned existing accounts keep legacy data access without fabricated annual counters",async t=>{
  const f=fixture(t);await f.save();
  const usage=(await usageFor([owner]))[0];
  assert.equal(usage.plan,"unassigned");assert.equal(usage.visitsUsed,null);assert.equal(usage.mapsUsed,null);
  assert.equal(usage.observationsTotal,1);
});
test("read-only reports never insert metering records; malformed plan state fails closed",async t=>{
  const f=fixture(t);f.seed();f.calls.length=0;
  await usageFor([owner]);
  assert.ok(f.calls.every(sql=>sql.startsWith("SELECT")));
  f.state().set(planKey(owner.id),"not valid JSON");
  await assert.rejects(f.save());
  assert.equal(f.observations().length,0);
  assert.equal(f.calls.at(-1),"ROLLBACK");
});
test("all admin usage, registration and assignment routes enforce real account AND admin gates",()=>{
  for(const path of ["/admin/usage","/admin/registrations","/admin/users/:id/plan"]){
    const route=router.stack.find(layer=>layer.route?.path===path)?.route;
    assert.ok(route);
    assert.equal(route.stack[0].handle,requireAccount);assert.equal(route.stack[1].handle,requireAdmin);
  }
});
test("missing optional table reports real archive stats but blocks assignments without creating anything",async t=>{
  const f=fixture(t,false);
  await f.save("Legacy customer");
  const report=(await usageFor([owner]))[0];
  assert.equal(report.planManagementReady,false);
  assert.equal(report.observationsTotal,1);
  assert.equal(report.visitsUsed,null);
  assert.ok(report.storageBytes>0);
  await assert.rejects(locked(owner.id,sql=>writePlan(owner.id,{
    plan:"standard",startsOn:"2026-11-08",renew:false,expectedPeriodId:null,requestId:randomUUID(),
  },sql)),{code:"PLAN_STORE_NOT_READY"});
  assert.ok(!f.calls.some(sql=>/^(CREATE|ALTER|GRANT|REVOKE|INSERT INTO app_plan_state)/.test(sql)));
  assert.ok(!f.calls.some(sql=>/FROM app_plan_state/.test(sql)));
});
test("first assignment includes existing period visits, while renewal and old-map retries do not recount history",async t=>{
  const f=fixture(t);
  await f.save("Existing customer");await f.save("Existing customer");
  const start=new Date().toISOString().slice(0,10);
  const plan=await locked(owner.id,sql=>writePlan(owner.id,{
    plan:"standard",startsOn:start,renew:false,expectedPeriodId:null,requestId:randomUUID(),
  },sql));
  let report=(await usageFor([owner]))[0];
  assert.equal(report.visitsUsed,1);assert.equal(report.observationsTotal,2);
  const mapId=randomUUID();await countGeneratedMap(owner,mapId);
  await locked(owner.id,sql=>writePlan(owner.id,{
    plan:"standard",startsOn:start,renew:true,expectedPeriodId:plan.periodId,requestId:randomUUID(),
  },sql));
  await countGeneratedMap(owner,mapId);
  report=(await usageFor([owner]))[0];
  assert.equal(report.visitsUsed,0);assert.equal(report.mapsUsed,0);
  assert.equal(report.mapsTotal,1);assert.equal(report.observationsTotal,2);
});
