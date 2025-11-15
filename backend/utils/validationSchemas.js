import { z } from "zod";

const severityLevels = ["none", "mild", "moderate", "severe"];
const coughTypes = ["none", "dry", "wet"];
const alcoholLevels = ["none", "occasional", "regular"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  })
  .or(
    z.object({
      city: z.string().min(2).max(120),
    })
  )
  .optional();

const temperatureSchema = z
  .object({
    temperature_c: z.number().min(30).max(45).nullable().optional(),
    temperature_value: z.number().min(30).max(113).nullable().optional(),
    temperature_unit: z.enum(["C", "F", "c", "f"]).optional(),
  })
  .refine(
    (data) => {
      // Allow temperature to be optional (both null is OK)
      if (data.temperature_c == null && data.temperature_value == null) {
        return true; // Temperature is optional
      }
      // If either is provided, validate the value
      if (data.temperature_c != null) {
        return data.temperature_c >= 30 && data.temperature_c <= 45;
      }
      if (data.temperature_value != null) {
        return data.temperature_value >= 30 && data.temperature_value <= 113;
      }
      return true;
    },
    {
      message: "Temperature must be between 30-45°C or 30-113°F if provided",
    }
  );

export const feverCheckSchema = z
  .object({
    age: z.number().int().min(0).max(120),
    gender: z.enum(genderOptions),
    heart_rate_bpm: z.number().min(20).max(260).nullable().optional(),
    respiratory_rate_bpm: z.number().min(5).max(80).nullable().optional(),
    spo2: z.number().min(50).max(100).nullable().optional(),
    bp_systolic: z.number().min(60).max(250).nullable().optional(),
    bp_diastolic: z.number().min(30).max(150).nullable().optional(),
    chills: z.boolean().default(false),
    sweating: z.boolean().default(false),
    loss_of_appetite: z.boolean().default(false),
    sore_throat: z.boolean().default(false),
    runny_nose: z.boolean().default(false),
    nasal_congestion: z.boolean().default(false),
    vomiting: z.boolean().default(false),
    fatigue: z.enum(severityLevels),
    headache: z.enum(severityLevels),
    body_aches: z.enum(severityLevels),
    breathing_difficulty: z.enum(severityLevels),
    cough: z.enum(coughTypes),
    body_pain_scale: z.number().min(0).max(10),
    alcohol_consumption: z.enum(alcoholLevels),
    medical_history: z.boolean().default(false),
    medical_history_text: z.string().max(500).nullable().optional(),
    body_temperature: temperatureSchema.optional(),
    location: locationSchema,
    consent: z.literal(true, {
      errorMap: () => ({
        message: "Consent is required to proceed.",
      }),
    }),
  })
  .refine(
    (data) => {
      if (data.medical_history) {
        return Boolean(data.medical_history_text && data.medical_history_text.trim().length > 3);
      }
      return true;
    },
    {
      message: "Provide current medicines or conditions.",
      path: ["medical_history_text"],
    }
  );

export function normalizeTemperature(bodyTemperature) {
  if (!bodyTemperature) return null;
  if (bodyTemperature.temperature_c != null) {
    return bodyTemperature.temperature_c;
  }
  if (bodyTemperature.temperature_value != null) {
    const unit = bodyTemperature.temperature_unit?.toLowerCase() || "c";
    if (unit === "f") {
      return Number(((bodyTemperature.temperature_value - 32) * (5 / 9)).toFixed(2));
    }
    return Number(bodyTemperature.temperature_value.toFixed(2));
  }
  return null;
}

export const modelTrainSchema = z.object({
  datasetPath: z.string().optional(),
  hyperparameters: z
    .object({
      n_estimators: z.number().min(10).max(1000).optional(),
      max_depth: z.number().min(2).max(20).optional(),
    })
    .optional(),
});

