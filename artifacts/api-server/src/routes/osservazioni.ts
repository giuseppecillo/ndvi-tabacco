import { Router } from "express";
import pool from "../lib/db";

const router = Router();

// GET all observations (newest first)
router.get("/osservazioni", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id, data, data_trapianto AS "dataTrapianto",
         tipo_intervento AS "tipoIntervento", giorni,
         cliente, appezzamento, resa, varieta,
         n1, n2, n3, n4, n5,
         media, ottimale, discostamento, dose,
         created_at AS "createdAt"
       FROM osservazioni
       ORDER BY created_at DESC`
    );
    // Cast numeric strings back to numbers
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
         (id, data, data_trapianto, tipo_intervento, giorni,
          cliente, appezzamento, resa, varieta,
          n1, n2, n3, n4, n5,
          media, ottimale, discostamento, dose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         data=$2, data_trapianto=$3, tipo_intervento=$4, giorni=$5,
         cliente=$6, appezzamento=$7, resa=$8, varieta=$9,
         n1=$10, n2=$11, n3=$12, n4=$13, n5=$14,
         media=$15, ottimale=$16, discostamento=$17, dose=$18`,
      [
        o.id, o.data, o.dataTrapianto || null, o.tipoIntervento, o.giorni,
        o.cliente, o.appezzamento, o.resa, o.varieta,
        o.n1, o.n2, o.n3, o.n4, o.n5,
        o.media, o.ottimale, o.discostamento, o.dose,
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

export default router;
