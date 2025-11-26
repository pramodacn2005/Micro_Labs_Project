import express from "express";
import multer from "multer";
import {
  uploadLabReport,
  predictFromLabReport,
  downloadLabReportPdf,
} from "../controllers/labReportController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.LAB_REPORT_MAX_FILE_MB || 10) * 1024 * 1024,
  },
});

router.post("/lab-report/upload", upload.single("file"), uploadLabReport);
router.post("/lab-report/predict", predictFromLabReport);
router.get("/lab-report/pdf/:reportId", downloadLabReportPdf);

export default router;





