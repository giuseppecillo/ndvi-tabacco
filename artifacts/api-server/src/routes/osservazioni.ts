import { Router } from "express";
import pool from "../lib/db";

const router = Router();

const FASI_N_GRANO: Record<string, { label: string; min: number; max: number }> = {
  "00–09": { label: "Semina / emergenza", min: 27, max: 36 },
  "20–29": { label: "Accestimento", min: 40, max: 50 },
  "30–32": { label: "Inizio levata", min: 40, max: 60 },
  "37–39": { label: "Foglia a bandiera", min: 20, max: 30 },
};

const CURVA_NDVI_GRANO = [
  { das: 0, ottimale: 0.20 },
  { das: 20, ottimale: 0.34 },
  { das: 50, ottimale: 0.40 },
  { das: 135, ottimale: 0.55 },
  { das: 136, ottimale: 0.65 },
  { das: 165, ottimale: 0.72 },
  { das: 166, ottimale: 0.73 },
  { das: 190, ottimale: 0.85 },
  { das: 205, ottimale: 0.80 },
  { das: 220, ottimale: 0.72 },
  { das: 250, ottimale: 0.42 },
];

const numero = (value: unknown): number | null => {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function ndviRiferimentoGrano(das: number): number {
  const primo = CURVA_NDVI_GRANO[0];
  const ultimo = CURVA_NDVI_GRANO[CURVA_NDVI_GRANO.length - 1];
  if (das <= primo.das) return primo.ottimale;
  if (das >= ultimo.das) return ultimo.ottimale;
  for (let index = 1; index < CURVA_NDVI_GRANO.length; index++) {
    const destro = CURVA_NDVI_GRANO[index];
    if (das <= destro.das) {
      const sinistro = CURVA_NDVI_GRANO[index - 1];
      const progresso = (das - sinistro.das) / (destro.das - sinistro.das);
      return sinistro.ottimale + (destro.ottimale - sinistro.ottimale) * progresso;
    }
  }
  return ultimo.ottimale;
}

export function erroreOsservazioneGrano(o: Record<string, unknown>): string | null {
  const fase = typeof o.bbch === "string" ? FASI_N_GRANO[o.bbch] : undefined;
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

  const mediaCalcolata = (letture as number[]).reduce((somma, valore) => somma + valore, 0) / letture.length;
  if (Math.abs(media - mediaCalcolata) > 0.0001 || Math.abs(discostamento - (ottimale - media)) > 0.0001) {
    return "Media o scostamento NDVI non coerenti con le letture inviate.";
  }
  const riferimentoAtteso = ndviRiferimentoGrano(das);
  if (Math.abs(ottimale - riferimentoAtteso) > 0.0001) {
    return "Il riferimento NDVI non corrisponde al calendario fenologico del grano.";
  }
  if (Math.abs(dose - quotaAzoto) > 0.01) {
    return "Dose e quota azotata del grano devono coincidere.";
  }

  const residuo = Math.max(0, Math.round(azotoTotale - azotoGiaDistribuito));
  const sommaQuoteRiferimento = Object.values(FASI_N_GRANO)
    .reduce((somma, voce) => somma + (voce.min + voce.max) / 2, 0);
  const quotaBase = Math.round(azotoTotale * ((fase.min + fase.max) / 2) / sommaQuoteRiferimento);
  const fattoreNdvi = Math.max(0.85, Math.min(1.15, 1 + ((ottimale - media) / ottimale) * 0.5));
  const quotaModulata = Math.round(quotaBase * fattoreNdvi);
  const quotaNellaFase = Math.max(fase.min, Math.min(fase.max, quotaModulata));
  const quotaAttesa = Math.min(residuo, quotaNellaFase);
  if (Math.abs(dose - quotaAttesa) > 0.01) {
    return "La dose non corrisponde alla quota ricalcolata da BBCH, NDVI e azoto residuo.";
  }
  if (dose > residuo + 0.01 || dose > fase.max + 0.01) {
    return "La dose supera il residuo del piano o il limite della fase BBCH.";
  }
  if (residuo >= fase.min && dose + 0.01 < fase.min) {
    return "La dose è inferiore al minimo della fase pur avendo azoto residuo disponibile.";
  }
  return null;
}

// GET all observations (newest first)
router.get("/osservazioni", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, data, data_trapianto AS "dataTrapianto",
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
       ORDER BY created_at DESC`
    );
    const parsed = rows.map((r) => ({
       ...r,
       coltura: r.coltura === "grano duro" ? "grano duro" : "tabacco",
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
    res.status(500).json({ error: "DB error", detail: String(err) });
  }
});

// POST — save a new observation
router.post("/osservazioni", async (req, res) => {
  const o = req.body;
  const coltura = o.coltura ?? o.tipoIntervento ?? "tabacco";
  if (coltura !== "tabacco" && coltura !== "grano duro") {
    res.status(400).json({ error: "Coltura non supportata." });
    return;
  }
  if (coltura === "grano duro") {
    const errore = erroreOsservazioneGrano(o);
    if (errore) {
      res.status(400).json({ error: errore });
      return;
    }
  }
  try {
    await pool.query(
      `INSERT INTO osservazioni
         (id, data, data_trapianto, tipo_intervento, giorni, eta_piantina,
           cliente, appezzamento, resa, varieta, piante_semi_ha, piante_semi_unita, piante_ha_equivalenti,
            n1, n2, n3, n4, n5, media, ottimale, discostamento, dose,
             fase_fenologica, bbch, fase_fonte, azoto_totale, azoto_gia_distribuito, quota_azoto, lat, lng)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
       ON CONFLICT (id) DO UPDATE SET
         data=$2, data_trapianto=$3, tipo_intervento=$4, giorni=$5, eta_piantina=$6,
          cliente=$7, appezzamento=$8, resa=$9, varieta=$10,
          piante_semi_ha=$11, piante_semi_unita=$12, piante_ha_equivalenti=$13,
          n1=$14, n2=$15, n3=$16, n4=$17, n5=$18,
           media=$19, ottimale=$20, discostamento=$21, dose=$22,
             fase_fenologica=$23, bbch=$24, fase_fonte=$25, azoto_totale=$26, azoto_gia_distribuito=$27, quota_azoto=$28,
             lat=$29, lng=$30`,
      [
          o.id, o.data, o.dataSemina || o.dataTrapianto || null, coltura, o.giorni,
        o.etaPiantina ?? "standard",
        o.cliente, o.appezzamento, o.resa, o.varieta,
        o.densitaValore ?? null, o.densitaUnita ?? null, o.pianteHaEquivalenti ?? null,
         o.n1, o.n2, o.n3, o.n4, o.n5, o.media, o.ottimale, o.discostamento, o.dose,
          o.faseFenologica ?? null, o.bbch ?? null, o.faseFonte ?? null,
           o.azotoTotale ?? null, o.azotoGiaDistribuito ?? null, o.quotaAzoto ?? null,
           o.lat ?? null, o.lng ?? null,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "DB error", detail: String(err) });
  }
});

// DELETE — remove an observation by id
router.delete("/osservazioni/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM osservazioni WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "DB error", detail: String(err) });
  }
});

// DELETE all — reset the entire registry
router.delete("/osservazioni", async (_req, res) => {
  try {
    await pool.query("DELETE FROM osservazioni");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "DB error", detail: String(err) });
  }
});

export default router;
