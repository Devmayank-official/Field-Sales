import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import fridgesRouter from "./fridges";
import visitsRouter from "./visits";
import remindersRouter from "./reminders";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(fridgesRouter);
router.use(visitsRouter);
router.use(remindersRouter);
router.use(syncRouter);

export default router;
