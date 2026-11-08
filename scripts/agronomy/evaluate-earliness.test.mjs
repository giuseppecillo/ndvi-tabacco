import test from "node:test";
import assert from "node:assert/strict";
import {catalogueSamples,evaluateRows,metrics,report} from "./evaluate-earliness.mjs";
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
});
