import { v4 as uuid } from "uuid";
import { feverCheckSchema, normalizeTemperature, modelTrainSchema } from "../utils/validationSchemas.js";
import { predictFever, trainFeverModel } from "../services/feverModelService.js";
import { generateFeverReport, readReportBuffer } from "../services/pdfReportService.js";
import { lookupHospitals } from "../services/hospitalLookupService.js";
import { getMedicationSuggestions } from "../services/medicationService.js";
import { generateAssistantResponse } from "../services/assistantService.js";
import { assertWithinRateLimit } from "../services/rateLimiter.js";
import { saveSession, getSession, updateSession } from "../store/feverSessionStore.js";
import { classifyFeverType } from "../services/clinicalAssistantService.js";
import { predictLabReportModel } from "../services/labReportModelService.js";
import { getLabUpload } from "../store/labReportUploadStore.js";

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

function normalizeLabValuesInput(values) {
  if (!values || typeof values !== "object") return null;
  const normalized = {};
  let hasValue = false;
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === null || typeof value === "undefined") continue;
    const num = Number(value);
    if (Number.isFinite(num)) {
      normalized[key] = Number(num.toFixed(2));
      hasValue = true;
    }
  }
  return hasValue ? normalized : null;
}

function hasLabSignals(values) {
  return Boolean(values && Object.values(values).some((v) => v !== null && typeof v !== "undefined"));
}

function combinePredictions(symptomPrediction, labPrediction) {
  if (!labPrediction) {
    return {
      label: symptomPrediction.label,
      probability: symptomPrediction.probability,
      source: "symptoms",
    };
  }

  if (!symptomPrediction || !symptomPrediction.label) {
    return {
      label: labPrediction.fever_type,
      probability: labPrediction.confidence,
      source: "lab",
    };
  }

  if (labPrediction.confidence >= 0.6) {
    return {
      label: labPrediction.fever_type,
      probability: Math.max(labPrediction.confidence, symptomPrediction.probability || 0.5),
      source: "lab",
    };
  }

  const blendedProbability = ((symptomPrediction.probability || 0.5) + labPrediction.confidence) / 2;
  return {
    label: symptomPrediction.label,
    probability: blendedProbability,
    source: "combined",
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

  const { lab_values: requestLabValues, lab_upload_id: requestLabUploadId, ...rest } = validation.data;
  const parsed = normalizePayload(rest);
  const sessionId = uuid();

  // Debug logging
  console.log("[DEBUG] Normalized payload:", JSON.stringify(parsed, null, 2));
  console.log("[DEBUG] Temperature (C):", parsed.temperature_c);
  console.log("[DEBUG] Heart rate:", parsed.heart_rate_bpm);
  console.log("[DEBUG] Respiratory rate:", parsed.respiratory_rate_bpm);
  console.log("[DEBUG] SpO2:", parsed.spo2);
  console.log("[DEBUG] Vomiting:", parsed.vomiting);
  console.log("[DEBUG] Location:", JSON.stringify(parsed.location, null, 2));

  try {
    const modelResponse = await predictFever(parsed);
    const symptomProbability = modelResponse?.prediction?.probability ?? modelResponse?.probability;
    const symptomSeverity = modelResponse?.prediction?.severity || determineSeverity(symptomProbability);
    const symptomPrediction = {
      label: modelResponse?.prediction?.label || modelResponse?.label,
      probability: symptomProbability,
      severity: symptomSeverity,
    };

    let labValues = normalizeLabValuesInput(requestLabValues);
    let labUploadId = requestLabUploadId;

    if ((!labValues || !hasLabSignals(labValues)) && labUploadId) {
      const cachedUpload = await getLabUpload(labUploadId);
      if (cachedUpload?.parsedValues) {
        labValues = normalizeLabValuesInput(cachedUpload.parsedValues);
      }
    }

    if ((!labValues || !hasLabSignals(labValues)) && !labUploadId) {
      labValues = null;
    }

    let labPrediction = null;
    if (labValues && hasLabSignals(labValues)) {
      try {
        labPrediction = await predictLabReportModel({
          patient: {
            age: parsed.age,
            gender: parsed.gender,
          },
          lab_values: labValues,
        });
      } catch (error) {
        console.warn("[FeverCheck] Lab prediction failed:", error.message);
      }
    }

    const combinedPrediction = combinePredictions(symptomPrediction, labPrediction);
    const finalSeverity = determineSeverity(combinedPrediction.probability);
    
    // Classify fever type (Viral, Bacterial, Dengue, etc.) using symptoms plus any lab signals
    const classificationInput = labValues ? { ...parsed, ...labValues } : parsed;
    const baseFeverClassification = classifyFeverType(classificationInput);
    const feverClassification = mergeFeverClassificationWithLab(baseFeverClassification, labPrediction);

    const finalAssessment = buildFinalAssessment({
      symptomPrediction,
      labPrediction,
      feverClassification,
      combinedPrediction: {
        ...combinedPrediction,
        severity: finalSeverity,
      },
    });
    
    const medications = getMedicationSuggestions({ 
      age: parsed.age, 
      severityBucket: finalSeverity,
      probability: combinedPrediction.probability 
    });
    const precautions = buildPrecautions(finalSeverity);
    const dietPlan = buildDietPlan(finalSeverity);
    
    // Lookup hospitals with location
    console.log("[DEBUG] Looking up hospitals for location:", JSON.stringify(parsed.location, null, 2));
    const hospitals = await lookupHospitals(parsed.location);
    console.log("[DEBUG] Found hospitals:", hospitals.length);
    if (hospitals.length > 0) {
      console.log("[DEBUG] Sample hospital:", JSON.stringify(hospitals[0], null, 2));
    } else if (parsed.location) {
      console.warn("[DEBUG] No hospitals found for location:", JSON.stringify(parsed.location, null, 2));
    } else {
      console.warn("[DEBUG] No location provided for hospital lookup");
    }

    const reportMetadata = await generateFeverReport({
      sessionId,
      baseUrl: process.env.PUBLIC_BASE_URL,
      userInputs: {
        ...parsed,
        temperature_c: parsed.temperature_c,
      },
      prediction: {
        label: combinedPrediction.label,
        probability: combinedPrediction.probability,
        severity: finalSeverity,
      },
      explainability: modelResponse?.explainability || modelResponse?.top_features,
      suggestions: { medications, precautions },
      hospitals,
      dietPlan,
    });

    const responsePayload = {
      prediction: {
        label: combinedPrediction.label,
        probability: combinedPrediction.probability,
        severity: finalSeverity,
      },
      symptom_prediction: symptomPrediction,
      lab_prediction: labPrediction,
      lab_values: labValues,
      lab_source: labUploadId ? { upload_id: labUploadId } : undefined,
      fever_classification: {
        fever_type: feverClassification.fever_type,
        secondary_type: feverClassification.secondary_type,
        primary_confidence: feverClassification.primary_confidence,
        secondary_confidence: feverClassification.secondary_confidence,
        all_confidences: feverClassification.all_confidences,
        rationale: feverClassification.rationale,
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
      final_assessment: finalAssessment,
      location: parsed.location, // Include location in response so frontend can display it
      consent: parsed.consent,
      timestamp: new Date().toISOString(),
    };

    await saveSession(sessionId, {
      sessionId,
      reportId: reportMetadata.reportId,
      reportPath: reportMetadata.filePath,
      inputs: parsed,
      labReport: labValues
        ? {
            values: labValues,
            uploadId: labUploadId,
            prediction: labPrediction,
          }
        : undefined,
      prediction: responsePayload.prediction,
      fever_classification: responsePayload.fever_classification,
      explainability: responsePayload.explainability,
      suggestions: responsePayload.suggestions,
      hospitals,
      consent: parsed.consent,
      final_assessment: finalAssessment,
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

function mapLabFeverTypeToClinical(label) {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("viral")) return "Viral Fever";
  if (lower.includes("bacterial")) return "Bacterial Fever";
  if (lower.includes("dengue")) return "Dengue Fever";
  if (lower.includes("typhoid")) return "Typhoid Fever";
  if (lower.includes("malaria")) return "Malaria Fever";
  return null;
}

function mergeFeverClassificationWithLab(symptomClass, labPrediction) {
  if (!labPrediction || !labPrediction.fever_type) return symptomClass;
  const mappedLabType = mapLabFeverTypeToClinical(labPrediction.fever_type);
  if (!mappedLabType) return symptomClass;

  const labConf = Math.round((labPrediction.confidence || 0) * 100);
  const originalPrimary = symptomClass.fever_type;
  const originalPrimaryConf = symptomClass.primary_confidence;
  const allConfidences = { ...(symptomClass.all_confidences || {}) };

  if (mappedLabType in allConfidences) {
    allConfidences[mappedLabType] = Math.max(allConfidences[mappedLabType], labConf);
  }

  // If lab confidence is modest, only add as secondary if different
  if (labConf < 60) {
    if (mappedLabType === originalPrimary) {
      return {
        ...symptomClass,
        all_confidences,
      };
    }
    const secondary_type = symptomClass.secondary_type || mappedLabType;
    const secondary_confidence =
      symptomClass.secondary_type === mappedLabType
        ? Math.max(symptomClass.secondary_confidence || 0, labConf)
        : symptomClass.secondary_confidence || labConf;

    return {
      ...symptomClass,
      secondary_type,
      secondary_confidence,
      all_confidences,
    };
  }

  // High-confidence lab result: promote to primary, original primary becomes secondary
  let secondary_type = originalPrimary !== mappedLabType ? originalPrimary : symptomClass.secondary_type;
  let secondary_confidence =
    originalPrimary !== mappedLabType ? originalPrimaryConf : symptomClass.secondary_confidence;

  return {
    ...symptomClass,
    fever_type: mappedLabType,
    primary_confidence: labConf,
    secondary_type,
    secondary_confidence,
    all_confidences,
  };
}

function buildFinalAssessment({
  symptomPrediction,
  labPrediction,
  feverClassification,
  combinedPrediction,
}) {
  const primaryCause =
    labPrediction && labPrediction.confidence >= 0.7
      ? {
          label: labPrediction.fever_type,
          source: "lab",
          confidence: Math.round((labPrediction.confidence || 0) * 100),
        }
      : {
          label: feverClassification.fever_type,
          source: "symptoms_rules",
          confidence: feverClassification.primary_confidence ?? Math.round((combinedPrediction.probability || 0) * 100),
        };

  const severityLabel = combinedPrediction.severity || symptomPrediction.severity;

  return {
    primary_cause_label: primaryCause.label,
    primary_cause_confidence: primaryCause.confidence,
    primary_cause_source: primaryCause.source,
    infectious_primary: feverClassification.fever_type,
    infectious_primary_confidence: feverClassification.primary_confidence,
    infectious_secondary: feverClassification.secondary_type,
    infectious_secondary_confidence: feverClassification.secondary_confidence,
    severity_label: severityLabel,
    symptom_model_confidence: Math.round((symptomPrediction.probability || 0) * 100),
    lab_model_confidence: labPrediction ? Math.round((labPrediction.confidence || 0) * 100) : null,
    lab_model_label: labPrediction ? labPrediction.fever_type : null,
    lab_model_explanation: labPrediction ? labPrediction.explanation : null,
    rationale: feverClassification.rationale,
  };
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

