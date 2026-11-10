import test,{mock} from "node:test";
import assert from "node:assert/strict";
import {pool} from "@workspace/db";
import {calculateCrop,CUSTOM_VARIETY_PHASE_SOURCE,catalogueObservationError} from "@workspace/crop-calculations";
import router from "./variety-proposals";
import {varietyTemplates,proposedProfile} from "../lib/variety-templates";
import {requireAccount,requireSubscription,requireAdmin,requirePrivacyAck} from "../middlewares/access";
import {approvedVariety} from "../lib/variety-store";

const ref=varietyTemplates.find(t=>t.profile.crop==="Kiwi")!;
const input={crop:"Kiwi",name:"QA nuova varietà",referenceId:ref.id,phaseNitrogen:[10,20,30,40]};
const handler=(path:string,method:string)=>router.stack.find(l=>l.route?.path===path&&l.route.stack.some(h=>h.method===method))!.route!;
function response(role="user"){
  const state={status:200,body:undefined as any};
  const res:any={locals:{account:{id:"qa-owner",role}},status(code:number){state.status=code;return this;},json(body:any){state.body=body;return this;}};
  return {state,res};
}
test("templates cover all 18 crops with finite inherited parameters and immutable source phases",()=>{
  assert.equal(new Set(varietyTemplates.map(t=>t.profile.crop)).size,18);
  for(const t of varietyTemplates){
    assert.ok(t.profile.plants>0&&t.profile.yield>0&&t.profile.nitrogen>0,t.profile.name);
    assert.ok(t.profile.phases.length>=3&&t.profile.phases.length<=12);
    assert.ok(t.profile.phases.every(p=>p.riferimento>0&&p.riferimento<=1));
  }
  const before=JSON.stringify(ref);
  const proposal=proposedProfile(input);
  assert.equal(proposal.profile.nitrogen,100);
  assert.deepEqual(proposal.profile.phases.map(p=>p.azoto),input.phaseNitrogen);
  assert.equal(JSON.stringify(ref),before);
});
test("invalid totals, blank names, shadow names and cross-crop reference are rejected",()=>{
  for(const patch of [{name:" "},{name:ref.profile.name},{crop:"pomodoro"},
    {phaseNitrogen:[-1,2,3,4]},{phaseNitrogen:[0,0,0,0]},{phaseNitrogen:[1,2]},
    {phaseNitrogen:[NaN,1,2,3]},{phaseNitrogen:[1000,1000,1000,1000]}]){
    assert.throws(()=>proposedProfile({...input,...patch}));
  }
  const tomato=varietyTemplates.find(t=>t.profile.crop==="pomodoro")!;
  assert.throws(()=>proposedProfile({crop:"pomodoro",name:tomato.referenceName,
    referenceId:tomato.id,phaseNitrogen:tomato.profile.phases.map(()=>10)}));
});
test("routes protect identity, consent, subscriptions and admin decisions",()=>{
  assert.deepEqual(handler("/variety-proposals","post").stack.slice(0,3).map(h=>h.handle),[requireAccount,requireSubscription,requirePrivacyAck]);
  assert.deepEqual(handler("/admin/variety-proposals/:id/decision","post").stack.slice(0,3).map(h=>h.handle),[requireAccount,requireAdmin,requirePrivacyAck]);
  assert.deepEqual(handler("/variety-proposals","get").stack.slice(0,2).map(h=>h.handle),[requireAccount,requireSubscription]);
});
test("submission persists pending identity from server, not a forged approval or profile",async()=>{
  const q=mock.method(pool,"query",async(sql:string,args:any[])=>{
    assert.match(sql,/^INSERT INTO agronomy_catalogue.variety_submissions/);
    assert.equal(args[3],"qa-owner");
    assert.equal(JSON.parse(args[6]).nitrogen,100);
    assert.equal(args.length,7);
    return {rows:[{id:args[0],status:"pending",profile:JSON.parse(args[6])}]};
  });
  try{
    const {state,res}=response();
    await handler("/variety-proposals","post").stack.at(-1)!.handle({body:{...input,status:"approved",submitted_by:"other",profile:{nitrogen:999}}} as any,res,()=>{});
    assert.equal(state.status,201);assert.equal(state.body.status,"pending");
    assert.equal(state.body.isOwn,true);
  }finally{q.mock.restore();}
});
test("lists cannot expose other pending proposals; decisions are single-transition atomic updates",async()=>{
  const q=mock.method(pool,"query",async(sql:string,args:any[])=>{
    if(sql.startsWith("SELECT")){
      assert.match(sql,/status='approved' OR submitted_by=\$1 OR \$2::boolean/);
      assert.deepEqual(args,["qa-owner",false]);return {rows:[]};
    }
    assert.match(sql,/WHERE id=\$1 AND status='pending'/);
    assert.equal(args[1],"approved");assert.equal(args[3],"qa-owner");
    return {rows:[]};
  });
  try{
    const {res}=response();
    await handler("/variety-proposals","get").stack.at(-1)!.handle({} as any,res,()=>{});
    const review=response("admin");
    await handler("/admin/variety-proposals/:id/decision","post").stack.at(-1)!.handle({
      params:{id:"00000000-0000-0000-0000-000000000001"},body:{decision:"approved"},
    } as any,review.res,()=>{});
    assert.equal(review.state.status,409);
  }finally{q.mock.restore();}
});
test("calculation lookup includes only approved rows and uses server-stored phase doses",async()=>{
  const {profile}=proposedProfile(input);
  const q=mock.method(pool,"query",async(sql:string,args:any[])=>{
    assert.match(sql,/status='approved'/);assert.deepEqual(args,["Kiwi",profile.name]);
    return {rows:[{profile}]};
  });
  try{
    assert.deepEqual(await approvedVariety("Kiwi",profile.name),profile);
    const readings=[.2,.2,.2,.2,.2];
    const result=calculateCrop({crop:"Kiwi",variety:profile.name,phase:"F2",confirmed:true,yield:profile.yield,applied:0,readings},profile);
    assert.ok(result.pronta);assert.ok(result.dose<=20);
    const obs={data:"2026-06-17",cliente:"QA",appezzamento:"QA",coltura:"Kiwi",varieta:profile.name,
      resa:profile.yield,azotoGiaDistribuito:0,azotoTotale:result.azotoTotale,quotaAzoto:result.dose,dose:result.dose,
      media:result.media,ottimale:result.ottimale,discostamento:result.discostamento,densitaValore:profile.plants,
      pianteHaEquivalenti:profile.plants,densitaUnita:"piante/ha",giorni:0,bbch:null,
      faseFenologica:`F2 · ${profile.phases[1].label}`,faseFonte:CUSTOM_VARIETY_PHASE_SOURCE,n1:.2,n2:.2,n3:.2,n4:.2,n5:.2};
    assert.equal(catalogueObservationError(obs,profile),null);
    assert.ok(catalogueObservationError({...obs,dose:1000},profile));
    assert.ok(catalogueObservationError(obs));
  }finally{q.mock.restore();}
});
