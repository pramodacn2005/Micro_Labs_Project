import express from "express";
import {
  runFeverCheck,
  downloadReport,
  sendAssistantMessage,
  handleModelTrain,
} from "../controllers/feverController.js";

const router = express.Router();

router.post("/fever-check", runFeverCheck);
router.get("/reports/:reportId", downloadReport);
router.post("/ai-assistant/:sessionId/message", sendAssistantMessage);
router.post("/model/train", handleModelTrain);

export default router;












