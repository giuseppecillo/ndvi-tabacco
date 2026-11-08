import { Router } from "express";
import { erroreOsservazionePomodoro } from "@workspace/tomato-calculations";
import { isCatalogueCrop, catalogueObservationError } from "@workspace/crop-calculations";
import {operationalCatalogue} from "../lib/catalogue-storage";
import { randomUUID } from "node:crypto";
import pool from "../lib/db";
import { saveWithUsage } from "../lib/plan-store";
import { PlanError, validDay } from "../lib/plan-model";
import { riferimentoNdviTabacco, calcolaDoseNTabacco } from "@workspace/tobacco-calculations";
import { requireAccount, requirePrivacyAck, requireSubscription } from "../middlewares/access";
import {
  faseGranoDaBbch, calcolaDoseNGrano, calcolaFabbisognoNGrano,
  GRANO_DURO_DB, calcolaDensitaGrano, ndviOttimaleGrano,
} from "@workspace/grain-calculations";

const router = Router();
router.use("/osservazioni", requireAccount,
  (req,res,next) => req.method === "GET" ? next() : requireSubscription(req,res,next),
  requirePrivacyAck);

const numero = (value: unknown): number | null => {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function erroreOsservazioneTabacco(o: Record<string, unknown>): string | null {
  const letture = [o.n1, o.n2, o.n3, o.n4, o.n5].map(numero);
  if (letture.some((valore) => valore === null || valore < 0 || valore > 1)) {
    return "Le letture NDVI del tabacco devono essere comprese tra 0 e 1.";
  }

  const media = numero(o.media);
  const ottimale = numero(o.ottimale);
  const discostamento = numero(o.discostamento);
  const giorni = numero(o.giorni);
  const resa = numero(o.resa);
  const fabbisognoN = numero(o.fabbisognoN);
  const azotoTotale = numero(o.azotoTotale);
  const azotoGiaDistribuito = numero(o.azotoGiaDistribuito);
  const dose = numero(o.dose);
  if (
    media === null || ottimale === null || discostamento === null || giorni === null
    || resa === null || fabbisognoN === null || azotoTotale === null || azotoGiaDistribuito === null || dose === null
  ) {
    return "I parametri del piano azoto tabacco non sono completi.";
  }
  if (giorni < 0 || resa < 0 || fabbisognoN < 0 || azotoTotale < 0 || azotoGiaDistribuito < 0 || dose < 0 || ottimale < 0 || ottimale > 1) {
    return "I valori del piano azoto tabacco non sono validi.";
  }

  const mediaCalcolata = (letture as number[]).reduce((somma, valore) => somma + valore, 0) / letture.length;
  if (Math.abs(media - mediaCalcolata) > 0.0001) {
    return "La media NDVI del tabacco non è coerente con le letture inviate.";
  }
  const { ottimale: riferimentoAtteso } = riferimentoNdviTabacco(
    giorni,
    o.etaPiantina === "avanzata" || o.etaPiantina === "extra" ? o.etaPiantina : "standard",
  );
  if (Math.abs(ottimale - riferimentoAtteso) > 0.0001) {
    return "Il riferimento NDVI del tabacco non corrisponde al calendario fenologico.";
  }

  const { discostamento: discostamentoAtteso, dose: doseAttesa } = calcolaDoseNTabacco({
    media, ottimale, fabbisognoN, azotoTotale, azotoGiaDistribuito,
  });
  if (Math.abs(discostamento - discostamentoAtteso) > 0.0001) {
    return "Il deficit NDVI del tabacco non è coerente con media e riferimento.";
  }
  if (Math.abs(dose - doseAttesa) > 0.01) {
    return "La dose tabacco non corrisponde alla quota ricalcolata da NDVI e fabbisogno N.";
  }
  return null;
}

export function erroreOsservazioneGrano(o: Record<string, unknown>): string | null {
  const fase = typeof o.bbch === "string"
    ? faseGranoDaBbch(o.bbch, typeof o.varieta === "string" ? o.varieta : undefined)
    : null;
  if (o.faseFonte !== "BBCH confermato in campo" || !fase) {
    return "Per il grano duro serve un BBCH della fase azotata confermato in campo.";
  }
  if (o.faseFenologica !== fase.label) {
    return "La fase fenologica non corrisponde al BBCH confermato.";
  }

  const letture = [o.n1, o.n2, o.n3, o.n4, o.n5].map(numero);
  if (letture.some((valore) => valore === null || valore < 0 || valore > 1)) {
    return "Le letture NDVI del grano devono essere comprese tra 0 e 1.";
  }

  const media = numero(o.media);
  const ottimale = numero(o.ottimale);
  const discostamento = numero(o.discostamento);
  const das = numero(o.giorni);
  const azotoTotale = numero(o.azotoTotale);
  const azotoGiaDistribuito = numero(o.azotoGiaDistribuito);
  const dose = numero(o.dose);
  const quotaAzoto = numero(o.quotaAzoto);
  if (
    media === null || ottimale === null || discostamento === null || das === null
    || azotoTotale === null || azotoGiaDistribuito === null || dose === null || quotaAzoto === null
  ) {
    return "I parametri del piano azoto grano non sono completi.";
  }
  if (das < 0 || azotoTotale < 0 || azotoGiaDistribuito < 0 || dose < 0 || quotaAzoto < 0 || ottimale < 0 || ottimale > 1) {
    return "I valori del piano azoto grano non sono validi.";
  }
  if (typeof o.varieta !== "string" || !Object.hasOwn(GRANO_DURO_DB, o.varieta)) {
    return "La varietà di grano duro non è supportata.";
  }
  const densita = numero(o.densitaValore);
  const resa = numero(o.resa);
  const unita = o.densitaUnita;
  if (densita === null || densita <= 0 || resa === null || resa <= 0
    || (unita !== "kg/ha" && unita !== "semi/m²" && unita !== "semi/ha")) {
    return "Resa e densità del grano duro non sono valide.";
  }
  const { semiMqEquivalenti, fattoreAzoto } = calcolaDensitaGrano(densita, unita, GRANO_DURO_DB[o.varieta]);
  const totaleAtteso = calcolaFabbisognoNGrano(resa, fattoreAzoto).corretto;
  if (!Number.isFinite(semiMqEquivalenti) || !Number.isFinite(totaleAtteso)
    || Math.abs(azotoTotale - totaleAtteso) > 0.01) {
    return "Il fabbisogno grano non corrisponde alla resa e alla densità.";
  }

  const mediaCalcolata = (letture as number[]).reduce((somma, valore) => somma + valore, 0) / letture.length;
  if (Math.abs(media - mediaCalcolata) > 0.0001 || Math.abs(discostamento - (ottimale - media)) > 0.0001) {
    return "Media o scostamento NDVI non coerenti con le letture inviate.";
  }
  const riferimentoAtteso = ndviOttimaleGrano(das);
  if (Math.abs(ottimale - riferimentoAtteso) > 0.0001) {
    return "Il riferimento NDVI non corrisponde al calendario fenologico del grano.";
  }
  if (Math.abs(dose - quotaAzoto) > 0.01) {
    return "Dose e quota azotata del grano devono coincidere.";
  }

  const { residuoPiano: residuo, quotaBase, quotaProposta: quotaAttesa } = calcolaDoseNGrano({
    fabbisognoN: azotoTotale, azotoGiaDistribuito, fase,
    media, ndviOttimale: ottimale, valoriValidi: true,
  });
  if (Math.abs(dose - quotaAttesa) > 0.01) {
    return "La dose non corrisponde alla quota ricalcolata da BBCH, NDVI e azoto residuo.";
  }
  if (dose > residuo + 0.01 || dose > quotaBase + 0.01) {
    return "La dose supera il residuo del piano o la quota N ottimale della fase.";
  }
  return null;
}

// GET all observations (newest first)
router.get("/osservazioni", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         observation_id AS id, data, data_trapianto AS "dataTrapianto",
         data_trapianto AS "dataSemina",
         tipo_intervento AS coltura,
         giorni,
         eta_piantina AS "etaPiantina",
         cliente, appezzamento, resa, varieta,
         piante_semi_ha AS "densitaValore",
         piante_semi_unita AS "densitaUnita",
         piante_ha_equivalenti AS "pianteHaEquivalenti",
         n1, n2, n3, n4, n5,
         media, ottimale, discostamento, dose,
         fase_fenologica AS "faseFenologica",
         bbch,
         fase_fonte AS "faseFonte",
         azoto_totale AS "azotoTotale",
          azoto_gia_distribuito AS "azotoGiaDistribuito",
         quota_azoto AS "quotaAzoto",
         lat, lng,
         created_at AS "createdAt"
       FROM osservazioni
       WHERE owner_id=$1
       ORDER BY created_at DESC`,
       [res.locals.account.id],
    );
    const parsed = rows.map((r) => ({
       ...r,
       coltura: isCatalogueCrop(r.coltura) ? r.coltura : r.coltura === "pomodoro" ? "pomodoro" : r.coltura === "grano duro" ? "grano duro" : "tabacco",
      giorni:        Number(r.giorni),
      resa:          Number(r.resa),
      n1:            Number(r.n1),
      n2:            Number(r.n2),
      n3:            Number(r.n3),
      n4:            Number(r.n4),
      n5:            Number(r.n5),
      media:         Number(r.media),
      ottimale:      Number(r.ottimale),
      discostamento: Number(r.discostamento),
      dose:          Number(r.dose),
       azotoTotale:   r.azotoTotale != null ? Number(r.azotoTotale) : null,
        azotoGiaDistribuito: r.azotoGiaDistribuito != null ? Number(r.azotoGiaDistribuito) : null,
       quotaAzoto:     r.quotaAzoto != null ? Number(r.quotaAzoto) : null,
      lat:           r.lat != null ? Number(r.lat) : null,
      lng:           r.lng != null ? Number(r.lng) : null,
      etaPiantina:   r.etaPiantina ?? "standard",
       densitaValore: r.densitaValore != null ? Number(r.densitaValore) : null,
       densitaUnita:  r.densitaUnita ?? null,
       pianteHaEquivalenti: r.pianteHaEquivalenti != null ? Number(r.pianteHaEquivalenti) : null,
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Impossibile caricare le osservazioni." });
  }
});

// POST — save a new observation
router.post("/osservazioni", async (req, res) => {
  const o = req.body;
  if (!o || typeof o.id !== "string" || !o.id.trim() || o.id.length > 100) {
    res.status(400).json({ error: "ID osservazione non valido." });
    return;
  }
  const coltura = o.coltura ?? o.tipoIntervento ?? "tabacco";
  if (!isCatalogueCrop(coltura) && coltura !== "tabacco" && coltura !== "grano duro" && coltura !== "pomodoro") {
    res.status(400).json({ error: "Coltura non supportata." });
    return;
  }
  if(isCatalogueCrop(coltura)) {
    try { await operationalCatalogue(); }
    catch { res.status(503).json({error:"Catalogo temporaneamente non disponibile. Riprova."}); return; }
  }
  const errore = isCatalogueCrop(coltura)
    ? catalogueObservationError({ ...o, coltura })
    : coltura === "pomodoro"
    ? erroreOsservazionePomodoro(o)
    : coltura === "grano duro"
    ? erroreOsservazioneGrano(o)
    : erroreOsservazioneTabacco(o);
  if (errore) {
    res.status(400).json({ error: errore });
    return;
  }
  if (typeof o.data !== "string" || !validDay(o.data)
    || typeof o.cliente !== "string" || !o.cliente.trim() || o.cliente.length > 500) {
    res.status(400).json({error:"Cliente e data del rilievo non validi."});
    return;
  }
  try {
    const saved = await saveWithUsage(res.locals.account, o.cliente, o.data, sql => sql.query(
      `INSERT INTO osservazioni
         (id, data, data_trapianto, tipo_intervento, giorni, eta_piantina,
           cliente, appezzamento, resa, varieta, piante_semi_ha, piante_semi_unita, piante_ha_equivalenti,
            n1, n2, n3, n4, n5, media, ottimale, discostamento, dose,
             fase_fenologica, bbch, fase_fonte, azoto_totale, azoto_gia_distribuito, quota_azoto, lat, lng, owner_id, observation_id, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,now())
       ON CONFLICT (owner_id, observation_id) DO UPDATE SET
         data=$2, data_trapianto=$3, tipo_intervento=$4, giorni=$5, eta_piantina=$6,
          cliente=$7, appezzamento=$8, resa=$9, varieta=$10,
          piante_semi_ha=$11, piante_semi_unita=$12, piante_ha_equivalenti=$13,
          n1=$14, n2=$15, n3=$16, n4=$17, n5=$18,
           media=$19, ottimale=$20, discostamento=$21, dose=$22,
             fase_fenologica=$23, bbch=$24, fase_fonte=$25, azoto_totale=$26, azoto_gia_distribuito=$27, quota_azoto=$28,
             lat=$29, lng=$30
       RETURNING created_at AS "createdAt"`,
      [
          randomUUID(), o.data, o.dataSemina || o.dataTrapianto || null, coltura, o.giorni,
        o.etaPiantina ?? "standard",
        o.cliente, o.appezzamento, o.resa, o.varieta,
        o.densitaValore ?? null, o.densitaUnita ?? null, o.pianteHaEquivalenti ?? null,
         o.n1, o.n2, o.n3, o.n4, o.n5, o.media, o.ottimale, o.discostamento, o.dose,
          o.faseFenologica ?? null, o.bbch ?? null, o.faseFonte ?? null,
           o.azotoTotale ?? null, o.azotoGiaDistribuito ?? null, o.quotaAzoto ?? null,
           o.lat ?? null, o.lng ?? null, res.locals.account.id, o.id.trim(),
      ]
    ));
    res.status(201).json({ ok: true, createdAt: saved.rows[0].createdAt });
  } catch (err) {
    if (err instanceof PlanError) {
      res.status(err.status).json({error:err.message,code:err.code});
      return;
    }
    res.status(500).json({ error: "Impossibile salvare l’osservazione." });
  }
});

// DELETE — remove an observation by id
router.delete("/osservazioni/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM osservazioni WHERE observation_id=$1 AND owner_id=$2", [req.params.id, res.locals.account.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Impossibile eliminare l’osservazione." });
  }
});

// DELETE all — reset the entire registry
router.delete("/osservazioni", async (_req, res) => {
  try {
    await pool.query("DELETE FROM osservazioni WHERE owner_id=$1", [res.locals.account.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Impossibile cancellare il registro." });
  }
});

export default router;
