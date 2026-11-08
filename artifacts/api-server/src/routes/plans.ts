import { Router } from "express";
import type { ErrorRequestHandler } from "express";
import { clerkClient } from "@clerk/express";
import { rateLimit } from "express-rate-limit";
import {
  AssignManagedPlanBody, RegisterGeneratedMapBody,
  ListManagedUsageResponse, GetMyUsageResponse, ListPendingRegistrationsResponse,
} from "@workspace/api-zod";
import pool from "../lib/db";
import { requireAccount, requireAdmin, requirePrivacyAck, requireSubscription } from "../middlewares/access";
import { PlanError } from "../lib/plan-model";
import { countGeneratedMap, locked, usageFor, writePlan } from "../lib/plan-store";
import { audit } from "../lib/security-db";

const router = Router();
const limits = rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (_req,res) => res.locals.account.id,
});
router.get("/auth/usage", requireAccount, async (_req,res) => {
  res.json(GetMyUsageResponse.parse((await usageFor([res.locals.account]))[0]));
});
router.get("/admin/usage", requireAccount, requireAdmin, async (_req,res) => {
  const { rows } = await pool.query("SELECT id,role FROM app_users ORDER BY created_at DESC");
  res.json(ListManagedUsageResponse.parse(await usageFor(rows)));
});
router.get("/admin/registrations", requireAccount, requireAdmin, async (req,res) => {
  const offset = Number(req.query.offset ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    res.status(400).json({ error: "Pagina non valida." }); return;
  }
  const users = await clerkClient.users.getUserList({ limit: 100, offset });
  const known = new Set((await pool.query("SELECT email FROM app_users")).rows.map(row => String(row.email).toLowerCase()));
  const items = users.data.flatMap(user => {
    const email = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)?.emailAddress;
    return email && !known.has(email.toLowerCase()) ? [{
      email, name: [user.firstName,user.lastName].filter(Boolean).join(" ") || email.split("@")[0],
      registeredAt: new Date(user.createdAt).toISOString(),
    }] : [];
  });
  res.json(ListPendingRegistrationsResponse.parse({
    items, nextOffset: offset + users.data.length < users.totalCount ? offset + users.data.length : null,
  }));
});
router.put("/admin/users/:id/plan", requireAccount, requireAdmin, limits, async (req,res) => {
  const parsed = AssignManagedPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({error:"Piano o data di decorrenza non validi."}); return; }
  const id = String(req.params.id);
  const target = (await pool.query("SELECT id,role,status FROM app_users WHERE id=$1", [id])).rows[0];
  if (!target) { res.status(404).json({ error: "Utente non trovato." }); return; }
  if (target.role === "admin") { res.status(400).json({ error: "L’amministratore è esente dai limiti." }); return; }
  await locked(id, client => writePlan(id, parsed.data, client));
  await audit(res.locals.account.id,id,parsed.data.renew ? "annual_plan_renewed" : "plan_assigned");
  res.json(GetMyUsageResponse.parse((await usageFor([target]))[0]));
});
router.post("/usage/maps", requireAccount, requireSubscription, requirePrivacyAck, limits, async (req,res) => {
  const parsed = RegisterGeneratedMapBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({error:"Identificativo elaborazione non valido."}); return; }
  res.json(GetMyUsageResponse.parse(await countGeneratedMap(res.locals.account, parsed.data.requestId)));
});
const errors: ErrorRequestHandler = (error,req,res,_next) => {
  if (error instanceof PlanError) { res.status(error.status).json({error:error.message,code:error.code}); return; }
  req.log.error("Subscription or usage operation failed");
  res.status(503).json({error:"Impossibile verificare piano e consumi. Riprova."});
};
router.use(errors);
export default router;
