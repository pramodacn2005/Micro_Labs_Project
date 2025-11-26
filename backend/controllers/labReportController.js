import { v4 as uuid } from "uuid";
import { extractLabReportText } from "../services/labReportOcrService.js";
import { parseLabReport } from "../services/labReportParserService.js";
import {
  saveLabUpload,
  getLabUpload,
  deleteLabUpload,
} from "../store/labReportUploadStore.js";
import { labReportPredictSchema } from "../utils/validationSchemas.js";
import { predictLabReportModel } from "../services/labReportModelService.js";
import { getMedicationsForFeverType } from "../services/medicationService.js";
import { generateLabReportPdf, readReportBuffer } from "../services/labReportPdfService.js";
import { saveSession, getSession } from "../store/feverSessionStore.js";

const LAB_VALUE_KEYS = [
  "wbc_count",
  "rbc_count",
  "platelet_count",
  "hemoglobin",
  "crp",
  "esr",
  "neutrophils",
  "lymphocytes",
  "temperature_c",
  "spo2",
  "heart_rate_bpm",
];

function normalizeLabValues(values = {}) {
  const normalized = {};
  LAB_VALUE_KEYS.forEach((key) => {
    const value = values[key];
    if (value == null || value === "") {
      normalized[key] = null;
    } else if (typeof value === "number") {
      normalized[key] = Number(value.toFixed(2));
    } else {
      const parsed = Number(parseFloat(String(value).replace(/[^\d.-]/g, "")));
      normalized[key] = Number.isNaN(parsed) ? null : Number(parsed.toFixed(2));
    }
  });
  return normalized;
}

function computeSeverity(labValues, confidence = 0.5) {
  let score = 0;
  if (labValues.temperature_c && labValues.temperature_c >= 39) score += 30;
  if (labValues.wbc_count && labValues.wbc_count >= 12000) score += 20;
  if (labValues.wbc_count && labValues.wbc_count <= 3500) score += 20;
  if (labValues.platelet_count && labValues.platelet_count <= 150000) score += 25;
  if (labValues.spo2 && labValues.spo2 < 92) score += 20;
  if (labValues.heart_rate_bpm && labValues.heart_rate_bpm > 110) score += 10;
  score += Math.round(confidence * 20);

  let badge = "green";
  let label = "Normal";
  let recommendation = "Continue monitoring at home.";
  if (score >= 70) {
    badge = "red";
    label = "Severe";
    recommendation = "Consult a doctor immediately or visit the emergency department.";
  } else if (score >= 50) {
    badge = "orange";
    label = "Moderate";
    recommendation = "Urgent medical review recommended within 6 hours.";
  } else if (score >= 30) {
    badge = "yellow";
    label = "Mild";
    recommendation = "Watch closely and consult a clinician if symptoms worsen.";
  }

  return {
    badge,
    label,
    score,
    recommendation,
  };
}

function buildSafetyWarnings({ severity, medications, feverType }) {
  const warnings = new Set();
  warnings.add("This is AI-assisted guidance, not a medical diagnosis.");
  if (severity.badge === "red") {
    warnings.add("Escalate to emergency services if fever persists beyond 24 hours.");
  }
  if (feverType === "Dengue") {
    warnings.add("Avoid NSAIDs such as ibuprofen in suspected Dengue cases.");
  }
  if (feverType === "Malaria" || feverType === "Typhoid") {
    warnings.add("Seek a clinician-prescribed antimicrobial regimen.");
  }
  if (medications.some((med) => med.emergency)) {
    warnings.add("Follow maximum daily dose limits printed on medication packaging.");
  }
  return Array.from(warnings);
}

export async function uploadLabReport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload a PDF or image lab report." });
    }
    
    console.log("[LabReport] Starting OCR extraction for file:", req.file.originalname, "Type:", req.file.mimetype, "Size:", req.file.size);
    const ocrResult = await extractLabReportText(req.file);
    console.log("[LabReport] OCR completed. Provider:", ocrResult.provider, "Text length:", ocrResult.text?.length || 0);
    console.log("[LabReport] OCR text preview (first 500 chars):", ocrResult.text?.slice(0, 500));
    console.log("[LabReport] OCR rows extracted:", ocrResult.rows?.length || 0);
    
    const parsed = parseLabReport({ text: ocrResult.text, rows: ocrResult.rows });
    const extractedCount = Object.values(parsed.values).filter(v => v != null).length;
    console.log("[LabReport] Parsed values. Extracted:", extractedCount, "out of", Object.keys(parsed.values).length, "fields");
    console.log("[LabReport] Extracted values:", Object.entries(parsed.values).filter(([k, v]) => v != null).map(([k, v]) => `${k}=${v}`).join(", "));
    console.log("[LabReport] Detected markers:", parsed.detectedMarkers);

    const uploadId = uuid();
    await saveLabUpload(uploadId, {
      id: uploadId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      provider: ocrResult.provider,
      extractedText: ocrResult.text,
      parsedValues: parsed.values,
      detectedMarkers: parsed.detectedMarkers,
      tableRows: parsed.tableRows,
      createdAt: new Date().toISOString(),
    });

    const response = {
      uploadId,
      provider: ocrResult.provider,
      file: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      },
      structured_values: parsed.values,
      detected_markers: parsed.detectedMarkers,
      table_rows: parsed.tableRows,
      warnings: ocrResult.warnings || [],
      text_preview: parsed.textPreview?.slice(0, 500), // Limit preview size
    };
    
    console.log("[LabReport] Upload successful. UploadId:", uploadId, "Extracted values:", extractedCount);
    return res.json(response);
  } catch (error) {
    console.error("[LabReport] Upload failed", error);
    console.error("[LabReport] Error stack:", error.stack);
    return res.status(500).json({ message: "Unable to extract lab report", detail: error.message });
  }
}

export async function predictFromLabReport(req, res) {
  const validation = labReportPredictSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ message: "Invalid payload", errors: validation.error.flatten() });
  }

  const { uploadId, patient, vitals, overrides } = validation.data;
  const upload = await getLabUpload(uploadId);
  if (!upload) {
    return res.status(404).json({ message: "Upload not found or expired." });
  }

  const mergedValues = {
    ...upload.parsedValues,
    ...(overrides?.lab_values || {}),
    ...(vitals || {}),
  };
  const labValues = normalizeLabValues(mergedValues);

  try {
    const modelResult = await predictLabReportModel({
      patient,
      lab_values: labValues,
      markers: upload.detectedMarkers,
    });

    const severity = computeSeverity(labValues, modelResult?.confidence);
    const medicationPlan = getMedicationsForFeverType({
      feverType: modelResult?.fever_type,
      age: patient.age,
    });
    const warnings = buildSafetyWarnings({
      severity,
      medications: medicationPlan.medications,
      feverType: modelResult?.fever_type,
    });

    const sessionId = uuid();
    const pdfMetadata = await generateLabReportPdf({
      sessionId,
      patient,
      labValues,
      prediction: modelResult,
      medications: medicationPlan.medications,
      warnings,
      markers: upload.detectedMarkers,
    });

    await saveSession(sessionId, {
      sessionId,
      type: "lab-report",
      uploadId,
      reportId: pdfMetadata.reportId,
      reportPath: pdfMetadata.filePath,
      inputs: {
        ...patient,
        labValues,
        detectedMarkers: upload.detectedMarkers,
      },
      prediction: {
        label: modelResult?.fever_type,
        probability: modelResult?.confidence,
        severity: severity.label,
      },
      labReport: {
        labValues,
        severity,
        markers: upload.detectedMarkers,
      },
      medications: medicationPlan.medications,
      suggestions: {
        medications: medicationPlan.medications,
        precautions: medicationPlan.precautions,
        dietPlan: medicationPlan.dietPlan,
      },
      warnings,
      assistantHistory: [],
    });

    // Clean up upload cache after prediction to avoid storing large blobs
    await deleteLabUpload(uploadId);

    return res.json({
      session_id: sessionId,
      upload_id: uploadId,
      prediction: modelResult,
      severity,
      lab_values: labValues,
      detected_markers: upload.detectedMarkers,
      medications: medicationPlan.medications,
      warnings,
      pdf_report_url: pdfMetadata.pdfUrl,
      assistant_session_id: sessionId,
      doctor_recommendation_route: "/doctor-list",
      precautions: medicationPlan.precautions,
      diet_plan: medicationPlan.dietPlan,
    });
  } catch (error) {
    console.error("[LabReport] Prediction failed", error);
    return res.status(500).json({ message: "Unable to run lab report prediction", detail: error.message });
  }
}

export async function downloadLabReportPdf(req, res) {
  const { reportId } = req.params;
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }
  const session = await getSession(sessionId);
  if (!session || session.reportId !== reportId || session.type !== "lab-report") {
    return res.status(404).json({ message: "Report not found" });
  }
  try {
    const buffer = await readReportBuffer(session.reportPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"lab-report_${session.sessionId || sessionId}.pdf\"`);
    return res.send(buffer);
  } catch (error) {
    console.error("[LabReport] Unable to read report", error);
    return res.status(500).json({ message: "Unable to read report" });
  }
}


