import { Router, type IRouter } from "express";
import healthRouter from "./health";
import osservazioniRouter from "./osservazioni";
import securityRouter from "./security";

const router: IRouter = Router();

router.use(healthRouter);
router.use(securityRouter);
router.use(osservazioniRouter);

export default router;
