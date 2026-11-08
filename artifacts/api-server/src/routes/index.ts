import { Router, type IRouter } from "express";
import healthRouter from "./health";
import osservazioniRouter from "./osservazioni";
import securityRouter from "./security";
import cropCatalogueRouter from "./crop-catalogue";
import plansRouter from "./plans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(securityRouter);
router.use(osservazioniRouter);
router.use(cropCatalogueRouter);
router.use(plansRouter);

export default router;
