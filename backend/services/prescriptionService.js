// Prescription service for creating, validating, and sending prescriptions
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { v4 as uuid } from "uuid";
import { db } from "./firebaseAdminService.js";
import { sendSMS } from "./alertService.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prescriptionsDir = path.resolve(__dirname, "..", "storage", "prescriptions");

// Ensure prescriptions directory exists (called on first use)
let dirEnsured = false;
async function ensurePrescriptionsDir() {
  if (!dirEnsured) {
    await fs.ensureDir(prescriptionsDir);
    dirEnsured = true;
  }
}

// Drug interaction database (simplified - in production, use a comprehensive drug interaction API)
const DRUG_INTERACTIONS = {
  "paracetamol": { "aspirin": "minor", "warfarin": "minor" },
  "ibuprofen": { "aspirin": "major", "warfarin": "major", "lithium": "major" },
  "aspirin": { "ibuprofen": "major", "warfarin": "major", "methotrexate": "major" },
  "warfarin": { "aspirin": "major", "ibuprofen": "major", "paracetamol": "minor" },
};

// Controlled substances list (simplified - expand based on local regulations)
const CONTROLLED_SUBSTANCES = [
  "morphine", "codeine", "oxycodone", "hydrocodone", "fentanyl", 
  "diazepam", "alprazolam", "lorazepam", "temazepam",
  "methylphenidate", "amphetamine", "dextroamphetamine"
];

// Create email transporter
const createEmailTransporter = () => {
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const emailTransporter = createEmailTransporter();

/**
 * Validate prescription input
 */
function validatePrescription(doctor, patient, prescription_input) {
  const errors = [];

  // Validate required fields
  if (!doctor?.id) errors.push("doctor.id is required");
  if (!doctor?.name) errors.push("doctor.name is required");
  if (!doctor?.license_number) errors.push("doctor.license_number is required");
  if (!patient?.id) errors.push("patient.id is required");
  if (!patient?.name) errors.push("patient.name is required");
  
  // Validate medications
  if (!prescription_input?.medications || !Array.isArray(prescription_input.medications) || prescription_input.medications.length === 0) {
    errors.push("At least one medication is required");
  } else {
    prescription_input.medications.forEach((med, index) => {
      if (!med.name || !med.name.trim()) {
        errors.push(`Medication ${index + 1}: name is required`);
      }
      if (!med.dose || !med.dose.trim()) {
        errors.push(`Medication ${index + 1}: dose is required`);
      }
    });
  }

  return errors;
}

/**
 * Check for allergy conflicts
 */
function checkAllergies(medications, patient) {
  const allergies = (patient.known_allergies || []).map(a => a.toLowerCase());
  const conflicts = [];

  medications.forEach((med, index) => {
    const medNameLower = med.name.toLowerCase();
    const hasConflict = allergies.some(allergy => 
      medNameLower.includes(allergy.toLowerCase()) || 
      allergy.toLowerCase().includes(medNameLower)
    );
    
    if (hasConflict) {
      conflicts.push({
        medication_index: index,
        medication_name: med.name,
        allergy: allergies.find(a => 
          medNameLower.includes(a.toLowerCase()) || 
          a.toLowerCase().includes(medNameLower)
        )
      });
    }
  });

  return conflicts;
}

/**
 * Check for drug interactions
 */
function checkDrugInteractions(medications) {
  const interactions = [];
  const medNames = medications.map(m => m.name.toLowerCase());

  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const med1 = medNames[i];
      const med2 = medNames[j];
      
      // Check both directions
      const interaction1 = DRUG_INTERACTIONS[med1]?.[med2];
      const interaction2 = DRUG_INTERACTIONS[med2]?.[med1];
      const interaction = interaction1 || interaction2;

      if (interaction) {
        interactions.push({
          medication1: medications[i].name,
          medication2: medications[j].name,
          severity: interaction,
          medication1_index: i,
          medication2_index: j
        });
      }
      // Note: We don't mark as "unknown" for all pairs - only flag known interactions
      // In production, integrate with a comprehensive drug interaction API
    }
  }

  return interactions;
}

/**
 * Check pediatric dosing
 */
function checkPediatricDosing(medications, patient) {
  const warnings = [];
  const ageInMonths = patient.age * 12; // Assuming age is in years

  if (ageInMonths < 2) {
    warnings.push({
      type: "needs_pediatric_review",
      reason: "Patient is less than 2 months old",
      age_months: ageInMonths
    });
  }

  // Check for high doses relative to age
  medications.forEach((med, index) => {
    if (med.strength_mg && patient.age < 12) {
      // Simple heuristic: flag if strength seems high for age
      const strengthPerKg = med.strength_mg / (patient.age * 3); // Rough weight estimate
      if (strengthPerKg > 20) { // Threshold - adjust based on clinical guidelines
        warnings.push({
          type: "high_dose_for_age",
          medication_index: index,
          medication_name: med.name,
          strength_mg: med.strength_mg,
          patient_age: patient.age
        });
      }
    }
  });

  return warnings;
}

/**
 * Check for controlled substances
 */
function checkControlledSubstances(medications) {
  const controlled = [];

  medications.forEach((med, index) => {
    const medNameLower = med.name.toLowerCase();
    const isControlled = CONTROLLED_SUBSTANCES.some(controlled => 
      medNameLower.includes(controlled.toLowerCase()) || 
      controlled.toLowerCase().includes(medNameLower)
    );

    if (isControlled) {
      controlled.push({
        medication_index: index,
        medication_name: med.name
      });
    }
  });

  return controlled;
}

/**
 * Generate prescription PDF
 */
async function generatePrescriptionPDF(doctor, patient, prescription_input, prescription_id, baseUrl) {
  await ensurePrescriptionsDir();
  
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
  const timestamp = new Date().toISOString();

  // ========== HEADER SECTION ==========
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827");
  doc.text(doctor.clinic_name || "Medical Clinic", { align: "center" });
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
  doc.text(doctor.clinic_address || "", { align: "center" });
  doc.text(`Phone: ${doctor.clinic_phone || ""}`, { align: "center" });
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(`Dr. ${doctor.name}`, { align: "center" });
  doc.font("Helvetica").fontSize(10);
  doc.text(`License No: ${doctor.license_number}`, { align: "center" });
  
  // Horizontal line
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#000000", 0.5);
  doc.moveDown(1);

  // ========== PATIENT SECTION ==========
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
  doc.text("Patient Information:", 50, doc.y);
  
  let currentY = doc.y + 20;
  const leftMargin = 50;
  const labelWidth = 100;

  currentY = drawTableRow(doc, "Name:", patient.name, leftMargin, currentY, labelWidth);
  currentY = drawTableRow(doc, "Age:", `${patient.age} years`, leftMargin, currentY, labelWidth);
  currentY = drawTableRow(doc, "Gender:", patient.gender || "N/A", leftMargin, currentY, labelWidth);
  if (patient.address) {
    currentY = drawTableRow(doc, "Address:", patient.address, leftMargin, currentY, labelWidth);
  }
  if (patient.phone) {
    currentY = drawTableRow(doc, "Phone:", patient.phone, leftMargin, currentY, labelWidth);
  }
  if (patient.email) {
    currentY = drawTableRow(doc, "Email:", patient.email, leftMargin, currentY, labelWidth);
  }
  if (patient.known_allergies && patient.known_allergies.length > 0) {
    currentY = drawTableRow(doc, "Allergies:", patient.known_allergies.join(", "), leftMargin, currentY, labelWidth);
  }
  currentY = drawTableRow(doc, "Date:", currentDate, leftMargin, currentY, labelWidth);

  doc.y = currentY + 10;
  doc.moveDown(1);

  // ========== Rx SYMBOL ==========
  const rxX = 50;
  const rxY = doc.y;
  doc.fontSize(40).fillColor("#000000").text("℞", rxX, rxY);
  doc.y = rxY + 50;
  doc.moveDown(0.5);

  // ========== PRESCRIPTION TABLE ==========
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
  doc.text("Prescription:", 50, doc.y);
  doc.moveDown(0.5);

  // Table header
  const tableStartY = doc.y;
  const colWidths = [120, 60, 60, 80, 100, 50, 50, 100];
  const headers = ["Medication", "Strength", "Form", "Dose", "Frequency", "Route", "When", "Duration"];
  
  let headerY = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
  let xPos = 50;
  headers.forEach((header, i) => {
    doc.text(header, xPos, headerY, { width: colWidths[i] });
    xPos += colWidths[i] + 5;
  });

  // Table rows
  let rowY = headerY + 20;
  doc.font("Helvetica").fontSize(8).fillColor("#111827");
  
  prescription_input.medications.forEach((med) => {
    if (rowY > 700) { // New page if needed
      doc.addPage();
      rowY = 50;
    }

    const rowData = [
      med.name || "N/A",
      med.strength_mg ? `${med.strength_mg} mg` : "N/A",
      med.form || "N/A",
      med.dose || "N/A",
      med.frequency || "N/A",
      med.route || "N/A",
      med.when || "N/A",
      med.duration_days ? `${med.duration_days} days` : "N/A"
    ];

    xPos = 50;
    rowData.forEach((cell, i) => {
      doc.text(cell, xPos, rowY, { width: colWidths[i], align: "left" });
      xPos += colWidths[i] + 5;
    });

    // Additional instructions if present
    if (med.additional_instructions) {
      rowY += 15;
      doc.font("Helvetica-Oblique").fontSize(7).fillColor("#6b7280");
      doc.text(`Note: ${med.additional_instructions}`, 50, rowY, { width: 500 });
      doc.font("Helvetica").fillColor("#111827");
    }

    rowY += 20;
  });

  doc.y = rowY + 10;
  doc.moveDown(1);

  // ========== ALLERGY WARNINGS ==========
  const allergyConflicts = checkAllergies(prescription_input.medications, patient);
  if (allergyConflicts.length > 0) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#dc2626");
    doc.text("⚠️ ALLERGY WARNINGS:", 50, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#dc2626");
    allergyConflicts.forEach(conflict => {
      doc.text(`• Patient has known allergy to ${conflict.allergy}. Medication ${conflict.medication_name} may cause adverse reaction.`, 60, doc.y);
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
  }

  // ========== NOTES AND INSTRUCTIONS ==========
  if (prescription_input.notes_for_patient) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
    doc.text("Notes for Patient:", 50, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#111827");
    doc.text(prescription_input.notes_for_patient, 60, doc.y, { width: 485 });
    doc.moveDown(1);
  }

  if (prescription_input.clinic_instructions) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
    doc.text("Clinic Instructions:", 50, doc.y);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#111827");
    doc.text(prescription_input.clinic_instructions, 60, doc.y, { width: 485 });
    doc.moveDown(1);
  }

  if (prescription_input.follow_up_date) {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text(`Follow-up Date: ${new Date(prescription_input.follow_up_date).toLocaleDateString()}`, 50, doc.y);
    doc.moveDown(0.5);
  }

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
  doc.text(`Refill Allowed: ${prescription_input.refill_allowed ? "Yes" : "No"}`, 50, doc.y);
  doc.moveDown(1.5);

  // ========== QR CODE PLACEHOLDER ==========
  // In production, use a QR code library like 'qrcode' to generate actual QR code
  const qrUrl = `${baseUrl}/api/prescriptions/${prescription_id}`;
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
  doc.text(`Prescription ID: ${prescription_id}`, 50, doc.y);
  doc.text(`Download URL: ${qrUrl}`, 50, doc.y + 12);

  doc.moveDown(1.5);

  // ========== SIGNATURE SECTION ==========
  const signatureY = doc.y;
  doc.moveTo(50, signatureY + 5).lineTo(200, signatureY + 5).stroke("#000000", 0.5);
  
  // Digital signature (if provided as base64 SVG or text)
  if (doctor.digital_signature) {
    try {
      // If it's base64, decode and embed (simplified - in production use proper image handling)
      doc.font("Helvetica").fontSize(10).fillColor("#111827");
      doc.text("[Digital Signature]", 50, signatureY + 8);
    } catch (e) {
      doc.text(doctor.digital_signature, 50, signatureY + 8);
    }
  }
  
  doc.text(`Dr. ${doctor.name}`, 50, signatureY + 20);
  doc.fontSize(9).fillColor("#4b5563");
  doc.text(`License: ${doctor.license_number}`, 50, signatureY + 30);
  doc.text(`Date: ${currentDate}`, 50, signatureY + 40);

  doc.moveDown(2);

  // ========== FOOTER/DISCLAIMER ==========
  doc.fontSize(8).fillColor("#6b7280");
  doc.text(
    `This prescription was issued electronically by Dr. ${doctor.name}. Contact ${doctor.clinic_phone || "the clinic"} for any clarifications.`,
    { align: "center", width: 495 }
  );
  doc.moveDown(0.5);
  doc.fontSize(7).fillColor("#9ca3af");
  doc.text(
    "This prescription is provided for the named patient and must be used as directed. For emergencies, contact your local emergency services.",
    { align: "center", width: 495 }
  );
  doc.moveDown(0.5);
  doc.text(
    `Prescription ID: ${prescription_id} | Generated: ${timestamp}`,
    { align: "center" }
  );

  doc.end();
  const pdfBuffer = await bufferPromise;

  // Save PDF
  const timestampLabel = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const fileName = `prescription_${patient.id}_${timestampLabel}.pdf`;
  const filePath = path.join(prescriptionsDir, fileName);
  await fs.writeFile(filePath, pdfBuffer);

  const pdfUrl = `${baseUrl}/api/prescriptions/${prescription_id}/download`;

  return {
    filePath,
    fileName,
    pdfUrl,
    pdfBuffer
  };
}

/**
 * Helper function to draw table rows
 */
function drawTableRow(doc, label, value, startX, startY, labelWidth = 100) {
  doc.fontSize(10).fillColor("#4b5563");
  doc.text(label, startX, startY, { width: labelWidth });
  
  const valueX = startX + labelWidth + 10;
  doc.fillColor("#111827");
  doc.text(value || "N/A", valueX, startY, { width: 300 });
  
  return startY + 15;
}

/**
 * Send prescription via email
 */
async function sendPrescriptionEmail(patient, doctor, pdfUrl, prescription_id) {
  if (!emailTransporter) {
    console.log("📧 [SIMULATED EMAIL] Email not configured");
    return { success: true, status: "simulated" };
  }

  if (!patient.email) {
    return { success: false, error: "Patient email not provided" };
  }

  try {
    const subject = `Prescription from Dr. ${doctor.name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1>📋 Your Prescription</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Dear ${patient.name},</p>
          <p>You have received a prescription from <strong>Dr. ${doctor.name}</strong>.</p>
          <p><strong>Download your prescription:</strong> <a href="${pdfUrl}">Click here</a></p>
          <p>If you have any questions, please contact the clinic at ${doctor.clinic_phone || "the provided phone number"}.</p>
          <p><strong>Prescription ID:</strong> ${prescription_id}</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666; background-color: #f8f9fa;">
          <p>This is an automated message from ${doctor.clinic_name || "Medical Clinic"}.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.SMTP_USER,
      to: patient.email,
      subject: subject,
      html: htmlContent
    };

    const result = await emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId, status: "sent" };
  } catch (error) {
    console.error("❌ Failed to send prescription email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send prescription via SMS
 */
async function sendPrescriptionSMS(patient, doctor, pdfUrl, prescription_id) {
  if (!patient.phone) {
    return { success: false, error: "Patient phone not provided" };
  }

  const message = `You have received a prescription from Dr. ${doctor.name}. Download: ${pdfUrl}. Prescription ID: ${prescription_id}. For questions, contact ${doctor.clinic_phone || "the clinic"}.`;

  try {
    const result = await sendSMS(message, patient.phone);
    return { success: true, status: result.status || "sent" };
  } catch (error) {
    console.error("❌ Failed to send prescription SMS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to create and send prescription
 */
export async function createPrescription({
  doctor,
  patient,
  prescription_input,
  send_options,
  require_consent_to_send,
  client_ip
}) {
  const prescription_id = `presc_${uuid().replace(/-/g, "")}`;
  const timestamp = new Date().toISOString();
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

  // Validate input
  const validationErrors = validatePrescription(doctor, patient, prescription_input);
  if (validationErrors.length > 0) {
    return {
      status: "error",
      prescription_id: null,
      pdf_url: null,
      prescription_json: null,
      sent_status: "not_sent",
      sent_via: null,
      sent_timestamp: null,
      audit: {
        created_by: doctor.id,
        created_at: timestamp,
        client_ip: client_ip || null
      },
      errors: validationErrors
    };
  }

  // Check allergies
  const allergyConflicts = checkAllergies(prescription_input.medications, patient);
  const medicationsWithFlags = prescription_input.medications.map((med, index) => {
    const conflict = allergyConflicts.find(c => c.medication_index === index);
    return {
      ...med,
      allergy_conflict: conflict ? true : false
    };
  });

  // Check drug interactions
  const interactions = checkDrugInteractions(prescription_input.medications);
  interactions.forEach(interaction => {
    if (medicationsWithFlags[interaction.medication1_index]) {
      medicationsWithFlags[interaction.medication1_index].interaction_flag = interaction.severity;
    }
    if (medicationsWithFlags[interaction.medication2_index]) {
      medicationsWithFlags[interaction.medication2_index].interaction_flag = interaction.severity;
    }
  });

  // Set default interaction_flag for medications without interactions
  medicationsWithFlags.forEach(med => {
    if (!med.interaction_flag) {
      // Only mark as "none" if we've checked; otherwise leave undefined or mark as "unknown" if needed
      med.interaction_flag = "none";
    }
  });

  // Check pediatric dosing
  const pediatricWarnings = checkPediatricDosing(prescription_input.medications, patient);
  const needsPediatricReview = pediatricWarnings.some(w => w.type === "needs_pediatric_review");

  // Check controlled substances
  const controlledSubstances = checkControlledSubstances(prescription_input.medications);

  // Build prescription JSON
  const prescription_json = {
    doctor: {
      id: doctor.id,
      name: doctor.name,
      license_number: doctor.license_number,
      clinic_name: doctor.clinic_name,
      clinic_address: doctor.clinic_address,
      clinic_phone: doctor.clinic_phone
    },
    patient: {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      address: patient.address,
      phone: patient.phone,
      email: patient.email,
      known_allergies: patient.known_allergies || []
    },
    medications: medicationsWithFlags,
    notes_for_patient: prescription_input.notes_for_patient || null,
    follow_up_date: prescription_input.follow_up_date || null,
    refill_allowed: prescription_input.refill_allowed || false,
    timestamp_issued: timestamp
  };

  // Generate warnings/errors for doctor review
  const warnings = [];
  if (allergyConflicts.length > 0) {
    warnings.push(`Warning: Patient reports allergy to ${allergyConflicts.map(c => c.allergy).join(", ")}. Confirm you want to include these medications.`);
  }
  
  const majorInteractions = interactions.filter(i => i.severity === "major");
  if (majorInteractions.length > 0) {
    majorInteractions.forEach(i => {
      warnings.push(`Major interaction detected between ${i.medication1} and ${i.medication2}. Please revise prescription or confirm override.`);
    });
  }

  if (needsPediatricReview) {
    warnings.push(`Patient is ${patient.age} years old. Pediatric dosing review required. Confirm dosage.`);
  }

  if (controlledSubstances.length > 0) {
    warnings.push(`Controlled substances detected: ${controlledSubstances.map(c => c.medication_name).join(", ")}. Please confirm compliance with local regulations.`);
  }

  // If there are critical warnings, return pending status
  if (warnings.length > 0 && (allergyConflicts.length > 0 || majorInteractions.length > 0)) {
    return {
      status: "pending",
      prescription_id: prescription_id,
      pdf_url: null,
      prescription_json: prescription_json,
      sent_status: "pending_consent",
      sent_via: null,
      sent_timestamp: null,
      audit: {
        created_by: doctor.id,
        created_at: timestamp,
        client_ip: client_ip || null
      },
      errors: warnings
    };
  }

  // Generate PDF (directory will be ensured inside)
  const pdfResult = await generatePrescriptionPDF(doctor, patient, prescription_input, prescription_id, baseUrl);

  // Save to Firestore
  try {
    await db.collection("prescriptions").doc(prescription_id).set({
      prescription_id,
      doctor_id: doctor.id,
      patient_id: patient.id,
      prescription_json,
      pdf_url: pdfResult.pdfUrl,
      pdf_path: pdfResult.filePath,
      created_at: timestamp,
      created_by: doctor.id,
      client_ip: client_ip || null
    });
  } catch (error) {
    console.error("Failed to save prescription to Firestore:", error);
  }

  // Handle sending
  let sent_status = "not_sent";
  let sent_via = null;
  let sent_timestamp = null;

  if (send_options?.send_method && send_options.send_method !== "none") {
    // Check consent if required
    if (require_consent_to_send) {
      const sendTo = send_options.send_to;
      const patientContact = send_options.send_method === "email" ? patient.email : 
                            send_options.send_method === "sms" ? patient.phone : 
                            patient.id;
      
      if (sendTo !== patientContact) {
        sent_status = "pending_consent";
        return {
          status: "pending",
          prescription_id: prescription_id,
          pdf_url: pdfResult.pdfUrl,
          prescription_json: prescription_json,
          sent_status: "pending_consent",
          sent_via: null,
          sent_timestamp: null,
          audit: {
            created_by: doctor.id,
            created_at: timestamp,
            client_ip: client_ip || null
          },
          errors: ["Patient consent required before sending"]
        };
      }
    }

    // Send prescription
    if (send_options.send_method === "email") {
      const emailResult = await sendPrescriptionEmail(patient, doctor, pdfResult.pdfUrl, prescription_id);
      if (emailResult.success) {
        sent_status = "sent";
        sent_via = "email";
        sent_timestamp = new Date().toISOString();
      } else {
        sent_status = "failed";
      }
    } else if (send_options.send_method === "sms") {
      const smsResult = await sendPrescriptionSMS(patient, doctor, pdfResult.pdfUrl, prescription_id);
      if (smsResult.success) {
        sent_status = "sent";
        sent_via = "sms";
        sent_timestamp = new Date().toISOString();
      } else {
        sent_status = "failed";
      }
    } else if (send_options.send_method === "in_app") {
      // In-app notification - just mark as sent
      sent_status = "sent";
      sent_via = "in_app";
      sent_timestamp = new Date().toISOString();
    }
  }

  return {
    status: "success",
    prescription_id: prescription_id,
    pdf_url: pdfResult.pdfUrl,
    prescription_json: prescription_json,
    sent_status: sent_status,
    sent_via: sent_via,
    sent_timestamp: sent_timestamp,
    audit: {
      created_by: doctor.id,
      created_at: timestamp,
      client_ip: client_ip || null
    },
    errors: warnings.length > 0 ? warnings : []
  };
}

/**
 * Get prescription by ID
 */
export async function getPrescriptionById(prescription_id) {
  try {
    const doc = await db.collection("prescriptions").doc(prescription_id).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data();
  } catch (error) {
    console.error("Error fetching prescription:", error);
    throw error;
  }
}

