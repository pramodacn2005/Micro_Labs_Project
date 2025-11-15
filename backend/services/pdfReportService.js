import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { v4 as uuid } from "uuid";
import { encryptBuffer, decryptBuffer } from "../utils/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, "..", "storage", "reports");

// Clinic/Doctor Information (can be configured via env vars)
const CLINIC_NAME = process.env.CLINIC_NAME || "HealthCare Medical Center";
const DOCTOR_NAME = process.env.DOCTOR_NAME || "Dr. AI Assistant";
const DOCTOR_QUALIFICATION = process.env.DOCTOR_QUALIFICATION || "MBBS, MD";
const DOCTOR_REG_NO = process.env.DOCTOR_REG_NO || "REG-XXXXX";
const CLINIC_ADDRESS = process.env.CLINIC_ADDRESS || "123 Medical Street, City, State 12345";
const CLINIC_PHONE = process.env.CLINIC_PHONE || "+1 (555) 123-4567";

function drawRxSymbol(doc, x, y) {
  // Draw the classic Rx symbol
  const size = 40;
  doc
    .fontSize(size)
    .fillColor("#000000")
    .text("℞", x, y);
  return size;
}

function drawTableRow(doc, label, value, startX, startY, labelWidth = 100) {
  doc
    .fontSize(10)
    .fillColor("#4b5563")
    .text(label, startX, startY, { width: labelWidth });
  
  const valueX = startX + labelWidth + 10;
  doc
    .fillColor("#111827")
    .text(value || "N/A", valueX, startY, { width: 300 });
  
  return startY + 15;
}

export async function generateFeverReport({
  sessionId,
  baseUrl,
  userInputs,
  prediction,
  explainability,
  suggestions,
  hospitals,
  dietPlan,
}) {
  await fs.ensureDir(reportsDir);
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const bufferPromise = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ========== HEADER SECTION ==========
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827");
  doc.text(CLINIC_NAME, { align: "center" });
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
  doc.text(`${DOCTOR_NAME}, ${DOCTOR_QUALIFICATION}`, { align: "center" });
  doc.text(`Registration No: ${DOCTOR_REG_NO}`, { align: "center" });
  doc.moveDown(0.2);

  doc.fontSize(9).text(CLINIC_ADDRESS, { align: "center" });
  doc.text(`Phone: ${CLINIC_PHONE}`, { align: "center" });
  
  // Horizontal line after header
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#000000", 0.5);
  doc.moveDown(1);

  // ========== PATIENT SECTION ==========
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
  doc.text("Patient Details:", 50, doc.y);
  
  let currentY = doc.y + 20;
  const leftMargin = 50;
  const labelWidth = 80;

  currentY = drawTableRow(doc, "Name:", "Patient", leftMargin, currentY, labelWidth);
  currentY = drawTableRow(doc, "Age:", `${userInputs.age} years`, leftMargin, currentY, labelWidth);
  currentY = drawTableRow(doc, "Gender:", userInputs.gender || "N/A", leftMargin, currentY, labelWidth);
  currentY = drawTableRow(doc, "Date:", currentDate, leftMargin, currentY, labelWidth);

  doc.y = currentY + 10;
  doc.moveDown(1);

  // ========== Rx SYMBOL ==========
  const rxX = 50;
  const rxY = doc.y;
  drawRxSymbol(doc, rxX, rxY);
  doc.y = rxY + 50;
  doc.moveDown(0.5);

  // ========== PROVISIONAL DIAGNOSIS SECTION ==========
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Provisional Diagnosis:", 50, doc.y);
  doc.moveDown(0.4);

  const probPercent = prediction?.probability ? Math.round(prediction.probability * 100) : 0;
  const diagnosisText = `${prediction?.label || "Fever"} – ${probPercent}% (${prediction?.severity || "Unknown"})`;
  
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
  doc.text(diagnosisText, 60, doc.y);
  doc.moveDown(1);

  // ========== VITALS SECTION ==========
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Vital Signs:", 50, doc.y);
  doc.moveDown(0.4);

  const vitalsStartY = doc.y;
  let vitalsY = vitalsStartY;
  const vitalsLeftMargin = 60;
  const vitalsLabelWidth = 120;

  vitalsY = drawTableRow(
    doc,
    "Temperature:",
    userInputs.temperature_c ? `${userInputs.temperature_c} °C` : "N/A",
    vitalsLeftMargin,
    vitalsY,
    vitalsLabelWidth
  );
  vitalsY = drawTableRow(
    doc,
    "Heart Rate:",
    userInputs.heart_rate_bpm ? `${userInputs.heart_rate_bpm} bpm` : "N/A",
    vitalsLeftMargin,
    vitalsY,
    vitalsLabelWidth
  );
  vitalsY = drawTableRow(
    doc,
    "Respiratory Rate:",
    userInputs.respiratory_rate_bpm ? `${userInputs.respiratory_rate_bpm} /min` : "N/A",
    vitalsLeftMargin,
    vitalsY,
    vitalsLabelWidth
  );
  vitalsY = drawTableRow(
    doc,
    "SpO₂:",
    userInputs.spo2 ? `${userInputs.spo2}%` : "N/A",
    vitalsLeftMargin,
    vitalsY,
    vitalsLabelWidth
  );
  vitalsY = drawTableRow(
    doc,
    "BP:",
    userInputs.bp_systolic && userInputs.bp_diastolic
      ? `${userInputs.bp_systolic}/${userInputs.bp_diastolic} mmHg`
      : "N/A",
    vitalsLeftMargin,
    vitalsY,
    vitalsLabelWidth
  );

  doc.y = vitalsY;
  doc.moveDown(1);

  // ========== MEDICATION SECTION ==========
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Medication:", 50, doc.y);
  doc.moveDown(0.5);

  const medStartY = doc.y;
  let medY = medStartY;
  const medLeftMargin = 60;

  if (suggestions?.medications && suggestions.medications.length > 0) {
    suggestions.medications.forEach((med) => {
      // Draw checkbox (square)
      doc.rect(medLeftMargin, medY, 8, 8).stroke("#000000", 0.5);
      
      // Build medication text
      let medText = "";
      
      // Determine medication type prefix
      if (med.name.toLowerCase().includes("ors") || med.name.toLowerCase().includes("rehydration")) {
        medText = med.name;
      } else {
        medText = `Tab ${med.name}`;
      }
      
      // Extract and add dosage
      if (med.dosage) {
        // Try to extract dosage from dosage field
        const dosageMatch = med.dosage.match(/(\d+[\-\s]*\d*)\s*(mg|g|ml)/i);
        if (dosageMatch) {
          medText += ` ${dosageMatch[1]} ${dosageMatch[2]}`;
        } else {
          // Try from guidance
          const guidanceDosage = med.guidance?.match(/(\d+[\-\s]*\d*)\s*(mg|g|ml)/i);
          if (guidanceDosage) {
            medText += ` ${guidanceDosage[1]} ${guidanceDosage[2]}`;
          }
        }
      } else if (med.guidance) {
        // Fallback: extract from guidance
        const guidanceDosage = med.guidance.match(/(\d+[\-\s]*\d*)\s*(mg|g|ml)/i);
        if (guidanceDosage) {
          medText += ` ${guidanceDosage[1]} ${guidanceDosage[2]}`;
        }
      }
      
      // Add frequency/interval
      let frequency = "";
      if (med.interval) {
        frequency = med.interval;
      } else if (med.guidance) {
        // Extract frequency patterns
        const freqPatterns = [
          /every\s+(\d+[\-\s]*\d*)\s+hours?/i,
          /(\d+)\s+times?\s+(daily|per day|a day)/i,
          /once|twice|thrice/i,
        ];
        for (const pattern of freqPatterns) {
          const match = med.guidance.match(pattern);
          if (match) {
            frequency = match[0];
            break;
          }
        }
      }
      
      if (frequency) {
        medText += ` – ${frequency}`;
      } else {
        medText += " – as directed";
      }
      
      // Add max dosage if available
      if (med.guidance) {
        const maxMatch = med.guidance.match(/max\s+(\d+\s*(g|mg)\/day)/i);
        if (maxMatch) {
          medText += ` (${maxMatch[1]})`;
        }
      }

      doc.font("Helvetica").fontSize(10).fillColor("#111827");
      doc.text(medText, medLeftMargin + 12, medY - 2);
      
      medY += 18;
    });
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
    doc.text("No medications suggested. Please consult with a physician.", medLeftMargin, medY);
    medY += 15;
  }

  doc.y = medY;
  doc.moveDown(1);

  // ========== ADVICE AND INSTRUCTIONS SECTION ==========
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Advice and Instructions:", 50, doc.y);
  doc.moveDown(0.5);

  const adviceStartY = doc.y;
  let adviceY = adviceStartY;
  const adviceLeftMargin = 60;

  // Combine precautions and diet plan into advice
  const allAdvice = [];
  
  if (suggestions?.precautions) {
    suggestions.precautions.forEach((item) => {
      // Clean up and shorten advice items
      const cleanItem = item.replace(/^[0-9]+\.\s*/, "").trim();
      if (cleanItem) {
        allAdvice.push(cleanItem);
      }
    });
  }

  if (suggestions?.dietPlan) {
    suggestions.dietPlan.forEach((item) => {
      const cleanItem = item.replace(/^[•\-\*]\s*/, "").trim();
      if (cleanItem) {
        allAdvice.push(cleanItem);
      }
    });
  }

  // Add common advice items
  if (allAdvice.length === 0) {
    allAdvice.push("Hydrate well with water and electrolyte solutions");
    allAdvice.push("Rest adequately and monitor symptoms twice daily");
    allAdvice.push("Visit doctor if symptoms persist beyond 24 hours");
    allAdvice.push("Avoid self-medication beyond recommended doses");
  }

  allAdvice.forEach((item) => {
    doc.font("Helvetica").fontSize(10).fillColor("#111827");
    doc.text(`• ${item}`, adviceLeftMargin, adviceY);
    adviceY += 15;
  });

  doc.y = adviceY;
  doc.moveDown(2);

  // ========== SIGNATURE SECTION ==========
  const signatureY = doc.y;
  doc.font("Helvetica").fontSize(10).fillColor("#111827");
  
  // Signature line
  doc.moveTo(50, signatureY + 5).lineTo(200, signatureY + 5).stroke("#000000", 0.5);
  doc.text(DOCTOR_NAME, 50, signatureY + 8);
  doc.fontSize(9).fillColor("#4b5563");
  doc.text(DOCTOR_QUALIFICATION, 50, signatureY + 18);

  doc.moveDown(1.5);

  // ========== FOOTER/DISCLAIMER ==========
  doc.fontSize(8).fillColor("#6b7280");
  doc.text(
    "This is an AI-assisted report. Consult a licensed physician for proper medical evaluation and treatment.",
    { align: "center", width: 495 }
  );

  doc.moveDown(0.5);
  doc.fontSize(7).fillColor("#9ca3af");
  doc.text(
    `Report ID: ${sessionId} | Generated: ${currentDate}`,
    { align: "center" }
  );

  doc.end();
  const pdfBuffer = await bufferPromise;
  const encryptedBuffer = encryptBuffer(pdfBuffer);
  const reportId = `report_${uuid().replace(/-/g, "")}`;
  const timestampLabel = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const fileName = `fever-check_${sessionId}_${timestampLabel}.pdf.enc`;
  const filePath = path.join(reportsDir, fileName);
  await fs.writeFile(filePath, encryptedBuffer);

  const urlBase =
    baseUrl || process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const pdfUrl = `${urlBase}/api/reports/${reportId}?sessionId=${sessionId}`;

  return {
    reportId,
    filePath,
    fileName,
    pdfUrl,
  };
}

export async function readReportBuffer(filePath) {
  const encrypted = await fs.readFile(filePath);
  return decryptBuffer(encrypted);
}
