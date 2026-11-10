import test from "node:test";
import assert from "node:assert/strict";
import {cropCatalogue,CROP_PROFILES,calculateCrop} from "@workspace/crop-calculations";
import {completeCatalogue} from "./completeCatalogue";
import {catalogueExportTables,buildCatalogueWorkbook} from "../utils/catalogueExcel";
import JSZip from "jszip";
import {readFileSync} from "node:fs";
import type {VarietaDati} from "../calculations";
import {hasTranslation} from "../i18n/runtime";
import {varietyTranslations} from "../i18n/variety-translations";

test("approved custom rows append to the full catalogue and Excel without altering originals",()=>{
  const base=CROP_PROFILES.find(p=>p.crop==="Kiwi")!;
  const profile={...base,name:"QA approvata",nitrogen:100,phases:base.phases.map((p,i)=>({...p,azoto:[10,20,30,40][i]}))};
  const before=JSON.stringify(cropCatalogue);
  const existing=completeCatalogue(cropCatalogue,[]);
  const merged=completeCatalogue(cropCatalogue,[],[profile]);
  assert.equal(merged.rows.length,existing.rows.length+1);
  const row=merged.rows.find(r=>r[1]==="QA approvata")!;
  assert.equal(row[merged.columns.indexOf("Azoto Totale (kg/ha)")],"100");
  assert.equal(row[merged.columns.indexOf("N F2 (kg/ha)")],"20");
  const tables=catalogueExportTables(cropCatalogue,[],s=>s,"it-IT",[profile]);
  assert.ok(JSON.stringify(tables).includes("QA approvata"));
  assert.equal(JSON.stringify(cropCatalogue),before);
  const result=calculateCrop({crop:"Kiwi",variety:profile.name,phase:"F2",confirmed:true,yield:profile.yield,applied:99,readings:[0,0,0,0,0]},profile);
  assert.equal(result.dose,1);
});
test("proposal workflow labels are translated into English and Spanish",()=>{
  for(const [it,en,es] of varietyTranslations) {
    assert.ok(hasTranslation(it),it);assert.ok(en.trim()&&es.trim(),it);
  }
});
test("the real XLSX includes the approved cultivar and native crops",async()=>{
  const base=CROP_PROFILES.find(p=>p.crop==="Kiwi")!;
  const profile={...base,name:"QA approvata Excel",nitrogen:100,phases:base.phases.map((p,i)=>({...p,azoto:[10,20,30,40][i]}))};
  const tobacco=Object.values(JSON.parse(readFileSync(new URL("../../../api-server/src/data/native-tobacco.json",import.meta.url),"utf8"))) as VarietaDati[];
  const bytes=await buildCatalogueWorkbook(cropCatalogue,tobacco,s=>s,"it-IT",[profile]);
  const zip=await JSZip.loadAsync(bytes);
  const sheets=await Promise.all(Object.entries(zip.files).filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name)).map(([,file])=>file.async("string")));
  assert.ok(sheets.some(xml=>xml.includes("QA approvata Excel")));
  assert.ok(sheets.some(xml=>xml.includes("Tabacco")));
  assert.ok(sheets.some(xml=>xml.includes("Pomodoro")));
  assert.ok(sheets.some(xml=>xml.includes("Grano duro")));
});
