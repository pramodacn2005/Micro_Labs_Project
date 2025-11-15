import express from "express";
import { chatWithAssistant } from "../controllers/assistantController.js";
import { performClinicalAssessment } from "../controllers/clinicalAssistantController.js";

const router = express.Router();

router.post("/assistant", chatWithAssistant);
router.post("/clinical-assessment", performClinicalAssessment);

export default router;








