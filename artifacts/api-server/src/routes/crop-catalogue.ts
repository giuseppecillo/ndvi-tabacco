import { Router } from "express";
import { GetCropCatalogueResponse } from "@workspace/api-zod";
import snapshot from "../data/crop-catalogue.json";
import { requireAccount, requirePrivacyAck, requireSubscription } from "../middlewares/access";

// Validate the bundled, read-only selection once. No calculation catalogue,
// observation table or Supabase connection is involved in this data response.
const catalogue = GetCropCatalogueResponse.parse(snapshot);
const router = Router();
router.get("/catalogo-colture", requireAccount, requireSubscription, requirePrivacyAck, (_req, res) => {
  res.json(catalogue);
});
export default router;
