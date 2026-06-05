import { Router, type IRouter } from "express";
import healthRouter from "./health";
import osservazioniRouter from "./osservazioni";

const router: IRouter = Router();

router.use(healthRouter);
router.use(osservazioniRouter);

export default router;
