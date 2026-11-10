import {Router} from "express";
import {randomUUID} from "node:crypto";
import {rateLimit} from "express-rate-limit";
import {pool} from "@workspace/db";
import {SubmitVarietyProposalBody,ReviewVarietyProposalBody} from "@workspace/api-zod";
import {requireAccount,requireAdmin,requirePrivacyAck,requireSubscription} from "../middlewares/access";
import {templatesForCrop,proposedProfile} from "../lib/variety-templates";
import {proposalColumns} from "../lib/variety-store";

const router=Router();
const limits=rateLimit({windowMs:60000,limit:20,keyGenerator:(_req,res)=>res.locals.account.id});
router.get("/variety-templates",requireAccount,requireSubscription,(_req,res)=>{
  const crop=String(_req.query.crop??"");
  const templates=templatesForCrop(crop);
  if(!templates.length){res.status(400).json({error:"Coltura non valida."});return;}
  res.json(templates);
});
router.get("/variety-proposals",requireAccount,requireSubscription,async(_req,res)=>{
  try{
    const account=res.locals.account;
    const {rows}=await pool.query(`SELECT ${proposalColumns},submitted_by=$1 AS "isOwn" FROM agronomy_catalogue.variety_submissions
      WHERE status='approved' OR submitted_by=$1 OR $2::boolean ORDER BY created_at DESC`,
      [account.id,account.role==="admin"]);
    res.json(rows);
  }catch{res.status(503).json({error:"Servizio varietà non disponibile."});}
});
router.post("/variety-proposals",requireAccount,requireSubscription,requirePrivacyAck,limits,async(req,res)=>{
  const parsed=SubmitVarietyProposalBody.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Dati della varietà non validi."});return;}
  try{
    const {profile,reference}=proposedProfile(parsed.data);
    const {rows}=await pool.query(`INSERT INTO agronomy_catalogue.variety_submissions
      (id,crop,name,submitted_by,reference_id,reference_name,profile)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING ${proposalColumns}`,
      [randomUUID(),profile.crop,profile.name,res.locals.account.id,reference.id,reference.referenceName,JSON.stringify(profile)]);
    res.status(201).json({...rows[0],isOwn:true});
  }catch(error){
    const e=error as {code?:string;message?:string};
    if(e.code==="23505"||e.message==="VARIETY_EXISTS"){res.status(409).json({error:"Varietà già presente o in attesa di approvazione."});return;}
    if(e.message==="INVALID_VARIETY"){res.status(400).json({error:"Dati della varietà non validi."});return;}
    res.status(503).json({error:"Salvataggio della proposta non riuscito."});
  }
});
router.post("/admin/variety-proposals/:id/decision",requireAccount,requireAdmin,requirePrivacyAck,limits,async(req,res)=>{
  const parsed=ReviewVarietyProposalBody.safeParse(req.body);
  if(!parsed.success||!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(String(req.params.id))){
    res.status(400).json({error:"Decisione non valida."});return;
  }
  try{
    const {rows}=await pool.query(`UPDATE agronomy_catalogue.variety_submissions
      SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=statement_timestamp()
      WHERE id=$1 AND status='pending' RETURNING ${proposalColumns}`,
      [req.params.id,parsed.data.decision,parsed.data.note?.trim()||null,res.locals.account.id]);
    if(!rows.length){res.status(409).json({error:"Proposta non più in attesa."});return;}
    res.json(rows[0]);
  }catch{res.status(503).json({error:"Revisione della proposta non riuscita."});}
});
export default router;
