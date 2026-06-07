import { Router } from "express";
import pool from "../lib/db";

const router = Router();

// GET all observations (newest first)
router.get("/osservazioni", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, data, data_trapianto AS "dataTrapianto",
         giorni,
         eta_piantina AS "etaPiantina",
         cliente, appezzamento, resa, varieta,
         n1, n2, n3, n4, n5,
         media, ottimale, discostamento, dose,
         lat, lng,
         created_at AS "createdAt"
       FROM osservazioni
       ORDER BY created_at DESC`
    );
    const parsed = rows.map((r) => ({
      ...r,
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
      lat:           r.lat != null ? Number(r.lat) : null,
      lng:           r.lng != null ? Number(r.lng) : null,
      etaPiantina:   r.etaPiantina ?? "standard",
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "DB error", detail: String(err) });
  }
});

// POST — save a new observation
router.post("/osservazioni", async (req, res) => {
  const o = req.body;
  try {
    await pool.query(
      `INSERT INTO osservazioni
         (id, data, data_trapianto, tipo_intervento, giorni, eta_piantina,
          cliente, appezzamento, resa, varieta,
          n1, n2, n3, n4, n5,
          media, ottimale, discostamento, dose,
          lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (id) DO UPDATE SET
         data=$2, data_trapianto=$3, tipo_intervento=$4, giorni=$5, eta_piantina=$6,
         cliente=$7, appezzamento=$8, resa=$9, varieta=$10,
         n1=$11, n2=$12, n3=$13, n4=$14, n5=$15,
         media=$16, ottimale=$17, discostamento=$18, dose=$19,
         lat=$20, lng=$21`,
      [
        o.id, o.data, o.dataTrapianto || null, o.tipoIntervento ?? "n/d", o.giorni,
        o.etaPiantina ?? "standard",
        o.cliente, o.appezzamento, o.resa, o.varieta,
        o.n1, o.n2, o.n3, o.n4, o.n5,
        o.media, o.ottimale, o.discostamento, o.dose,
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
