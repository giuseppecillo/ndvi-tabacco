import assert from "node:assert/strict";
import test from "node:test";
import {CROP_PROFILES,completeProfile,calculateCrop,cropCatalogue,catalogueObservationError} from "@workspace/crop-calculations";
import {catalogueRecords,catalogueCounts,assertCatalogueRows} from "./catalogue-manifest";
const additions=["Aglio","Cipolla","Olivo","Zucchino","Melanzana","Ciliegio"];
for(const crop of additions) {
  test(`${crop}: all varieties, four phases, reference total N and proportional point doses`,()=>{
    const profiles=CROP_PROFILES.filter(p=>p.crop===crop);
    assert.equal(profiles.length,crop==="Melanzana"?63:60);
    for(const p of profiles) {
      assert.ok(completeProfile(p),p.name);
      for(const ph of p.phases) {
        const input={crop:p.crop,variety:p.name,phase:ph.id,confirmed:true,yield:p.yield,applied:0,
          readings:Array(5).fill(ph.riferimento/2)};
        const r=calculateCrop(input);
        assert.equal(r.valida,true);assert.equal(r.pronta,true);
        assert.ok(Math.abs(r.azotoTotale-p.nitrogen)<1e-9);
        assert.ok(Math.abs(r.dose-ph.azoto/2)<=.051,`${p.name} ${ph.id}`);
        assert.equal(calculateCrop({...input,readings:Array(5).fill(ph.riferimento)}).dose,0);
        assert.equal(calculateCrop({...input,applied:p.nitrogen}).dose,0);
        assert.equal(calculateCrop({...input,confirmed:false}).dose,0);
        assert.equal(calculateCrop({...input,yield:p.yield*2}).azotoTotale,p.nitrogen*2);
        if(ph.azoto===0)assert.equal(r.dose,0);
      }
    }
  });
}
test("old profiles remain unchanged, exclusions remain excluded, all models have one database identity",()=>{
  assert.equal(cropCatalogue.rows.length,851);
  assert.ok(!cropCatalogue.columns.some(c=>/P2O5|K2O|Acqua|Note/.test(c)));
  assert.equal(CROP_PROFILES.filter(p=>!additions.includes(p.crop)).length,488);
  assert.ok(!CROP_PROFILES.some(p=>p.crop==="Kiwi"&&["Tomuri","Matua","Chieftain","Belen","Bounty71"].includes(p.name)));
  for(const crop of additions)assert.equal(catalogueCounts[crop],crop==="Melanzana"?63:60);
  assert.ok(catalogueCounts["grano duro"]>0&&catalogueCounts.pomodoro>0&&catalogueCounts.tabacco>0);
  assertCatalogueRows(catalogueRecords);
  assert.throws(()=>assertCatalogueRows(catalogueRecords.slice(1)),/MISMATCH/);
});
