import { Router, type IRouter } from "express";
import healthRouter from "./health";
import osservazioniRouter from "./osservazioni";
import securityRouter from "./security";
import cropCatalogueRouter from "./crop-catalogue";

const router: IRouter = Router();

router.use(healthRouter);
router.use(securityRouter);
router.use(osservazioniRouter);
router.use(cropCatalogueRouter);

export default router;
