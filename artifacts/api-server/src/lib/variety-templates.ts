import {CROP_PROFILES, getCropReference, type CropProfile} from "@workspace/crop-calculations";
import {GRANO_DURO_DB, fasiGranoPerVarieta, calcolaQuotaNGrano, ndviOttimaleGrano} from "@workspace/grain-calculations";
import {POMODORO_DB, FASI_POMODORO} from "@workspace/tomato-calculations";
import {NDVI_CURVA} from "@workspace/tobacco-calculations";
import tobacco from "../data/native-tobacco.json";
import {digest} from "./catalogue-manifest";

export type VarietyTemplate = {id:string;referenceName:string;profile:CropProfile};
const template = (profile:CropProfile,referenceName=profile.name):VarietyTemplate => ({id:digest(profile), referenceName, profile});
const common = {destination:"",use:"",earliness:""};
export const varietyTemplates:VarietyTemplate[] = [
  ...CROP_PROFILES.map(p=>template(getCropReference(p.crop,p.name)!.reference.name === p.name ? p : {
    ...getCropReference(p.crop,p.name)!.reference, name:p.name,
  })),
  ...Object.entries(POMODORO_DB).map(([name,p])=>template({
    ...common,crop:"pomodoro",name,plants:p.pianteHa,yield:p.resa,nitrogen:p.azotoTotale,
    phases:p.fasi.map(([azoto,min,max],i)=>({id:`F${i+1}`,label:FASI_POMODORO[i],bbch:"",azoto,riferimento:(min+max)/2})),
  },p.nome)),
  ...Object.entries(GRANO_DURO_DB).map(([name,p])=> {
    const phases=fasiGranoPerVarieta(name);
    // Operational phase anchors from the existing crop curve, not a new cultivar curve.
    const days=name==="RGT NATUR"?[0,136,190]:[0,50,136,190];
    const yieldQ=p.resaDefault??50;
    return template({...common,crop:"grano duro",name,plants:p.densitaSemiMqDefault*10000,
      yield:yieldQ/10,nitrogen:yieldQ*3,
      phases:phases.map((phase,i)=>({id:`F${i+1}`,label:phase.label,bbch:phase.bbch,azoto:calcolaQuotaNGrano(yieldQ*3,phase),riferimento:ndviOttimaleGrano(days[i])})),
    });
  }),
  ...Object.entries(tobacco).map(([name,p])=>template({
    ...common,crop:"tabacco",name,plants:p.densitaPianteDefault,yield:p.resaDefault,nitrogen:p.azotoDefault,
    phases:NDVI_CURVA.filter(point=>[0,28,55,75].includes(point.giorni)).map((point,i)=>({
      id:`F${i+1}`,label:`${point.giorni} giorni dal trapianto`,bbch:"",azoto:p.azotoDefault/4,riferimento:point.ottimale,
    })),
  })),
];
export const templatesForCrop=(crop:string)=>varietyTemplates.filter(t=>t.profile.crop===crop);
export function proposedProfile(input:{crop:string;name:string;referenceId:string;phaseNitrogen:number[]}) {
  const ref=varietyTemplates.find(t=>t.id===input.referenceId&&t.profile.crop===input.crop);
  const name=input.name.normalize("NFKC").trim().replace(/\s+/g," ");
  if(!ref||!name||name.length>100||/[\u0000-\u001f\u007f]/.test(name)
    ||input.phaseNitrogen.length!==ref.profile.phases.length
    ||input.phaseNitrogen.some(n=>!Number.isFinite(n)||n<0||n>1000)
    ||input.phaseNitrogen.reduce((a,b)=>a+b,0)<=0
    ||input.phaseNitrogen.reduce((a,b)=>a+b,0)>1500)throw new Error("INVALID_VARIETY");
  if(templatesForCrop(input.crop).some(t=>[t.profile.name,t.referenceName].some(existing=>
    existing.normalize("NFKC").toLocaleLowerCase()===name.toLocaleLowerCase())))
    throw new Error("VARIETY_EXISTS");
  const profile:CropProfile={...ref.profile,name,nitrogen:input.phaseNitrogen.reduce((a,b)=>a+b,0),
    phases:ref.profile.phases.map((p,i)=>({...p,azoto:input.phaseNitrogen[i]}))};
  return {profile,reference:ref};
}
