import { v4 as uuid } from "uuid";
import { feverCheckSchema, normalizeTemperature, modelTrainSchema } from "../utils/validationSchemas.js";
import { predictFever, trainFeverModel } from "../services/feverModelService.js";
import { generateFeverReport, readReportBuffer } from "../services/pdfReportService.js";
import { lookupHospitals } from "../services/hospitalLookupService.js";
import { getMedicationSuggestions } from "../services/medicationService.js";
import { generateAssistantResponse } from "../services/assistantService.js";
import { assertWithinRateLimit } from "../services/rateLimiter.js";
import { saveSession, getSession, updateSession } from "../store/feverSessionStore.js";

function determineSeverity(probability) {
  if (probability == null) return "Unknown";
  if (probability < 0.2) return "Very unlikely";
  if (probability < 0.5) return "Low probability";
  if (probability < 0.75) return "Moderate probability";
  return "High probability";
}

function buildPrecautions(severity) {
  const base = [
    "Hydrate frequently with water or electrolyte solutions.",
    "Rest and monitor symptoms twice daily.",
    "Avoid self-medicating beyond over-the-counter guidance.",
  ];
  if (severity?.toLowerCase().includes("high")) {
    base.push("Seek urgent medical evaluation if temperature exceeds 39°C or symptoms worsen rapidly.");
  }
  if (severity?.toLowerCase().includes("moderate")) {
    base.push("Book a clinician visit within 24 hours if symptoms persist.");
  }
  return base;
}

function buildDietPlan(severity) {
  const plan = [
    "Warm broths or soups with lean protein.",
    "Vitamin C rich fruits (citrus, berries) to support immunity.",
    "Electrolyte drinks after perspiration or vomiting.",
    "Avoid heavy, spicy, or fried foods until recovery.",
  ];
  if (severity?.toLowerCase().includes("high")) {
    plan.push("Consider small, frequent meals to maintain energy.");
  }
  return plan;
}

function normalizePayload(data) {
  const temperature_c = normalizeTemperature(data.body_temperature);
  return {
    ...data,
    temperature_c,
  };
}

export async function runFeverCheck(req, res) {
  const validation = feverCheckSchema.safeParse(req.body);
  if (!validation.success) {
    console.error("[FeverCheck] Validation errors:", JSON.stringify(validation.error.errors, null, 2));
    return res.status(400).json({ 
      message: "Invalid payload", 
      errors: validation.error.flatten(),
      details: validation.error.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code
      }))
    });
  }

  const parsed = normalizePayload(validation.data);
  const sessionId = uuid();

  // Debug logging
  console.log("[DEBUG] Normalized payload:", JSON.stringify(parsed, null, 2));
  console.log("[DEBUG] Temperature (C):", parsed.temperature_c);
  console.log("[DEBUG] Heart rate:", parsed.heart_rate_bpm);
  console.log("[DEBUG] Respiratory rate:", parsed.respiratory_rate_bpm);
  console.log("[DEBUG] SpO2:", parsed.spo2);
  console.log("[DEBUG] Vomiting:", parsed.vomiting);

  try {
    const modelResponse = await predictFever(parsed);
    const probability = modelResponse?.prediction?.probability ?? modelResponse?.probability;
    const severity = modelResponse?.prediction?.severity || determineSeverity(probability);
    const medications = getMedicationSuggestions({ 
      age: parsed.age, 
      severityBucket: severity,
      probability: probability 
    });
    const precautions = buildPrecautions(severity);
    const dietPlan = buildDietPlan(severity);
    const hospitals = await lookupHospitals(parsed.location);

    const reportMetadata = await generateFeverReport({
      sessionId,
      baseUrl: process.env.PUBLIC_BASE_URL,
      userInputs: {
        ...parsed,
        temperature_c: parsed.temperature_c,
      },
      prediction: {
        label: modelResponse?.prediction?.label || modelResponse?.label,
        probability,
        severity,
      },
      explainability: modelResponse?.explainability || modelResponse?.top_features,
      suggestions: { medications, precautions },
      hospitals,
      dietPlan,
    });

    const responsePayload = {
      prediction: {
        label: modelResponse?.prediction?.label || modelResponse?.label,
        probability,
        severity,
      },
      explainability: {
        top_features: modelResponse?.explainability?.top_features || modelResponse?.top_features || [],
      },
      pdf_report_url: reportMetadata.pdfUrl,
      ai_assistant_session_id: sessionId,
      suggestions: {
        medications,
        precautions,
        dietPlan,
      },
      hospitals,
      consent: parsed.consent,
      timestamp: new Date().toISOString(),
    };

    await saveSession(sessionId, {
      sessionId,
      reportId: reportMetadata.reportId,
      reportPath: reportMetadata.filePath,
      inputs: parsed,
      prediction: responsePayload.prediction,
      explainability: responsePayload.explainability,
      suggestions: responsePayload.suggestions,
      hospitals,
      consent: parsed.consent,
      assistantHistory: [],
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("[FeverCheck] Failed to run prediction", error);
    console.error("[FeverCheck] Error stack:", error.stack);
    return res.status(500).json({ 
      message: "Unable to process request", 
      detail: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined
    });
  }
}

export async function downloadReport(req, res) {
  const { reportId } = req.params;
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const session = await getSession(sessionId);
  if (!session || session.reportId !== reportId) {
    return res.status(404).json({ message: "Report not found" });
  }

  if (!session.consent) {
    return res.status(403).json({ message: "Report download requires consent" });
  }

  try {
    const buffer = await readReportBuffer(session.reportPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fever-check_${session.sessionId}.pdf"`
    );
    return res.send(buffer);
  } catch (error) {
    console.error("[Report] Unable to read report", error);
    return res.status(500).json({ message: "Unable to read report" });
  }
}

export async function sendAssistantMessage(req, res) {
  const { sessionId } = req.params;
  const { message } = req.body;

  const session = await getSession(sessionId);
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  const isAllowed = assertWithinRateLimit(`assistant:${sessionId}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!isAllowed) {
    return res.status(429).json({ message: "Too many requests. Please wait a moment." });
  }

  const hospitals =
    session.hospitals?.length > 0
      ? session.hospitals
      : await lookupHospitals(session.inputs?.location);

  try {
    const result = await generateAssistantResponse({ session, message, hospitals });
    const assistantHistory = [
      ...(session.assistantHistory || []),
      { role: "user", content: message },
      { role: "assistant", content: result.reply },
    ].slice(-10);

    await updateSession(sessionId, {
      assistantHistory,
      hospitals,
    });

    return res.json({
      reply: result.reply,
      intent: result.intent,
      disclaimer:
        "This service provides AI-driven symptom checking and is not a substitute for medical advice.",
    });
  } catch (error) {
    console.error("[Assistant] Failed to respond", error);
    return res.status(500).json({ message: "Assistant unavailable", detail: error.message });
  }
}

export async function handleModelTrain(req, res) {
  const adminToken = req.headers["x-admin-token"];
  if (!process.env.MODEL_ADMIN_TOKEN || adminToken !== process.env.MODEL_ADMIN_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const validation = modelTrainSchema.safeParse(req.body || {});
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten() });
  }

  try {
    const result = await trainFeverModel(validation.data);
    return res.json(result);
  } catch (error) {
    console.error("[ModelTrain] Failed", error);
    return res.status(500).json({ message: "Training failed", detail: error.message });
  }
}

