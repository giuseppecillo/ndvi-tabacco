import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {CROP_PROFILES,cropCatalogue} from "@workspace/crop-calculations";
import {VarietyProposalForm} from "../src/components/VarietyProposalForm";
import {VarietyReviewPanel} from "../src/security/VarietyReviewPanel";
import {CropCatalogue} from "../src/components/CropCatalogue";
import App,{VARIETA_DB} from "../src/App";
import {setLanguage,type Language} from "../src/i18n/runtime";
import "../src/index.css";
if(!import.meta.env.DEV)throw Error("Synthetic development fixture only");
const key="qa-variety-proposals-only";
const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
const nativeFetch=window.fetch.bind(window);
let view="form";
let records:any[]=JSON.parse(sessionStorage.getItem(key)??"[]");
const response=(data:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}}));
window.fetch=async(input,init)=>{
  const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,location.href);
  if(!url.pathname.startsWith("/api/"))return nativeFetch(input,init);
  const method=init?.method??"GET";
  if(url.pathname==="/api/variety-templates"){
    const crop=url.searchParams.get("crop");
    const profiles=CROP_PROFILES.filter(p=>p.crop===crop).slice(0,2);
    return response(profiles.map((profile,i)=>({id:String(i+1).repeat(64),referenceName:profile.name,profile})));
  }
  if(url.pathname==="/api/variety-proposals"&&method==="GET")return response(records.map(p=>({...p,isOwn:true})));
  if(url.pathname==="/api/variety-proposals"&&method==="POST"){
    const body=JSON.parse(String(init?.body));
    const base=CROP_PROFILES.filter(p=>p.crop===body.crop)[Number(body.referenceId[0])-1];
    const row={id:crypto.randomUUID(),crop:body.crop,name:body.name,status:"pending",referenceId:body.referenceId,
      referenceName:base.name,reviewNote:null,createdAt:new Date().toISOString(),isOwn:true,
      profile:{...base,name:body.name,nitrogen:body.phaseNitrogen.reduce((a:number,b:number)=>a+b,0),
        phases:base.phases.map((p,i)=>({...p,azoto:body.phaseNitrogen[i]}))}};
    records.push(row);sessionStorage.setItem(key,JSON.stringify(records));return response(row,201);
  }
  if(url.pathname.startsWith("/api/admin/variety-proposals/")&&method==="POST"){
    const id=url.pathname.split("/")[4];const row=records.find(p=>p.id===id);
    if(!row||row.status!=="pending")return response({error:"Proposta non più in attesa."},409);
    const body=JSON.parse(String(init?.body));row.status=body.decision;row.reviewNote=body.note??null;
    sessionStorage.setItem(key,JSON.stringify(records));return response(row);
  }
  if(url.pathname==="/api/catalogo-colture")return response(cropCatalogue);
  if(url.pathname==="/api/osservazioni")return response([]);
  if(url.pathname==="/api/auth/me")return response({id:"qa-only",role:"admin",status:"active",name:"QA",email:"qa@example.invalid"});
  return response({error:"Synthetic fixture: real API blocked"},503);
};
function Fixture(){
  const [active,setActive]=useState("form");
  return <QueryClientProvider client={qc}>
    <nav className="flex flex-wrap gap-3 bg-amber-100 p-3">
      <strong>QA — synthetic proposals only</strong>
      {["form","admin","catalogue","calc"].map(name=><button key={name} onClick={()=>{view=name;setActive(name);qc.invalidateQueries();}}>{name}</button>)}
      <select aria-label="Language" onChange={e=>setLanguage(e.target.value as Language)}><option value="it">Italiano</option><option value="en">English</option><option value="es">Español</option></select>
    </nav>
    <main className="mx-auto max-w-4xl p-4">
      {active==="form"?<VarietyProposalForm crop="Kiwi"/>:active==="admin"?<VarietyReviewPanel/>:
        active==="catalogue"?<CropCatalogue active tobaccoVarieties={Object.values(VARIETA_DB)}/>:<App storageScope="qa-varieties-synthetic"/>}
    </main>
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
