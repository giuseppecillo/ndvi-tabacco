import { Router } from "express";
import { GetCropCatalogueResponse } from "@workspace/api-zod";
import { cropCatalogue as snapshot } from "@workspace/crop-calculations";
import { requireAccount, requirePrivacyAck, requireSubscription } from "../middlewares/access";
import {operationalCatalogue} from "../lib/catalogue-storage";

// The consulted profiles and the calculation models share one versioned source.
// This response does not query or modify observations or Supabase.
const catalogue = GetCropCatalogueResponse.parse(snapshot);
const router = Router();
router.get("/catalogo-colture", requireAccount, requireSubscription, requirePrivacyAck, async (_req, res) => {
  try {
    await operationalCatalogue();
    res.json(catalogue);
  } catch {
    res.status(503).json({error:"Catalogo temporaneamente non disponibile. Riprova."});
  }
});
export default router;
