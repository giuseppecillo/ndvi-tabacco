import { Router } from "express";
import { GetCropCatalogueResponse } from "@workspace/api-zod";
import { cropCatalogue as snapshot } from "@workspace/crop-calculations";
import { requireAccount, requirePrivacyAck, requireSubscription } from "../middlewares/access";

// The consulted profiles and the calculation models share one versioned source.
// This response does not query or modify observations or Supabase.
const catalogue = GetCropCatalogueResponse.parse(snapshot);
const router = Router();
router.get("/catalogo-colture", requireAccount, requireSubscription, requirePrivacyAck, (_req, res) => {
  res.json(catalogue);
});
export default router;
