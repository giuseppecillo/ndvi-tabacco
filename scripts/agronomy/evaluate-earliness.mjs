/**
 * OFFLINE assessment, not an application model or migration.
 * Leave one cultivar OUT; never learn its target from another homonymous profile.
 * Catalogue reconstruction error is NOT field validation of an optimal NDVI.
 * No DB clients, environment variables, observations or credentials.
 */
import {CROP_PROFILES} from "../../lib/crop-calculations/src/index.ts";
import {POMODORO_DB, FASI_POMODORO} from "../../lib/tomato-calculations/src/index.ts";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
import {blockedFieldReport, evaluateFieldCampaigns} from "./field-earliness.mjs";
export {blockedFieldReport, evaluateFieldCampaigns} from "./field-earliness.mjs";

const normalize = value => value.trim().normalize("NFC").toLocaleLowerCase("it-IT").replace(/\s+/g," ");
const mean = values => values.reduce((sum,v)=>sum+v,0)/values.length;
export function catalogueSamples(){
  return [
    ...CROP_PROFILES.flatMap(p=>p.phases.map(phase=>({
      crop:p.crop,variety:p.name,earliness:p.earliness,destination:p.destination,use:p.use,
      phase:phase.id,bbch:phase.bbch,target:phase.riferimento,
    }))),
    ...Object.values(POMODORO_DB).flatMap(p=>p.fasi.map(([,min,max],i)=>({
      crop:"pomodoro",variety:p.nome,earliness:p.precocita,destination:p.destinazione,use:p.impiego,
      phase:FASI_POMODORO[i],bbch:"catalogue-confirmed-phase",target:(min+max)/2,
    }))),
  ];
}
/** Equal weight per cultivar; minimum three OTHER cultivars per estimator. */
export function evaluateRows(rows,minDonors=3){
  if(!Number.isInteger(minDonors)||minDonors<3)throw new Error("MINIMUM_THREE_DONOR_CULTIVARS");
  const grouped=new Map();
  for(const row of rows){
    if(!Number.isFinite(row.target)||row.target<=0||row.target>1||
      ["crop","variety","earliness","destination","use","phase","bbch"].some(k=>typeof row[k]!=="string"||!row[k].trim()))
      throw new Error("INVALID_OFFLINE_NDVI_SAMPLE");
    const context=JSON.stringify([row.crop,row.destination,row.use,row.phase,row.bbch].map(normalize));
    const entry={...row,cultivar:normalize(row.variety),maturity:normalize(row.earliness)};
    if(!grouped.has(context))grouped.set(context,[]);
    grouped.get(context).push(entry);
  }
  const folds=[];const skipped={insufficientSameClassDonors:0};
  for(const group of grouped.values())for(const target of group){
    const donors=group.filter(r=>r.cultivar!==target.cultivar);
    const cultivarMeans=list=>{
      const values=new Map();
      for(const r of list){
        if(!values.has(r.cultivar))values.set(r.cultivar,[]);
        values.get(r.cultivar).push(r.target);
      }
      return [...values.values()].map(mean);
    };
    const baseline=cultivarMeans(donors);
    const early=cultivarMeans(donors.filter(r=>r.maturity===target.maturity));
    if(baseline.length<minDonors||early.length<minDonors){
      skipped.insufficientSameClassDonors++;continue;
    }
    folds.push({crop:target.crop,variety:target.variety,target:target.target,
      baseline:mean(baseline),earliness:mean(early),donors:early.length});
  }
  return {folds,skipped};
}
export function metrics(folds){
  if(!folds.length)return {samples:0,baselineMae:null,earlinessMae:null,maeReduction:null,baselineRmse:null,earlinessRmse:null};
  const mae=key=>mean(folds.map(f=>Math.abs(f[key]-f.target)));
  const rmse=key=>Math.sqrt(mean(folds.map(f=>(f[key]-f.target)**2)));
  return {samples:folds.length,baselineMae:mae("baseline"),earlinessMae:mae("earliness"),
    maeReduction:mae("baseline")-mae("earliness"),baselineRmse:rmse("baseline"),earlinessRmse:rmse("earliness")};
}
export function report(){
  const samples=catalogueSamples();const {folds,skipped}=evaluateRows(samples);
  return {
    purpose:"OFFLINE_CATALOGUE_RECONSTRUCTION_NOT_FIELD_VALIDATION",
    method:"leave-one-cultivar-out; same crop, use, destination, phase, BBCH; three other cultivars minimum; cultivar-balanced means",
    assessedProfiles:CROP_PROFILES.length+Object.keys(POMODORO_DB).length,
    crops:[...new Set(samples.map(s=>s.crop))].length,
    knownTargetSamples:samples.length,skipped,
    pairedComparison:metrics(folds),
    byCrop:[...new Set(samples.map(s=>s.crop))].sort().map(crop=>({
      crop,...metrics(folds.filter(f=>f.crop===crop)),
      excluded:samples.filter(s=>s.crop===crop).length-folds.filter(f=>f.crop===crop).length,
    })),
    unassessedNativeProfiles:{tabacco:9,granoDuro:14,reason:"No quantitative varietal earliness calibration in current model parameters"},
    decision:"DO_NOT_REPLACE_KNOWN_VARIETAL_REFERENCES_OR_CHANGE_DOSES",
    reason:"No independent field validation, numeric stage timing, or sensor-specific calibration supplied; categorical precocity cannot establish a causal NDVI offset.",
    applicationChanged:false,supabaseWrites:false,customerDataRead:false,
    independentFieldValidation:blockedFieldReport(),
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    let result;
    if(!args.length) result=report();
    else {
      if(args.length!==5||args[0]!=="--field"||args[2]!=="--candidate"
        ||args[4]!=="--authorized-reference-data")
        throw new Error("USAGE: --field local-reference.json --candidate frozen-curves.json --authorized-reference-data");
      result=evaluateFieldCampaigns(JSON.parse(readFileSync(args[1],"utf8")),
        JSON.parse(readFileSync(args[3],"utf8")),{authorizedReferenceData:true});
    }
    console.log(JSON.stringify(result,null,2));
    if(result.status==="BLOCKED"||result.status==="SAFETY_FAILED")process.exitCode=2;
  } catch(error) {
    // Do not echo data, local paths, raw JSON or parser errors into shared logs.
    console.error(JSON.stringify({status:"ERROR",reason:error instanceof SyntaxError
      ? "INVALID_JSON" : error.code ? "LOCAL_FILE_UNREADABLE" : error.message}));
    process.exitCode=1;
  }
}
