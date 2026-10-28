import { Router } from "express";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import {
  AcknowledgePrivacyBody, CreatePrivacyRequestBody, InviteManagedUserBody,
  UpdateManagedUserBody, UpdateManagedPrivacyRequestBody,
} from "@workspace/api-zod";
import pool from "../lib/db";
import { audit, PRIVACY_VERSION } from "../lib/security-db";
import { accountJson, deleteAccount, inviteAccount, requestColumns } from "../lib/account-actions";
import { requireAccount, requireAdmin, type LocalAccount } from "../middlewares/access";
import { DEFAULT_SUBSCRIPTION_DAYS, subscriptionExpiry, validSubscriptionDays } from "../lib/subscription";

const router = Router();
const privateRouter = Router();
const adminRouter = Router();
const accountLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (_req, res) => res.locals.account.id,
  message: { error: "Troppe richieste. Attendi qualche minuto." },
});
const bootstrapLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 4, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: () => "administrator-activation",
  message: { error: "Attendi 15 minuti prima di richiedere un altro invito." },
});

router.get("/auth/setup", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { rows } = await pool.query(
    "SELECT clerk_user_id FROM app_users WHERE id=(SELECT value FROM security_state WHERE key='initial_admin')",
  );
  res.json({ activationAvailable: !!rows[0] && !rows[0].clerk_user_id });
});

router.post("/auth/bootstrap-invite", bootstrapLimit, async (req, res) => {
  const { rows } = await pool.query<LocalAccount>(
    "SELECT * FROM app_users WHERE id=(SELECT value FROM security_state WHERE key='initial_admin')",
  );
  const admin = rows[0];
  try {
    if (admin && !admin.clerk_user_id) {
      await inviteAccount(admin, res.locals.siteOrigin);
    }
    res.json({ message: "Se l’attivazione è ancora necessaria, l’invito è stato inviato all’indirizzo dell’amministratore configurato. Controlla anche lo spam; puoi richiederlo ogni 15 minuti." });
  } catch {
    req.log.error("Administrator invitation failed");
    res.status(502).json({ error: "Invio dell’invito non riuscito. Riprova o contatta l’assistenza." });
  }
});

privateRouter.use(requireAccount);
privateRouter.get("/me", (_req, res) => res.json(accountJson(res.locals.account)));
privateRouter.post("/privacy-ack", accountLimit, async (req, res) => {
  const result = AcknowledgePrivacyBody.safeParse(req.body);
  if (!result.success || result.data.version !== PRIVACY_VERSION) {
    return res.status(400).json({ error: "Versione dell’informativa non valida. Aggiorna la pagina." });
  }
  await pool.query("UPDATE app_users SET privacy_version=$2,privacy_ack_at=now() WHERE id=$1", [res.locals.account.id, PRIVACY_VERSION]);
  await audit(res.locals.account.id, res.locals.account.id, "privacy_notice_acknowledged");
  return res.json({ message: "Presa visione registrata." });
});
privateRouter.get("/export", accountLimit, async (_req, res) => {
  const account: LocalAccount = res.locals.account;
  const observations = await pool.query(
    `SELECT observation_id AS id, data, data_trapianto, tipo_intervento, giorni, eta_piantina,
       cliente, appezzamento, resa, varieta, piante_semi_ha, piante_semi_unita, piante_ha_equivalenti,
       n1,n2,n3,n4,n5,media,ottimale,discostamento,dose,fase_fenologica,bbch,fase_fonte,
       azoto_totale,azoto_gia_distribuito,quota_azoto,lat,lng,created_at
     FROM osservazioni WHERE owner_id=$1 ORDER BY created_at DESC`,
    [account.id],
  );
  const requests = await pool.query(`SELECT ${requestColumns} FROM privacy_requests WHERE user_id=$1`, [account.id]);
  await audit(account.id, account.id, "personal_data_export");
  res.setHeader("Content-Disposition", 'attachment; filename="nitrocrop-dati-personali.json"');
  res.json({
    exportedAt: new Date().toISOString(), account: accountJson(account),
    observations: observations.rows, privacyRequests: requests.rows,
    identityData: "I dati di sicurezza dell’identità, delle sessioni e delle verifiche email sono gestiti dal fornitore di autenticazione. Per una copia completa contatta privacy@taurusagsolution.com.",
  });
});
privateRouter.get("/privacy-requests", async (_req, res) => {
  const { rows } = await pool.query(`SELECT ${requestColumns} FROM privacy_requests WHERE user_id=$1 ORDER BY created_at DESC`, [res.locals.account.id]);
  res.json(rows);
});
privateRouter.post("/privacy-requests", accountLimit, async (req, res) => {
  const result = CreatePrivacyRequestBody.safeParse(req.body);
  if (!result.success || !result.data.message.trim()) return res.status(400).json({ error: "Indica il tipo di richiesta e una descrizione (massimo 2000 caratteri)." });
  const { rows } = await pool.query(
    `INSERT INTO privacy_requests(id,user_id,type,message) VALUES($1,$2,$3,$4) RETURNING ${requestColumns}`,
    [randomUUID(), res.locals.account.id, result.data.type, result.data.message.trim()],
  );
  await audit(res.locals.account.id, res.locals.account.id, "privacy_request_created");
  return res.status(201).json(rows[0]);
});
router.use("/auth", privateRouter);

adminRouter.use(requireAccount, requireAdmin);
adminRouter.get("/users", async (_req, res) => {
  const { rows } = await pool.query<LocalAccount>("SELECT * FROM app_users ORDER BY created_at DESC");
  res.json(rows.map(accountJson));
});
adminRouter.post("/users", accountLimit, async (req, res) => {
  const result = InviteManagedUserBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Inserisci un indirizzo email valido e un nome (massimo 120 caratteri)." });
  if (!validSubscriptionDays(result.data.subscriptionDays ?? DEFAULT_SUBSCRIPTION_DAYS)) return res.status(400).json({ error: "La durata deve essere un numero intero da 1 a 3650 giorni." });
  const email = result.data.email.trim().toLowerCase();
  const { rows } = await pool.query<LocalAccount>(
    `INSERT INTO app_users(id,email,name,subscription_duration_days,subscription_expires_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING RETURNING *`,
    [randomUUID(), email, result.data.name.trim(), result.data.subscriptionDays ?? DEFAULT_SUBSCRIPTION_DAYS, subscriptionExpiry(result.data.subscriptionDays ?? DEFAULT_SUBSCRIPTION_DAYS)],
  );
  if (!rows[0]) return res.status(409).json({ error: "Esiste già un utente con questa email. Usa Reinvia invito oppure Abilita." });
  await audit(res.locals.account.id, rows[0].id, "user_authorized");
  try {
    await inviteAccount(rows[0], res.locals.siteOrigin);
    return res.status(201).json(accountJson(rows[0]));
  } catch {
    req.log.error("User invitation delivery failed");
    return res.status(502).json({ error: "Utente creato, ma l’invio dell’invito non è riuscito. Aggiorna l’elenco e usa Reinvia invito." });
  }
});
adminRouter.patch("/users/:id", accountLimit, async (req, res) => {
  const result = UpdateManagedUserBody.safeParse(req.body);
  if (!result.success || (result.data.status === undefined && result.data.subscriptionDays === undefined)) return res.status(400).json({ error: "Indica uno stato o una durata valida da 1 a 3650 giorni." });
  if (result.data.subscriptionDays !== undefined && !validSubscriptionDays(result.data.subscriptionDays)) return res.status(400).json({ error: "La durata deve essere un numero intero da 1 a 3650 giorni." });
  const target = (await pool.query<LocalAccount>("SELECT * FROM app_users WHERE id=$1", [req.params.id])).rows[0];
  if (!target) return res.status(404).json({ error: "Utente non trovato." });
  if (target.role === "admin" || target.status === "deleting") return res.status(400).json({ error: "Non puoi modificare questo account." });
  const days = result.data.subscriptionDays;
  const { rows } = await pool.query<LocalAccount>(
    `UPDATE app_users SET status=COALESCE($2,status),
      subscription_duration_days=COALESCE($3,subscription_duration_days),
      subscription_expires_at=COALESCE($4,subscription_expires_at) WHERE id=$1 RETURNING *`,
    [target.id, result.data.status ?? null, days ?? null, days === undefined ? null : subscriptionExpiry(days)],
  );
  if (result.data.status) await audit(res.locals.account.id, target.id, `user_${result.data.status}`);
  if (days !== undefined) await audit(res.locals.account.id, target.id, "subscription_updated");
  return res.json(accountJson(rows[0]));
});
adminRouter.post("/users/:id/invite", accountLimit, async (req, res) => {
  const target = (await pool.query<LocalAccount>("SELECT * FROM app_users WHERE id=$1", [req.params.id])).rows[0];
  if (!target) return res.status(404).json({ error: "Utente non trovato." });
  if (target.status !== "active" || target.clerk_user_id) return res.status(400).json({ error: "L’utente è già attivato oppure è sospeso. Per la password usa il recupero dalla schermata Accedi." });
  try {
    const sent = await inviteAccount(target, res.locals.siteOrigin);
    if (!sent) return res.status(429).json({ error: "Invito già richiesto. Attendi 15 minuti." });
    await audit(res.locals.account.id, target.id, "invitation_resent");
    return res.json({ message: "Invito inviato. Controllare anche la cartella spam." });
  } catch {
    req.log.error("Invitation resend failed");
    return res.status(502).json({ error: "Invio non riuscito. Riprova." });
  }
});
adminRouter.delete("/users/:id", accountLimit, deleteAccount);
adminRouter.get("/privacy-requests", async (_req, res) => {
  res.json((await pool.query(`SELECT ${requestColumns} FROM privacy_requests ORDER BY created_at DESC`)).rows);
});
adminRouter.patch("/privacy-requests/:id", accountLimit, async (req, res) => {
  const result = UpdateManagedPrivacyRequestBody.safeParse(req.body);
  if (!result.success || !result.data.response.trim()) return res.status(400).json({ error: "Inserisci un esito e una risposta." });
  const { rows } = await pool.query(
    `UPDATE privacy_requests SET status=$2,response=$3 WHERE id=$1 RETURNING ${requestColumns}`,
    [req.params.id, result.data.status, result.data.response.trim()],
  );
  if (!rows[0]) return res.status(404).json({ error: "Richiesta non trovata." });
  await audit(res.locals.account.id, rows[0].userId, "privacy_request_updated");
  return res.json(rows[0]);
});
adminRouter.get("/audit", async (_req, res) => {
  res.json((await pool.query(
    `SELECT id,action,target_id AS "targetId",created_at AS "createdAt" FROM security_events ORDER BY created_at DESC LIMIT 100`,
  )).rows);
});
router.use("/admin", adminRouter);
export default router;
