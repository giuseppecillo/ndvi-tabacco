import {createHash} from "node:crypto";
import {cropCatalogue,CROP_PROFILES} from "@workspace/crop-calculations";
import {GRANO_DURO_DB,fasiGranoPerVarieta,NDVI_GRANO_CURVA} from "@workspace/grain-calculations";
import {POMODORO_DB,FASI_POMODORO} from "@workspace/tomato-calculations";
import {NDVI_CURVA,ETA_GIORNI_EQUIVALENTI} from "@workspace/tobacco-calculations";
import tobacco from "../data/native-tobacco.json";

export type CatalogueRecord = {
  crop:string; variety:string; model:string; parameters:unknown; record_hash:string;
};
export function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value && typeof value==="object") return `{${Object.keys(value).sort().map(key=>
    `${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(",")}}`;
  if(typeof value==="number" && !Number.isFinite(value))throw new Error("CATALOGUE_NON_FINITE_VALUE");
  const result=JSON.stringify(value);
  if(result===undefined)throw new Error("CATALOGUE_UNSERIALIZABLE_VALUE");
  return result;
}
export const digest=(value:unknown)=>createHash("sha256").update(canonical(value)).digest("hex");
const record=(crop:string,variety:string,model:string,parameters:unknown):CatalogueRecord=>({
  crop,variety,model,parameters,record_hash:digest({crop,variety,model,parameters}),
});
export const catalogueRecords:CatalogueRecord[]=[
  ...CROP_PROFILES.map((profile,i)=>record(profile.crop,profile.name,"phase-ndvi-v1",
    {profile,display:cropCatalogue.rows[i]})),
  ...Object.entries(GRANO_DURO_DB).map(([name,defaults])=>record("grano duro",name,"grain-v1",
    {defaults,phases:fasiGranoPerVarieta(name),ndvi:NDVI_GRANO_CURVA})),
  ...Object.entries(POMODORO_DB).map(([identity,profile])=>record("pomodoro",identity,"tomato-v1",
    {profile,phases:FASI_POMODORO,ndviCriterion:"arithmetic-mean-of-range"})),
  ...Object.entries(tobacco).map(([name,defaults])=>record("tabacco",name,"tobacco-v1",
    {defaults,ndvi:NDVI_CURVA,plantAgeOffsets:ETA_GIORNI_EQUIVALENTI})),
].sort((a,b)=>a.crop===b.crop?(a.variety<b.variety?-1:a.variety>b.variety?1:0):a.crop<b.crop?-1:1);
if(new Set(catalogueRecords.map(p=>JSON.stringify([p.crop,p.variety]))).size!==catalogueRecords.length)
  throw new Error("CATALOGUE_DUPLICATE_IDENTITY");
export const catalogueVersion=`models-${digest(catalogueRecords).slice(0,32)}`;
export const catalogueCounts = catalogueRecords.reduce<Record<string,number>>((all,p)=>{
  all[p.crop]=(all[p.crop]??0)+1; return all;
},{});
export function assertCatalogueRows(rows:CatalogueRecord[]) {
  const ordered=[...rows].sort((a,b)=>a.crop===b.crop?
    (a.variety<b.variety?-1:a.variety>b.variety?1:0):a.crop<b.crop?-1:1);
  if(canonical(ordered)!==canonical(catalogueRecords))throw new Error("CATALOGUE_CONTENT_MISMATCH");
}
