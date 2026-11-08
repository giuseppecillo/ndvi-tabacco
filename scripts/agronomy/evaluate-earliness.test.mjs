import test from "node:test";
import assert from "node:assert/strict";
import {catalogueSamples,evaluateRows,metrics,report,evaluateFieldCampaigns} from "./evaluate-earliness.mjs";
import {currentFieldModel} from "./field-earliness.mjs";
import {CROP_PROFILES, calculateCrop} from "../../lib/crop-calculations/src/index.ts";
import {POMODORO_DB, calcolaPomodoro, FASI_POMODORO} from "../../lib/tomato-calculations/src/index.ts";
import {calcolaDoseNTabacco} from "../../lib/tobacco-calculations/src/index.ts";
import {calcolaDoseNGrano, faseGranoDaBbch, GRANO_DURO_DB} from "../../lib/grain-calculations/src/index.ts";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const row=(variety,earliness,target,crop="crop")=>({crop,variety,earliness,target,
  destination:"fresh",use:"food",phase:"F1",bbch:"10-19"});
test("detects an informative maturity class without learning from held-out cultivar",()=>{
  const rows=[...Array.from({length:4},(_,i)=>row(`e${i}`,"early",.4)),
    ...Array.from({length:4},(_,i)=>row(`l${i}`,"late",.8))];
  const {folds}=evaluateRows(rows);
  assert.equal(folds.length,8);assert.ok(metrics(folds).earlinessMae<1e-12);
  assert.ok(metrics(folds).maeReduction>.2);
});
test("all homonymous profiles are excluded from that cultivar's training fold",()=>{
  const rows=[row("held","early",.9),row(" HELD ","early",.9),
    ...["a","b","c"].map(name=>row(name,"early",.5))];
  const {folds}=evaluateRows(rows);
  for(const f of folds.filter(f=>f.variety.trim().toLowerCase()==="held")){
    assert.equal(f.earliness,.5);assert.equal(f.donors,3);
  }
});
test("never invents a reference with too few same-class donors or crosses crop contexts",()=>{
  const rows=[row("alone","early",.9),...["a","b","c"].map(n=>row(n,"late",.5)),
    ...["d","e","f","g"].map(n=>row(n,"early",.4,"other-crop"))];
  const result=evaluateRows(rows);
  assert.ok(!result.folds.some(f=>f.variety==="alone"));
  assert.equal(result.skipped.insufficientSameClassDonors,4);
});
test("missing comparisons are explicit and invalid NDVI is rejected",()=>{
  assert.equal(metrics([]).earlinessMae,null);
  assert.throws(()=>evaluateRows([row("a","early",NaN)]),/INVALID/);
  assert.throws(()=>evaluateRows([],1),/THREE/);
});
test("full offline analysis preserves all 1373 known phase-based profiles and reports no production change",()=>{
  const samples=catalogueSamples();assert.equal(samples.length,1373*4);
  const result=report();assert.equal(result.assessedProfiles,1373);
  assert.equal(result.crops,16);
  assert.equal(result.applicationChanged,false);assert.equal(result.supabaseWrites,false);
  assert.equal(result.pairedComparison.samples+result.skipped.insufficientSameClassDonors,samples.length);
  assert.ok(result.byCrop.every(c=>c.samples+c.excluded===samples.filter(s=>s.crop===c.crop).length));
  assert.equal(result.independentFieldValidation.status,"BLOCKED");
  assert.equal(result.independentFieldValidation.comparison,null);
  assert.equal(result.independentFieldValidation.doseImpact,null);
});

// Invented structural fixtures ONLY: never written to a dataset or reported as
// biological evidence. False synthetic flag below exercises the intake contract,
// not a claim that any independent field measurements have been supplied.
const selected=CROP_PROFILES.find(p=>p.phases[0].azoto>0 && p.phases[0].riferimento>.1
  && CROP_PROFILES.some(q=>q.crop===p.crop && q.name!==p.name && q.earliness===p.earliness));
const other=CROP_PROFILES.find(q=>q.crop===selected.crop && q.name!==selected.name && q.earliness===selected.earliness);
function fixture() {
  const sample=(profile,id,split)=>({
    id,split,crop:profile.crop,variety:profile.name,earliness:profile.earliness,
    site:`site-${split}`,campaign:`campaign-${split}`,
    establishedOn:"2025-04-01",date:"2025-04-11",day:10,
    phase:profile.phases[0].id,bbch:profile.phases[0].bbch,phaseConfirmed:true,
    sensor:"test-sensor",sensorProtocol:"test-protocol",
    sourceEvidence:"synthetic test only",origin:"independent-reference-experiment",
    nitrogen:{status:"adequate",verified:true,method:"test",evidence:"test-only",verifiedOn:"2025-04-11"},
    readings:Array(5).fill(profile.phases[0].riferimento-.1),
    modelInput:{yield:profile.yield,applied:0},
  });
  const training=sample(other,"calibration-1","calibration");
  const evaluation=sample(selected,"evaluation-1","evaluation");
  const dataset={schemaVersion:1,sourceEvidence:"synthetic test only",
    customerData:false,independentFieldData:true,synthetic:false,rows:[training,evaluation]};
  const {crop,earliness,phase,bbch,sensor,sensorProtocol}=evaluation;
  const candidate={id:"test-only",method:"constant synthetic fixture",freezeEvidence:"test-only",
    evaluationUsed:false,trainedOn:[training.id],curves:[{
      crop,earliness,phase,bbch,sensor,sensorProtocol,
      points:[{day:0,ndvi:selected.phases[0].riferimento+.02},{day:20,ndvi:selected.phases[0].riferimento+.02}],
    }]};
  return {dataset,candidate,evaluation,training};
}
const evaluate=(d,c)=>evaluateFieldCampaigns(d,c,{authorizedReferenceData:true});

test("paired holdout MAE/RMSE and dose changes use current model, never training measurements",()=>{
  const {dataset,candidate,evaluation,training}=fixture();
  const result=evaluate(dataset,candidate);
  assert.equal(result.evaluationSamples,1);
  assert.ok(Math.abs(result.comparison.baselineMae-.1)<1e-12);
  assert.ok(Math.abs(result.comparison.candidateMae-.12)<1e-12);
  assert.equal(result.comparison.baselineRmse,result.comparison.baselineMae);
  assert.equal(result.comparison.candidateRmse,result.comparison.candidateMae);
  const actual=calculateCrop({crop:evaluation.crop,variety:evaluation.variety,phase:evaluation.phase,
    confirmed:true,...evaluation.modelInput,readings:evaluation.readings});
  assert.equal(result.doseImpact.baselineMean,actual.dose);
  assert.equal(result.doseImpact.meanChange,result.doseImpact.candidateMean-actual.dose);
  assert.equal(result.status,"OFFLINE_COMPARISON_ONLY");
  assert.equal(result.decision,"DO_NOT_ACTIVATE");
  assert.equal(result.applicationChanged,false);
  assert.equal(result.supabaseWrites,false);
  assert.equal(result.customerDataRead,false);
  assert.deepEqual(result.safety.candidate.violations,
    {residual:0,phaseQuota:0,aboveReference:0,zeroNPhase:0,exhaustedPlan:0});
  const before=structuredClone(result);
  training.readings=Array(5).fill(.99);
  assert.deepEqual(evaluate(dataset,candidate),before);
});

for(const key of ["variety","site","campaign"])test(`rejects separately overlapping ${key}, including normalized aliases`,()=>{
  const {dataset,candidate,evaluation,training}=fixture();
  evaluation[key]=` ${training[key].toUpperCase()} `;
  // Use leakage in the train identity for variety to retain exact catalogue lookup.
  if(key==="variety") {
    training.variety=evaluation.variety=selected.name;
    training[key]=evaluation[key];
  }
  assert.throws(()=>evaluate(dataset,candidate),new RegExp(`PARTITION_LEAKAGE_${key.toUpperCase()}`));
});

test("requires explicit authorization and a non-customer independent non-synthetic manifest",()=>{
  const {dataset,candidate}=fixture();
  assert.throws(()=>evaluateFieldCampaigns(dataset,candidate),/AUTHORIZATION/);
  for(const [key,value] of [["customerData",true],["independentFieldData",false],["synthetic",true],["sourceEvidence",""]]) {
    assert.throws(()=>evaluate({...dataset,[key]:value},candidate),/MANIFEST/);
  }
  assert.equal(evaluate({...dataset,rows:[]},candidate).status,"BLOCKED");
});

test("rejects unverified N, ordinary observations and incomplete measurement metadata in either partition",()=>{
  for(const split of ["calibration","evaluation"]) {
    for(const key of ["variety","date","phase","bbch","sensor","sensorProtocol","sourceEvidence","earliness","site","campaign"]) {
      const {dataset,candidate}=fixture();
      dataset.rows.find(r=>r.split===split)[key]="";
      assert.throws(()=>evaluate(dataset,candidate),/INVALID/);
    }
    for(const nitrogen of [
      {status:"deficit",verified:true}, {status:"adequate",verified:false},
      {status:"adequate",verified:true,method:"test",evidence:"test",verifiedOn:"2025-04-10"},
    ]) {
      const {dataset,candidate}=fixture();
      dataset.rows.find(r=>r.split===split).nitrogen=nitrogen;
      assert.throws(()=>evaluate(dataset,candidate),/ADEQUATE_N_NOT_VERIFIED/);
    }
    const {dataset,candidate}=fixture();
    dataset.rows.find(r=>r.split===split).origin="customer-observation";
    assert.throws(()=>evaluate(dataset,candidate),/INVALID/);
  }
});

test("invalid dates, NDVI, plans, unconfirmed phase and duplicate IDs fail closed",()=>{
  for(const mutate of [
    r=>r.date="2025-02-30", r=>r.day=11, r=>r.readings[0]=NaN,
    r=>r.readings[0]=1.1, r=>r.readings.pop(), r=>r.phaseConfirmed=false,
    r=>r.modelInput.applied=-1, r=>r.modelInput.yield=0, r=>r.phase="unknown",
  ]) {
    const {dataset,candidate,evaluation}=fixture(); mutate(evaluation);
    assert.throws(()=>evaluate(dataset,candidate));
  }
  const {dataset,candidate,evaluation,training}=fixture();
  evaluation.id=` ${training.id.toUpperCase()} `;
  assert.throws(()=>evaluate(dataset,candidate),/DUPLICATE_SAMPLE_ID/);
  dataset.rows=[training];
  assert.throws(()=>evaluate(dataset,candidate),/BOTH_PARTITIONS/);
});

test("candidate must be frozen, fully traced to calibration and cover every holdout without extrapolation",()=>{
  for(const mutate of [
    c=>c.evaluationUsed=true, c=>c.freezeEvidence="", c=>c.trainedOn=["evaluation-1"],
    c=>c.trainedOn=[], c=>c.trainedOn.push("calibration-1"),
    c=>c.curves[0].points.reverse(), c=>c.curves[0].points[0].ndvi=0,
    c=>c.curves[0].points[1].ndvi=1.1, c=>c.curves[0].points[1].day=5,
    c=>c.curves[0].sensor="other-sensor", c=>c.curves.push(structuredClone(c.curves[0])),
  ]) {
    const {dataset,candidate}=fixture(); mutate(candidate);
    assert.throws(()=>evaluate(dataset,candidate));
  }
  const {dataset,candidate}=fixture();
  dataset.rows.push({...structuredClone(dataset.rows[1]),id:"evaluation-2",sensor:"not-calibrated"});
  assert.throws(()=>evaluate(dataset,candidate),/NOT_COVERING/);
});

test("dose adapters match the actual tomato, tobacco and grain models",()=>{
  const {evaluation}=fixture();
  const tomato=Object.values(POMODORO_DB).find(p=>p.fasi[0][0]>0);
  const tomatoRow={...evaluation,crop:"pomodoro",variety:tomato.nome,earliness:tomato.precocita,
    phase:FASI_POMODORO[0],modelInput:{profileId:tomato.id,yield:tomato.resa,applied:0}};
  const adapter=currentFieldModel(tomatoRow);
  const real=calcolaPomodoro({varieta:tomato.id,fase:tomatoRow.phase,confermata:true,
    resa:tomato.resa,azotoGiaDistribuito:0,letture:evaluation.readings});
  assert.equal(adapter.reference,real.ottimale);
  assert.equal(adapter.dose(meanTest(evaluation.readings),adapter.reference),real.dose);
  const tobacco=currentFieldModel({...evaluation,crop:"tabacco",
    modelInput:{applied:10,totalN:120,phaseN:30,seedlingAge:"standard",planEvidence:"test"}});
  assert.equal(tobacco.dose(.2,tobacco.reference),calcolaDoseNTabacco({
    media:.2,ottimale:tobacco.reference,fabbisognoN:30,azotoTotale:120,azotoGiaDistribuito:10}).dose);
  const grain=currentFieldModel({...evaluation,crop:"grano duro",variety:"Redidenari",
    phase:"Accestimento",bbch:"20–29",modelInput:{applied:10,totalN:120,planEvidence:"test"}});
  assert.equal(grain.dose(.2,grain.reference),calcolaDoseNGrano({
    media:.2,ndviOttimale:grain.reference,fabbisognoN:120,azotoGiaDistribuito:10,
    fase:faseGranoDaBbch("20–29","Redidenari"),valoriValidi:true}).quotaProposta);
  const zero=currentFieldModel({...evaluation,crop:"grano duro",variety:"Redidenari",
    phase:"Fioritura",bbch:"61–69",modelInput:{applied:0,totalN:120,planEvidence:"test",zeroNPhase:true}});
  assert.equal(zero.dose(0,.8),0);
});
const meanTest=values=>values.reduce((a,b)=>a+b,0)/values.length;

test("candidate interpolation uses calendar day and paired dose changes have hand-computed values",()=>{
  const {dataset,candidate}=fixture();
  for(const row of dataset.rows) {
    row.crop="tabacco";
    row.readings=Array(5).fill(.2);
    row.modelInput={applied:0,totalN:120,phaseN:30,seedlingAge:"standard",planEvidence:"test"};
  }
  candidate.curves[0].crop="tabacco";
  candidate.curves[0].points=[{day:0,ndvi:.4},{day:20,ndvi:.8}];
  const result=evaluate(dataset,candidate);
  assert.ok(Math.abs(result.comparison.candidateMae-.4)<1e-12); // day 10 => .6 minus .2
  assert.equal(result.doseImpact.candidateMean,20); // 30 * (.6-.2)/.6
  assert.equal(result.doseImpact.maxAbsoluteChange,Math.abs(20-result.doseImpact.baselineMean));
  assert.equal(result.byCrop[0].candidateRmse,result.comparison.candidateRmse);
  assert.equal(result.bySensor[0].samples,1);
});

test("pure native doses round residual caps down while retaining their existing precision",()=>{
  const fase=faseGranoDaBbch("20–29");
  for(const [total,applied,tobaccoExpected,grainExpected] of [
    [120,119.94,0,0], [120,119.96,0,0],
    [120,119.4,.5,0], // actual JS subtraction is slightly below .6
    [120,118.75,1.2,1], [120,119.875,.1,0],
    [120,119.5,.5,0], [120,119,1,1],
    [120,120,0,0], [120,125,0,0], [0,0,0,0],
  ]) {
    const tobacco=calcolaDoseNTabacco({media:0,ottimale:.64,
      fabbisognoN:120,azotoTotale:total,azotoGiaDistribuito:applied});
    const grain=calcolaDoseNGrano({media:0,ndviOttimale:.64,
      fabbisognoN:total,azotoGiaDistribuito:applied,fase,valoriValidi:true});
    assert.equal(tobacco.dose,tobaccoExpected);
    assert.equal(grain.quotaProposta,grainExpected);
    assert.ok(tobacco.dose<=Math.max(0,total-applied));
    assert.ok(grain.quotaProposta<=Math.max(0,total-applied));
  }
  // Sweep near decimal/integer boundaries with strict, unrounded comparisons.
  for(let i=0;i<=20000;i++) {
    const applied=120-i/10000;
    for(const media of [0,.64,.9]) {
      const t=calcolaDoseNTabacco({media,ottimale:.64,fabbisognoN:120,
        azotoTotale:120,azotoGiaDistribuito:applied});
      const g=calcolaDoseNGrano({media,ndviOttimale:.64,fabbisognoN:120,
        azotoGiaDistribuito:applied,fase,valoriValidi:true});
      assert.ok(t.dose>=0 && t.dose<=120-applied);
      assert.ok(g.quotaProposta>=0 && g.quotaProposta<=120-applied);
      assert.equal(Number(t.dose.toFixed(1)),t.dose);
      assert.equal(Math.trunc(g.quotaProposta),g.quotaProposta);
      if(media>=.64) { assert.equal(t.dose,0); assert.equal(g.quotaProposta,0); }
    }
  }
  assert.equal(calcolaDoseNTabacco({media:0,ottimale:.64,fabbisognoN:0,
    azotoTotale:120,azotoGiaDistribuito:0}).dose,0);
  for(const change of [{fase:null},{valoriValidi:false}]) {
    assert.equal(calcolaDoseNGrano({media:0,ndviOttimale:.64,fabbisognoN:120,
      azotoGiaDistribuito:0,fase,valoriValidi:true,...change}).quotaProposta,0);
  }
});

test("real rounding of native models respects fractional residuals without evaluator clamping",()=>{
  const {dataset,candidate}=fixture();
  for(const row of dataset.rows) {
    row.crop="tabacco"; row.modelInput={applied:0,totalN:120,phaseN:30,seedlingAge:"standard",planEvidence:"test"};
  }
  candidate.curves[0].crop="tabacco";
  const result=evaluate(dataset,candidate);
  // Native tobacco model now rounds the available tenths down.
  assert.notEqual(result.status,"SAFETY_FAILED");
  assert.equal(result.safety.baseline.violations.residual,0);
  assert.equal(result.safety.candidate.violations.residual,0);
  assert.equal(result.safety.baseline.violations.aboveReference,0);
  assert.equal(result.safety.candidate.violations.zeroNPhase,0);
  const varieties=Object.keys(GRANO_DURO_DB).filter(v=>v!=="RGT NATUR");
  dataset.rows.forEach((row,i)=>{
    row.crop="grano duro";row.variety=varieties[i];row.phase="Accestimento";row.bbch="20–29";
    row.modelInput={applied:0,totalN:120,planEvidence:"test"};
  });
  Object.assign(candidate.curves[0],{crop:"grano duro",phase:"Accestimento",bbch:"20–29"});
  const grainResult=evaluate(dataset,candidate);
  // Native grain model now rounds the available whole kg down.
  assert.notEqual(grainResult.status,"SAFETY_FAILED");
  assert.equal(grainResult.safety.baseline.violations.residual,0);
  assert.equal(grainResult.safety.candidate.violations.residual,0);
});

test("CLI refuses implicit local reads and reports unreadable files without echoing paths",()=>{
  const script=fileURLToPath(new URL("./evaluate-earliness.mjs",import.meta.url));
  const run=args=>spawnSync(process.execPath,[...process.execArgv,script,...args],{encoding:"utf8"});
  const missingAuthorization=run(["--field","do-not-open.json","--candidate","do-not-open.json"]);
  assert.equal(missingAuthorization.status,1);
  assert.match(missingAuthorization.stderr,/USAGE/);
  const missingFile=run(["--field","private-path-do-not-echo.json","--candidate","none.json","--authorized-reference-data"]);
  assert.equal(missingFile.status,1);
  assert.match(missingFile.stderr,/LOCAL_FILE_UNREADABLE/);
  assert.ok(!missingFile.stderr.includes("private-path-do-not-echo"));
});
