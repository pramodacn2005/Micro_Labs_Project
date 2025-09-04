import { Router } from "express";
import { latest, history, alerts } from "../controllers/vitalsController.js";

const router = Router();

router.get("/latest", latest);
router.get("/history", history);
router.get("/alerts", alerts);

export default router;






