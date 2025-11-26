import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { v4 as uuid } from "uuid";
import { encryptBuffer } from "../utils/encryption.js";
import { readReportBuffer } from "./pdfReportService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, "..", "storage", "reports");

const LAB_VALUE_LABELS = {
  wbc_count: "WBC count (cells/µL)",
  rbc_count: "RBC count (millions/µL)",
  platelet_count: "Platelet count (cells/µL)",
  hemoglobin: "Hemoglobin (g/dL)",
  crp: "CRP (mg/L)",
  esr: "ESR (mm/hr)",
  neutrophils: "Neutrophils (%)",
  lymphocytes: "Lymphocytes (%)",
  temperature_c: "Temperature (°C)",
  spo2: "SpO₂ (%)",
  heart_rate_bpm: "Heart rate (bpm)",
};

function drawLabelValue(doc, label, value, y) {
  doc.font("Helvetica").fontSize(10).fillColor("#374151").text(label, 60, y);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(value ?? "N/A", 260, y);
  return y + 16;
}

export async function generateLabReportPdf({
  sessionId,
  patient,
  labValues,
  prediction,
  medications,
  warnings,
  markers,
}) {
  await fs.ensureDir(reportsDir);
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const bufferPromise = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text("Upload Lab Report – AI Fever Analysis");
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text("This report summarizes extracted laboratory findings and AI-generated fever analysis. Always confirm with a clinician.");

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Patient Details", { underline: true });
  let y = doc.y + 10;
  y = drawLabelValue(doc, "Name", patient?.name || "Patient", y);
  y = drawLabelValue(doc, "Age", patient?.age ? `${patient.age} yrs` : "N/A", y);
  y = drawLabelValue(doc, "Gender", patient?.gender || "N/A", y);
  y = drawLabelValue(doc, "Report Date", currentDate, y);
  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Extracted Lab Values", { underline: true });
  doc.moveDown(0.4);

  const entries = Object.entries(LAB_VALUE_LABELS);
  let labY = doc.y;
  entries.forEach(([key, label]) => {
    labY = drawLabelValue(doc, label, labValues?.[key] ?? "—", labY);
  });
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("AI Fever Prediction", { underline: true });
  doc.moveDown(0.4);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#111827")
    .text(
      `${prediction?.fever_type || "Unknown"} – ${Math.round((prediction?.confidence || 0) * 100)}% confidence`
    );
  if (prediction?.explanation) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(prediction.explanation, { width: 480 });
  }

  if (markers?.length) {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Detected report markers:");
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#4b5563")
      .text(markers.join(", "), { width: 480 });
  }

  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Medication & Care Guidance", { underline: true });
  doc.moveDown(0.4);
  if (Array.isArray(medications) && medications.length) {
    medications.forEach((med) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(med.name);
      doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(med.guidance || "Guidance unavailable");
      if (med.dosage) {
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`Dose: ${med.dosage}`);
      }
      const tags = [
        med.clinicianVerified ? "Clinician-verified" : "Pending verification",
        med.interval ? `Interval: ${med.interval}` : "",
        med.emergency ? "Emergency use" : "",
      ]
        .filter(Boolean)
        .join(" • ");
      if (tags) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#059669")
          .text(tags);
      }
      if (med.caution?.length) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#b45309")
          .text(`Caution: ${med.caution.join(", ")}`);
      }
      doc.moveDown(0.4);
    });
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text("No OTC medication suggestions were generated.");
  }

  if (warnings?.length) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#b91c1c").text("Warnings & Escalation");
    warnings.forEach((warning) => {
      doc.font("Helvetica").fontSize(10).fillColor("#b91c1c").text(`• ${warning}`, { width: 480 });
    });
  }

  doc.moveDown(1.2);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6b7280")
    .text(
      "This is AI-assisted guidance, not a medical diagnosis. Seek emergency care if symptoms worsen, temperature exceeds 39°C, or as directed by your clinician."
    );

  doc.moveDown(0.4);
  doc.text(`Session ID: ${sessionId}`, { align: "center" });
  doc.end();

  const pdfBuffer = await bufferPromise;
  const encrypted = encryptBuffer(pdfBuffer);
  const reportId = `lab_${uuid().replace(/-/g, "")}`;
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const fileName = `lab-report_${sessionId}_${timestamp}.pdf.enc`;
  const filePath = path.join(reportsDir, fileName);
  await fs.writeFile(filePath, encrypted);

  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const pdfUrl = `${baseUrl}/api/lab-report/pdf/${reportId}?sessionId=${sessionId}`;

  return {
    reportId,
    fileName,
    filePath,
    pdfUrl,
  };
}

export { readReportBuffer };





