import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  BeakerIcon,
  InformationCircleIcon,
  UserIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { submitFeverCheck } from "../services/feverCheckService";
import { useAuth } from "../contexts/AuthContext";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || typeof value === "undefined") return undefined;
    return Number(value);
  },
  z.number().optional()
);

// Temperature conversion functions
const convertToCelsius = (value, unit) => {
  if (value === null || value === undefined || isNaN(value)) return null;
  switch (unit) {
    case "F":
      return (value - 32) * 5 / 9;
    case "K":
      return value - 273.15;
    case "C":
    default:
      return value;
  }
};

const getTemperatureRange = (unit) => {
  switch (unit) {
    case "F":
      return { min: 86, max: 113 }; // ~30°C to 45°C
    case "K":
      return { min: 303, max: 318 }; // ~30°C to 45°C
    case "C":
    default:
      return { min: 30, max: 45 };
  }
};

const getTemperaturePlaceholder = (unit) => {
  switch (unit) {
    case "F":
      return "e.g., 101.3";
    case "K":
      return "e.g., 311.65";
    case "C":
    default:
      return "e.g., 38.5";
  }
};

// Respiratory rate conversion: selection to numeric value
const getRespiratoryRateValue = (selection) => {
  if (!selection || selection === "") return null;
  switch (selection) {
    case "difficulty":
      return 8; // Representative value for 5-11 breaths/min (slow/shallow breathing)
    case "normal":
      return 16; // Representative value for 12-20 breaths/min (normal)
    case "fast":
      return 24; // Representative value for 21-30+ breaths/min (fast breathing/tachypnea)
    default:
      return null;
  }
};

const formSchema = z.object({
  age: z.coerce.number().min(0, "Age is required"),
  age_unit: z.enum(["years", "months"], {
    errorMap: () => ({ message: "Please select age unit (years or months)" }),
  }),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  body_temperature_value: optionalNumber,
  body_temperature_unit: z.enum(["C", "F", "K"]),
  heart_rate_bpm: optionalNumber,
  respiratory_rate: z.enum(["difficulty", "normal", "fast"]).optional(),
  respiratory_rate_bpm: optionalNumber, // Keep for backward compatibility
  spo2: optionalNumber,
  bp_systolic: optionalNumber,
  bp_diastolic: optionalNumber,
  chills: z.boolean().default(false),
  sweating: z.boolean().default(false),
  loss_of_appetite: z.boolean().default(false),
  sore_throat: z.boolean().default(false),
  runny_nose: z.boolean().default(false),
  nasal_congestion: z.boolean().default(false),
  vomiting: z.boolean().default(false),
  fatigue: z.enum(["none", "mild", "moderate", "severe"]),
  headache: z.enum(["none", "mild", "moderate", "severe"]),
  body_aches: z.enum(["none", "mild", "moderate", "severe"]),
  breathing_difficulty: z.enum(["none", "mild", "moderate", "severe"]),
  cough: z.enum(["none", "dry", "wet"]),
  body_pain_scale: z.coerce.number().min(0).max(10),
  alcohol_consumption: z.enum(["none", "occasional", "regular"]),
  medical_history: z.boolean(),
  medical_history_text: z.string().max(500).optional(),
  location_city: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to proceed." }),
  }),
});

const tooltip = {
  temperature: "Enter temperature in Celsius (°C), Fahrenheit (°F), or Kelvin (K). Normal adult oral temp: 36.1–37.2°C (97–99°F, 309–310K). The value will be automatically converted to Celsius for analysis.",
  heartRate: "Resting heart rate: 60–100 bpm for most adults.",
  respiratoryRate: "Select based on breathing pattern: Difficulty in breathing (5-11 breaths/min), Normal (12-20 breaths/min), or Fast breathing (21-30+ breaths/min).",
  spo2: "Healthy adults typically 95–100%.",
  bloodPressure: "Desired adult BP: around 120/80 mmHg.",
};

const severities = ["none", "mild", "moderate", "severe"];
const symptomChecks = [
  { name: "chills", label: "Body chills / shivering" },
  { name: "sweating", label: "Sweating" },
  { name: "loss_of_appetite", label: "Loss of appetite" },
  { name: "sore_throat", label: "Sore throat" },
  { name: "runny_nose", label: "Runny nose" },
  { name: "nasal_congestion", label: "Nasal congestion" },
  { name: "vomiting", label: "Vomiting" },
];

const severityGroups = [
  { name: "fatigue", label: "Fatigue" },
  { name: "headache", label: "Headache" },
  { name: "body_aches", label: "Body aches (myalgia)" },
  { name: "breathing_difficulty", label: "Breathing difficulty" },
];

// Modern card styling
const cardBase = "bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md";
const cardPadding = "p-6";
const sectionGap = "space-y-6";

// Form input styling
const inputBase = "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors";
const inputError = "border-red-300 focus:border-red-500 focus:ring-red-500/20";

// Button styling
const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all";
const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors";

function SectionHeading({ title, description, icon: Icon }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon className="w-5 h-5 text-primary-600" />}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {description && <p className="text-sm text-gray-600 ml-8">{description}</p>}
    </div>
  );
}

function InfoTooltip({ text }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center cursor-help text-gray-400 hover:text-gray-600 transition-colors"
      role="tooltip"
      title={text}
      aria-label={text}
    >
      <InformationCircleIcon className="w-4 h-4" />
    </span>
  );
}

function FormField({ label, error, children, required, tooltipText, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {tooltipText && <InfoTooltip text={tooltipText} />}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error.message}</p>}
    </div>
  );
}

export default function FeverChecker({ labValues = null, labUploadInfo = null }) {
  const { user, userData, refreshUserData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [error, setError] = useState("");
  const [persistMessage, setPersistMessage] = useState("");
  const [storedAnalysisMeta, setStoredAnalysisMeta] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const labDetectedCount = useMemo(() => {
    if (!labValues) return 0;
    return Object.values(labValues).filter(
      (v) => v !== null && typeof v !== "undefined"
    ).length;
  }, [labValues]);

  const defaultValues = useMemo(
    () => ({
      age: "",
      age_unit: "years",
      gender: "Male",
      body_temperature_value: "",
      body_temperature_unit: "C", // Default to Celsius
      heart_rate_bpm: "",
      respiratory_rate: "", // New selection-based field
      respiratory_rate_bpm: "", // Keep for backward compatibility
      spo2: "",
      bp_systolic: "",
      bp_diastolic: "",
      cough: "none",
      body_pain_scale: 0,
      alcohol_consumption: "none",
      medical_history: false,
      medical_history_text: "",
      location_city: "",
      consent: false,
      fatigue: "none",
      headache: "none",
      body_aches: "none",
      breathing_difficulty: "none",
      chills: false,
      sweating: false,
      loss_of_appetite: false,
      sore_throat: false,
      runny_nose: false,
      nasal_congestion: false,
      vomiting: false,
    }),
    []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: zodResolver(formSchema),
    mode: "onBlur", // Only validate on blur, not on every keystroke
  });

  const medicalHistoryChecked = watch("medical_history");
  const bodyPainScale = watch("body_pain_scale");
  const ageUnit = watch("age_unit") || "years";

  useEffect(() => {
    if (!userData?.feverAnalysis) {
      setStoredAnalysisMeta(null);
      return;
    }
    const stored = userData.feverAnalysis;
    if (stored.formValues) {
      reset({
        ...defaultValues,
        ...stored.formValues,
        consent: false,
      });
    }
    if (stored.result) {
      setResult(stored.result);
    }
    setStoredAnalysisMeta({
      savedAt: stored.savedAt || null,
    });
  }, [userData, reset, defaultValues]);
  const temperatureUnit = watch("body_temperature_unit") || "C";

  const buildPayload = (values) => {
    const maybeNumber = (val) =>
      val === "" || val === null || typeof val === "undefined" ? null : Number(val);
    const locationPayload =
      location.lat && location.lon
        ? { lat: Number(location.lat), lon: Number(location.lon) }
        : values.location_city
        ? { city: values.location_city }
        : undefined;

    const tempValue = maybeNumber(values.body_temperature_value);
    // Convert temperature to Celsius for backend
    const tempInCelsius = tempValue != null 
      ? convertToCelsius(tempValue, values.body_temperature_unit)
      : null;
    const bodyTemperature = tempInCelsius != null
      ? {
          temperature_value: tempInCelsius,
          temperature_unit: "C", // Always send Celsius to backend
        }
      : undefined;

    // Convert age to years for backend (if months, divide by 12)
    const ageValue = Number(values.age);
    const ageInYears = values.age_unit === "months" 
      ? ageValue / 12 
      : ageValue;

    const payload = {
      age: ageInYears,
      age_unit: values.age_unit, // Also send the unit for reference
      age_original: ageValue, // Original value before conversion
      gender: values.gender,
      heart_rate_bpm: maybeNumber(values.heart_rate_bpm),
      respiratory_rate_bpm: values.respiratory_rate 
        ? getRespiratoryRateValue(values.respiratory_rate)
        : maybeNumber(values.respiratory_rate_bpm), // Use selection if provided, otherwise fallback to direct input
      spo2: maybeNumber(values.spo2),
      bp_systolic: maybeNumber(values.bp_systolic),
      bp_diastolic: maybeNumber(values.bp_diastolic),
      chills: values.chills,
      sweating: values.sweating,
      loss_of_appetite: values.loss_of_appetite,
      sore_throat: values.sore_throat,
      runny_nose: values.runny_nose,
      nasal_congestion: values.nasal_congestion,
      vomiting: values.vomiting,
      fatigue: values.fatigue,
      headache: values.headache,
      body_aches: values.body_aches,
      breathing_difficulty: values.breathing_difficulty,
      cough: values.cough,
      body_pain_scale: Number(values.body_pain_scale),
      alcohol_consumption: values.alcohol_consumption,
      medical_history: values.medical_history,
      medical_history_text: values.medical_history ? (values.medical_history_text || "") : "",
      location: locationPayload,
      consent: values.consent,
    };

    if (bodyTemperature) {
      payload.body_temperature = bodyTemperature;
    }

    if (labValues && Object.keys(labValues).length > 0) {
      payload.lab_values = labValues;
    }
    if (labUploadInfo?.uploadId) {
      payload.lab_upload_id = labUploadInfo.uploadId;
    }

    return payload;
  };

  const persistFeverAnalysis = async (formValues, analysisResult) => {
    if (!user?.uid) return;
    try {
      setPersistMessage("Saving analysis...");
      const firestoreModule = await import("firebase/firestore");
      const { getFirestore, doc, setDoc } = firestoreModule;
      const firestore = getFirestore();
      const userDocRef = doc(firestore, "users", user.uid);

      const storedFormValues = {
        ...formValues,
        consent: false,
      };

      const payload = {
        savedAt: new Date().toISOString(),
        formValues: storedFormValues,
        result: analysisResult,
      };

      await setDoc(
        userDocRef,
        { feverAnalysis: payload },
        { merge: true }
      );

      setPersistMessage("Analysis saved to profile.");
      setStoredAnalysisMeta({ savedAt: payload.savedAt });
      await refreshUserData();
    } catch (err) {
      console.error("Failed to persist fever analysis:", err);
      setPersistMessage("Unable to store analysis in profile.");
    }
  };

  const handleResetStoredAnalysis = async () => {
    setIsResetting(true);
    setPersistMessage("");
    try {
      if (user?.uid) {
        const firestoreModule = await import("firebase/firestore");
        const { getFirestore, doc, setDoc, deleteField } = firestoreModule;
        const firestore = getFirestore();
        const userDocRef = doc(firestore, "users", user.uid);
        await setDoc(
          userDocRef,
          { feverAnalysis: deleteField() },
          { merge: true }
        );
        await refreshUserData();
      }
      reset(defaultValues);
      setResult(null);
      setStoredAnalysisMeta(null);
      setLocation({ lat: null, lon: null });
    } catch (err) {
      console.error("Failed to reset fever analysis:", err);
      setError("Unable to reset fever analysis. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const onSubmit = async (values) => {
    const payload = buildPayload(values);
    setIsSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await submitFeverCheck(payload);
      setResult(response);
      if (user?.uid) {
        await persistFeverAnalysis(values, response);
      } else {
        setPersistMessage("Log in to save this analysis for later.");
      }
      // Scroll to results
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      let errorMessage = err.message;
      const errorData = err.data || {};
      if (errorData.details && Array.isArray(errorData.details)) {
        const validationErrors = errorData.details
          .map((e) => `${e.path}: ${e.message}`)
          .join("; ");
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (errorData.errors) {
        const fieldErrors = Object.entries(errorData.errors.fieldErrors || {})
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("; ");
        if (fieldErrors) {
          errorMessage = `Validation failed: ${fieldErrors}`;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
        setValue("location_city", "");
      },
      () => setError("Unable to fetch your location. Please type your city manually.")
    );
  };

  // Demo data cases
  const demoDataCases = {
    highFever: {
      name: "High Fever (39.5°C)",
      description: "Severe high fever with multiple symptoms",
      data: {
        age: 35,
        gender: "Male",
        body_temperature_value: 39.5,
        body_temperature_unit: "C",
        heart_rate_bpm: 110,
        respiratory_rate: "fast", // 22 breaths/min
        respiratory_rate_bpm: 22,
        spo2: 96,
        bp_systolic: 130,
        bp_diastolic: 85,
        chills: true,
        sweating: true,
        loss_of_appetite: true,
        sore_throat: true,
        runny_nose: false,
        nasal_congestion: true,
        vomiting: true,
        fatigue: "severe",
        headache: "severe",
        body_aches: "severe",
        breathing_difficulty: "mild",
        cough: "dry",
        body_pain_scale: 8,
        alcohol_consumption: "none",
        medical_history: false,
        medical_history_text: "",
        location_city: "Mumbai",
        consent: true,
      }
    },
    moderateFever: {
      name: "Moderate Fever (38.6°C)",
      description: "Moderate fever with typical flu symptoms",
      data: {
        age: 24,
        gender: "Male",
        body_temperature_value: 38.6,
        body_temperature_unit: "C",
        heart_rate_bpm: 102,
        respiratory_rate: "fast", // 22 breaths/min
        respiratory_rate_bpm: 22,
        spo2: 96,
        bp_systolic: 112,
        bp_diastolic: 74,
        chills: true,
        sweating: true,
        loss_of_appetite: true,
        sore_throat: true,
        runny_nose: true,
        nasal_congestion: true,
        vomiting: false,
        fatigue: "moderate",
        headache: "mild",
        body_aches: "moderate",
        breathing_difficulty: "none",
        cough: "dry",
        body_pain_scale: 5,
        alcohol_consumption: "none",
        medical_history: false,
        medical_history_text: "",
        location_city: "Vijayanagar, Bengaluru",
        consent: true,
      }
    },
    normalTemp: {
      name: "Normal Temperature (36.8°C)",
      description: "Healthy adult with normal temperature",
      data: {
        age: 28,
        gender: "Female",
        body_temperature_value: 36.8,
        body_temperature_unit: "C",
        heart_rate_bpm: 72,
        respiratory_rate: "normal", // 16 breaths/min
        respiratory_rate_bpm: 16,
        spo2: 98,
        bp_systolic: 120,
        bp_diastolic: 80,
        chills: false,
        sweating: false,
        loss_of_appetite: false,
        sore_throat: false,
        runny_nose: false,
        nasal_congestion: false,
        vomiting: false,
        fatigue: "none",
        headache: "none",
        body_aches: "none",
        breathing_difficulty: "none",
        cough: "none",
        body_pain_scale: 1,
        alcohol_consumption: "occasional",
        medical_history: false,
        medical_history_text: "",
        location_city: "Pune",
        consent: true,
      }
    },
    veryHighFever: {
      name: "Very High Fever (40.2°C)",
      description: "Elderly patient with very high fever and complications",
      data: {
        age: 68,
        gender: "Female",
        body_temperature_value: 40.2,
        body_temperature_unit: "C",
        heart_rate_bpm: 125,
        respiratory_rate: "fast", // 28 breaths/min
        respiratory_rate_bpm: 28,
        spo2: 92,
        bp_systolic: 140,
        bp_diastolic: 90,
        chills: true,
        sweating: false,
        loss_of_appetite: true,
        sore_throat: false,
        runny_nose: false,
        nasal_congestion: true,
        vomiting: true,
        fatigue: "severe",
        headache: "moderate",
        body_aches: "severe",
        breathing_difficulty: "moderate",
        cough: "wet",
        body_pain_scale: 9,
        alcohol_consumption: "none",
        medical_history: true,
        medical_history_text: "Hypertension, Diabetes",
        location_city: "Delhi",
        consent: true,
      }
    },
    babyFever: {
      name: "Baby with Fever (6 months)",
      description: "Infant with fever - demonstrates age in months",
      data: {
        age: 6,
        age_unit: "months",
        gender: "Male",
        body_temperature_value: 38.5,
        body_temperature_unit: "C",
        heart_rate_bpm: 140,
        respiratory_rate: "fast", // 30 breaths/min
        respiratory_rate_bpm: 30,
        spo2: 97,
        bp_systolic: 90,
        bp_diastolic: 60,
        chills: true,
        sweating: false,
        loss_of_appetite: true,
        sore_throat: false,
        runny_nose: true,
        nasal_congestion: true,
        vomiting: true,
        fatigue: "moderate",
        headache: "none",
        body_aches: "none",
        breathing_difficulty: "mild",
        cough: "wet",
        body_pain_scale: 3,
        alcohol_consumption: "none",
        medical_history: false,
        medical_history_text: "",
        location_city: "Chennai",
        consent: true,
      }
    },
    fahrenheitFever: {
      name: "Fever in Fahrenheit (101.3°F)",
      description: "Demonstrates temperature input in Fahrenheit",
      data: {
        age: 35,
        age_unit: "years",
        gender: "Female",
        body_temperature_value: 101.3,
        body_temperature_unit: "F",
        heart_rate_bpm: 95,
        respiratory_rate: "normal", // 20 breaths/min
        respiratory_rate_bpm: 20,
        spo2: 97,
        bp_systolic: 118,
        bp_diastolic: 78,
        chills: true,
        sweating: false,
        loss_of_appetite: true,
        sore_throat: true,
        runny_nose: false,
        nasal_congestion: false,
        vomiting: false,
        fatigue: "mild",
        headache: "mild",
        body_aches: "mild",
        breathing_difficulty: "none",
        cough: "dry",
        body_pain_scale: 4,
        alcohol_consumption: "none",
        medical_history: false,
        medical_history_text: "",
        location_city: "Mumbai",
        consent: true,
      }
    }
  };

  const loadDemoData = (caseKey) => {
    const demoCase = demoDataCases[caseKey];
    if (!demoCase) return;

    const data = demoCase.data;
    
    // Set all form values
    setValue("age", data.age);
    setValue("age_unit", data.age_unit || (data.age < 2 ? "months" : "years")); // Default to months if age < 2, otherwise years
    setValue("gender", data.gender);
    setValue("body_temperature_value", data.body_temperature_value);
    setValue("body_temperature_unit", data.body_temperature_unit);
    setValue("heart_rate_bpm", data.heart_rate_bpm);
    setValue("respiratory_rate", data.respiratory_rate || ""); // Set new selection field
    setValue("respiratory_rate_bpm", data.respiratory_rate_bpm);
    setValue("spo2", data.spo2);
    setValue("bp_systolic", data.bp_systolic);
    setValue("bp_diastolic", data.bp_diastolic);
    setValue("chills", data.chills);
    setValue("sweating", data.sweating);
    setValue("loss_of_appetite", data.loss_of_appetite);
    setValue("sore_throat", data.sore_throat);
    setValue("runny_nose", data.runny_nose);
    setValue("nasal_congestion", data.nasal_congestion);
    setValue("vomiting", data.vomiting);
    setValue("fatigue", data.fatigue);
    setValue("headache", data.headache);
    setValue("body_aches", data.body_aches);
    setValue("breathing_difficulty", data.breathing_difficulty);
    setValue("cough", data.cough);
    setValue("body_pain_scale", data.body_pain_scale);
    setValue("alcohol_consumption", data.alcohol_consumption);
    setValue("medical_history", data.medical_history);
    setValue("medical_history_text", data.medical_history_text || "");
    setValue("location_city", data.location_city);
    setValue("consent", data.consent);
    
    // Clear location coordinates if city is set
    if (data.location_city) {
      setLocation({ lat: null, lon: null });
    }
    
    // Clear any previous errors
    setError("");
  };

  return (
    <>
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
      <div className="mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 p-8 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-3">Fever Prediction</h1>
          <p className="text-primary-50 text-base max-w-3xl leading-relaxed">
            Collect key symptom parameters, estimate fever probability & severity, preview AI guidance, and generate an encrypted PDF report.
          </p>
        </div>
      </div>

      {labUploadInfo && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Lab report linked: {labUploadInfo.file?.name || "Report"}
              </p>
              <p className="text-xs text-emerald-800">
                {labDetectedCount > 0
                  ? `Detected ${labDetectedCount} clinical parameter${labDetectedCount === 1 ? "" : "s"} (` +
                    `${labUploadInfo.provider?.replace("_", " ")} OCR)`
                  : "No parameters detected yet. You can still fill values manually."}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Auto-attached to analysis
            </span>
          </div>
        </div>
      )}

      {/* Demo Data Loader */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Demo Mode:</span>
          </div>
          <button
            type="button"
            onClick={() => loadDemoData('moderateFever')}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 hover:border-blue-800 transition-colors shadow-md flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Load Demo Data
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          Click the button above to automatically fill the form with demo test data (Moderate Fever - 38.6°C) for presentations.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={sectionGap}>
        {/* Demographics Section */}
        <section className={`${cardBase} ${cardPadding}`}>
          <SectionHeading 
            title="Demographics" 
            description="Basic patient information" 
            icon={UserIcon}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Age" error={errors.age || errors.age_unit} required>
              <div className="flex gap-2">
                <select
                  {...register("age_unit")}
                  className={`${inputBase} ${errors.age_unit ? inputError : ""} flex-[12] text-xs py-1.5`}
                  aria-label="Age unit"
                >
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  {...register("age")}
                  className={`${inputBase} ${errors.age ? inputError : ""} flex-[4]`}
                  placeholder={ageUnit === "months" ? "e.g., 6" : "e.g., 25"}
                  aria-required="true"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {ageUnit === "months" 
                  ? "Suitable for babies and infants (e.g., 6 months)" 
                  : "For children and adults"}
              </p>
            </FormField>
            <FormField label="Gender" error={errors.gender}>
              <div className="grid grid-cols-2 gap-3">
                {["Male", "Female", "Other", "Prefer not to say"].map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      value={option}
                      {...register("gender")}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        </section>

        {/* Vital Signs Section */}
        <section className={`${cardBase} ${cardPadding}`}>
          <SectionHeading 
            title="Vital Signs" 
            description="Enter your current vital signs. Use tooltips for normal ranges." 
            icon={HeartIcon}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Temperature - Multiple Units */}
            <FormField 
              label="Body Temperature" 
              error={errors.body_temperature_value || errors.body_temperature_unit}
              tooltipText={tooltip.temperature}
            >
              <div className="flex gap-2">
                <select
                  {...register("body_temperature_unit")}
                  className={`${inputBase} ${errors.body_temperature_unit ? inputError : ""} w-40 text-sm py-2`}
                  aria-label="Temperature unit"
                >
                  <option value="C">°C</option>
                  <option value="F">°F</option>
                  <option value="K">K</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  {...register("body_temperature_value")}
                  className={`${inputBase} ${errors.body_temperature_value ? inputError : ""} w-20`}
                  placeholder={getTemperaturePlaceholder(temperatureUnit)}
                  aria-label="Body temperature"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Normal ranges: 36.1-37.2°C (97-99°F, 309-310K)
              </p>
            </FormField>

            <FormField label="Heart Rate (bpm)" tooltipText={tooltip.heartRate}>
              <input
                type="number"
                min="20"
                max="260"
                {...register("heart_rate_bpm")}
                className={inputBase}
                placeholder="e.g., 72"
              />
            </FormField>

            <FormField label="Respiratory Rate" tooltipText={tooltip.respiratoryRate}>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors">
              <input
                    type="radio"
                    value="difficulty"
                    {...register("respiratory_rate")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Difficulty in Breathing</span>
                    <span className="text-xs text-gray-500 mt-1">5-11 breaths/min</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    value="normal"
                    {...register("respiratory_rate")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Normal</span>
                    <span className="text-xs text-gray-500 mt-1">12-20 breaths/min</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    value="fast"
                    {...register("respiratory_rate")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Fast Breathing</span>
                    <span className="text-xs text-gray-500 mt-1">21-30+ breaths/min</span>
                  </div>
                </label>
              </div>
            </FormField>

            <FormField label="Oxygen Saturation (SpO₂ %)" tooltipText={tooltip.spo2}>
              <input
                type="number"
                min="50"
                max="100"
                {...register("spo2")}
                className={inputBase}
                placeholder="e.g., 98"
              />
            </FormField>

            <FormField label="Blood Pressure" tooltipText={tooltip.bloodPressure}>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="60"
                  max="250"
                  {...register("bp_systolic")}
                  className={`${inputBase} flex-1`}
                  placeholder="Systolic"
                  aria-label="Systolic blood pressure"
                />
                <span className="text-gray-400 font-medium">/</span>
                <input
                  type="number"
                  min="30"
                  max="150"
                  {...register("bp_diastolic")}
                  className={`${inputBase} flex-1`}
                  placeholder="Diastolic"
                  aria-label="Diastolic blood pressure"
                />
                <span className="text-sm text-gray-500">mmHg</span>
              </div>
            </FormField>
          </div>
        </section>

        {/* Symptoms Section */}
        <section className={`${cardBase} ${cardPadding}`}>
          <SectionHeading 
            title="Symptoms" 
            description="Select symptoms and indicate severity levels" 
            icon={ClipboardDocumentListIcon}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Checkbox toggles */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Symptom Checklist</h4>
              <div className="space-y-2.5">
                {symptomChecks.map((item) => (
                  <label
                    key={item.name}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      {...register(item.name)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Right: Severity radios */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Symptom Severity</h4>
              <div className="space-y-4">
                {severityGroups.map((group) => (
                  <div key={group.name} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-sm font-medium text-gray-700 mb-2.5">{group.label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {severities.map((level) => (
                        <label
                          key={level}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-md border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            value={level}
                            {...register(group.name)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-xs text-gray-700 capitalize">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional symptoms */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Cough Type">
                <div className="grid grid-cols-3 gap-2">
                  {["none", "dry", "wet"].map((type) => (
                    <label
                      key={type}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        value={type}
                        {...register("cough")}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Alcohol Consumption">
                <div className="grid grid-cols-3 gap-2">
                  {["none", "occasional", "regular"].map((option) => (
                    <label
                      key={option}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        value={option}
                        {...register("alcohol_consumption")}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="mt-6">
              <FormField label={`Body Pain Scale: ${bodyPainScale}/10`}>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    {...register("body_pain_scale")}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    aria-label="Body pain scale"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>No pain</span>
                    <span>Moderate</span>
                    <span>Severe pain</span>
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        </section>

        {/* Medical History & Location */}
        <section className={`${cardBase} ${cardPadding}`}>
          <SectionHeading 
            title="Medical History & Location" 
            icon={MapPinIcon}
          />
          <div className="space-y-6">
            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                {...register("medical_history")}
                className="mt-0.5 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">I have medical history / current medications</span>
                <p className="text-xs text-gray-500 mt-1">Please provide details below if checked</p>
              </div>
            </label>

            {medicalHistoryChecked && (
              <div className="ml-7">
                <textarea
                  rows={4}
                  placeholder="Type current medicines, conditions, or medical history..."
                  {...register("medical_history_text")}
                  className={`${inputBase} resize-none`}
                  aria-label="Medical history details"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="City / Town (optional)">
                <input
                  type="text"
                  {...register("location_city")}
                  className={inputBase}
                  placeholder="e.g., San Francisco"
                />
              </FormField>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className={buttonSecondary}
                >
                  <MapPinIcon className="w-4 h-4" />
                  Use my location
                </button>
                {(location.lat || location.lon) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" />
                    {location.lat}, {location.lon}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Consent & Submit */}
        <section className={`${cardBase} ${cardPadding} bg-gradient-to-br from-gray-50 to-white`}>
          <div className="space-y-6">
            <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-300 hover:border-primary-400 cursor-pointer transition-colors">
              <input
                type="checkbox"
                {...register("consent")}
                id="consent-checkbox"
                className="mt-0.5 w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                aria-required="true"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900">
                  I consent to analyze my symptoms and accept the disclaimer
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  By checking this box, you acknowledge that this service provides AI-driven symptom checking and is not a substitute for professional medical advice.
                </p>
              </div>
            </label>
            {errors.consent && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {errors.consent.message}
              </p>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  {error}
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${buttonPrimary} min-w-[200px] text-base py-3.5 shadow-lg hover:shadow-xl`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Evaluating...
                  </>
                ) : (
                  "Run Fever Check"
                )}
              </button>
            </div>
          </div>
        </section>
      </form>

      {/* Results Section */}
      {result && (
        <section className={`${sectionGap} mt-8 animate-in fade-in duration-500`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="text-xs sm:text-sm text-gray-600">
              {storedAnalysisMeta?.savedAt ? (
                <>
                  Saved to profile on{" "}
                  <span className="font-semibold text-gray-800">
                    {new Date(storedAnalysisMeta.savedAt).toLocaleString()}
                  </span>
                </>
              ) : (
                persistMessage || "Run the analysis while logged in to store it to your profile."
              )}
              {persistMessage && storedAnalysisMeta?.savedAt && (
                <p className="text-primary-600 text-xs mt-1">{persistMessage}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetStoredAnalysis}
                className={buttonSecondary}
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
          {/* Patient Information Summary */}
          <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-600" />
              Patient Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Age</p>
                <p className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const age = watch("age");
                    const ageUnit = watch("age_unit");
                    if (age) {
                      return `${age} ${ageUnit === "months" ? "months" : "years"}`;
                    }
                    return "Not provided";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gender</p>
                <p className="text-sm font-semibold text-gray-900">{watch("gender") || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Temperature</p>
                <p className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const temp = watch("body_temperature_value");
                    const tempUnit = watch("body_temperature_unit");
                    if (temp) {
                      const unitSymbol = tempUnit === "C" ? "°C" : tempUnit === "F" ? "°F" : "K";
                      return `${temp} ${unitSymbol}`;
                    }
                    return "Not provided";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Heart Rate</p>
                <p className="text-sm font-semibold text-gray-900">
                  {watch("heart_rate_bpm") ? `${watch("heart_rate_bpm")} bpm` : "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Final Combined Assessment */}
          {result.final_assessment && (
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Final AI Assessment</h2>
                  <p className="text-sm text-gray-700">
                    Most likely cause of fever:{" "}
                    <span className="font-semibold">
                      {result.final_assessment.primary_cause_label}
                    </span>{" "}
                    ({result.final_assessment.primary_cause_confidence}% confidence)
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Severity: <span className="font-semibold">{result.final_assessment.severity_label}</span>
                  </p>
                  {result.final_assessment.lab_model_explanation && (
                    <p className="text-xs text-indigo-900 mt-2">
                      Lab rationale: {result.final_assessment.lab_model_explanation}
                    </p>
                  )}
                  {result.final_assessment.rationale && (
                    <p className="text-xs text-gray-700 mt-1">
                      Symptom pattern: {result.final_assessment.rationale}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">Model confidences</p>
                  <p>
                    Symptom model:{" "}
                    {result.final_assessment.symptom_model_confidence != null
                      ? `${result.final_assessment.symptom_model_confidence}%`
                      : "N/A"}
                  </p>
                  <p>
                    Lab report model:{" "}
                    {result.final_assessment.lab_model_confidence != null
                      ? `${result.final_assessment.lab_model_confidence}%`
                      : "N/A"}
                  </p>
                  <p>
                    Infectious pattern: {result.final_assessment.infectious_primary}{" "}
                    {result.final_assessment.infectious_primary_confidence != null &&
                      `(${result.final_assessment.infectious_primary_confidence}%)`}
                  </p>
                  {result.final_assessment.infectious_secondary && (
                    <p>
                      Secondary: {result.final_assessment.infectious_secondary}{" "}
                      {result.final_assessment.infectious_secondary_confidence != null &&
                        `(${result.final_assessment.infectious_secondary_confidence}%)`}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                This combined assessment uses both your symptom pattern and lab report features. It is
                not a medical diagnosis; always confirm with a clinician.
              </p>
            </div>
          )}

          {/* Prediction Result Card with Severity Badge */}
          {(() => {
            const probability = result.prediction.probability;
            const probPercent = probability * 100;
            const label = result.prediction.label;
            const isHighFever = label === "High Fever";
            
            // Special handling for "High Fever" label
            let resultConfig;
            if (isHighFever) {
              if (probPercent < 50) {
                resultConfig = {
                  bg: "bg-yellow-50",
                  border: "border-yellow-200",
                  badge: "bg-yellow-100 text-yellow-700",
                  percentColor: "text-[#D97706]",
                  percentWeight: "font-bold",
                  chanceText: "Low chance of High Fever",
                  chanceColor: "text-yellow-800",
                };
              } else if (probPercent >= 50 && probPercent <= 75) {
                resultConfig = {
                  bg: "bg-orange-50",
                  border: "border-orange-200",
                  badge: "bg-orange-100 text-orange-700",
                  percentColor: "text-[#EA580C]",
                  percentWeight: "font-bold",
                  chanceText: "Moderate chance of High Fever",
                  chanceColor: "text-orange-800",
                };
              } else {
                resultConfig = {
                  bg: "bg-red-50",
                  border: "border-red-300",
                  badge: "bg-red-100 text-red-700",
                  percentColor: "text-[#DC2626]",
                  percentWeight: "font-black",
                  chanceText: "High chance of High Fever",
                  chanceColor: "text-red-800",
                };
              }
            } else {
              // Default behavior for other labels
              const severityLevel = probability < 0.40 ? "low" : probability < 0.70 ? "moderate" : probability < 0.90 ? "high" : "very_high";
              const severityConfig = {
                low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", badge: "bg-green-100 text-green-700" },
                moderate: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-700" },
                high: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
                very_high: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", badge: "bg-red-100 text-red-700" },
              };
              const config = severityConfig[severityLevel];
              resultConfig = {
                ...config,
                percentColor: "text-gray-900",
                percentWeight: "font-bold",
                chanceText: result.prediction.severity,
                chanceColor: config.text,
              };
            }
            
            return (
              <div 
                className={`rounded-xl border-2 ${resultConfig.border} ${resultConfig.bg} p-6 shadow-lg cursor-pointer transition-all hover:shadow-xl`}
                title="This is the model's confidence score for high fever based on your readings."
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Prediction Result</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-4 py-1.5 rounded-full ${resultConfig.badge} text-sm font-semibold`}>
                        {label}
                      </span>
                      <span 
                        className={`text-lg ${resultConfig.percentWeight} ${resultConfig.percentColor} transition-all duration-200 hover:scale-105`}
                        style={{ animation: 'popIn 0.2s ease-out' }}
                      >
                        {probPercent.toFixed(0)}%
                      </span>
                      <span className={`text-sm font-medium ${resultConfig.chanceColor}`}>
                        {isHighFever ? resultConfig.chanceText : `– ${resultConfig.chanceText}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {result.pdf_report_url && (
                      <a
                        href={result.pdf_report_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-primary-700 shadow-md hover:bg-primary-50 transition-colors"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        Download PDF
                      </a>
                    )}
                    <button
                      onClick={() => {
                        // Dispatch navigation event for Home component to handle
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'ai-assistant' } }));
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-600 bg-white px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      AI Assistant
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {(result.lab_prediction || result.symptom_prediction) && (
            <div className="grid gap-4 md:grid-cols-2">
              {result.symptom_prediction && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase text-gray-500 font-semibold mb-1">Symptom model</p>
                  <p className="text-lg font-bold text-gray-900">{result.symptom_prediction.label}</p>
                  <p className="text-sm text-gray-600">
                    Confidence: {(result.symptom_prediction.probability * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {result.lab_prediction && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                  <p className="text-xs uppercase text-indigo-600 font-semibold mb-1">Lab report model</p>
                  <p className="text-lg font-bold text-indigo-900">{result.lab_prediction.fever_type}</p>
                  <p className="text-sm text-indigo-800">
                    Confidence: {(result.lab_prediction.confidence * 100).toFixed(1)}%
                  </p>
                  {result.lab_prediction.explanation && (
                    <p className="text-xs text-indigo-700 mt-2">{result.lab_prediction.explanation}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fever Type Classification Card */}
          {result.fever_classification && (
            <div className="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <BeakerIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Fever Type Classification</h2>
              </div>
              
              {/* Primary Classification */}
              <div className="mb-6 p-4 rounded-lg bg-white border-2 border-primary-300 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {result.fever_classification.fever_type}
                    </h3>
                    {result.fever_classification.secondary_type && (
                      <p className="text-sm text-gray-600 mt-1">
                        Secondary: {result.fever_classification.secondary_type}
                        {result.fever_classification.secondary_confidence && (
                          <span className="ml-2 text-primary-600 font-medium">
                            ({result.fever_classification.secondary_confidence}% confidence)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {result.fever_classification.primary_confidence}%
                    </div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                </div>
                {result.fever_classification.rationale && (
                  <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-200">
                    {result.fever_classification.rationale}
                  </p>
                )}
              </div>

              {/* All Fever Types Confidence Chart - Bar Chart */}
              {result.fever_classification.all_confidences && (() => {
                const allConfidences = result.fever_classification.all_confidences;
                const primaryType = result.fever_classification.fever_type;
                const secondaryType = result.fever_classification.secondary_type;
                
                // Sort by confidence (highest first)
                const sortedEntries = Object.entries(allConfidences)
                  .sort(([, a], [, b]) => b - a);
                
                const labels = sortedEntries.map(([type]) => type);
                const dataValues = sortedEntries.map(([type, confidence]) => confidence);
                
                // Color coding: Primary = blue, Secondary = orange, High confidence = red/orange, Medium = yellow, Low = gray
                const backgroundColors = sortedEntries.map(([type, confidence]) => {
                  if (type === primaryType) {
                    return '#3B82F6'; // Blue for primary
                  } else if (type === secondaryType) {
                    return '#F97316'; // Orange for secondary
                  } else if (confidence >= 50) {
                    return '#EF4444'; // Red for high confidence
                  } else if (confidence >= 30) {
                    return '#F59E0B'; // Amber for medium-high
                  } else if (confidence >= 15) {
                    return '#EAB308'; // Yellow for medium
                  } else {
                    return '#9CA3AF'; // Gray for low
                  }
                });
                
                const borderColors = sortedEntries.map(([type]) => {
                  if (type === primaryType) {
                    return '#2563EB'; // Darker blue border
                  } else if (type === secondaryType) {
                    return '#EA580C'; // Darker orange border
                  }
                  return '#6B7280'; // Gray border
                });
                
                const borderWidths = sortedEntries.map(([type]) => {
                  return (type === primaryType || type === secondaryType) ? 3 : 1;
                });
                
                const chartData = {
                  labels: labels,
                  datasets: [
                    {
                      label: 'Confidence (%)',
                      data: dataValues,
                      backgroundColor: backgroundColors,
                      borderColor: borderColors,
                      borderWidth: borderWidths,
                      borderRadius: 6,
                      borderSkipped: false,
                    },
                  ],
                };
                
                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: {
                        size: 14,
                        weight: 'bold',
                      },
                      bodyFont: {
                        size: 13,
                      },
                      callbacks: {
                        title: function(context) {
                          return context[0].label;
                        },
                        label: function(context) {
                          const typeName = context.label;
                          const confidence = context.parsed.y;
                          let label = `${confidence}% confidence`;
                          if (typeName === primaryType) {
                            label += ' (Primary Diagnosis)';
                          } else if (typeName === secondaryType) {
                            label += ' (Secondary Diagnosis)';
                          }
                          return label;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        stepSize: 10,
                        callback: function(value) {
                          return value + '%';
                        },
                        font: {
                          size: 11,
                        },
                        color: '#6B7280',
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      title: {
                        display: true,
                        text: 'Confidence Level (%)',
                        font: {
                          size: 12,
                          weight: 'bold',
                        },
                        color: '#374151',
                      },
                    },
                    x: {
                      ticks: {
                        font: {
                          size: 11,
                          weight: '500',
                        },
                        color: '#374151',
                        maxRotation: 45,
                        minRotation: 45,
                      },
                      grid: {
                        display: false,
                      },
                    },
                  },
                };
                
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                      All Fever Types Confidence Levels
                    </h4>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div style={{ height: '400px', position: 'relative' }}>
                        <Bar data={chartData} options={chartOptions} />
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600"></div>
                        <span className="text-gray-700 font-medium">Primary Diagnosis</span>
                      </div>
                      {secondaryType && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-orange-500 border-2 border-orange-600"></div>
                          <span className="text-gray-700 font-medium">Secondary Diagnosis</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span className="text-gray-700">High (≥50%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-500"></div>
                        <span className="text-gray-700">Medium (30-49%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500"></div>
                        <span className="text-gray-700">Low (15-29%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-400"></div>
                        <span className="text-gray-700">Very Low (&lt;15%)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Emergency Warning for Very High Fever */}
          {result.prediction.probability >= 0.90 && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-6 shadow-lg animate-pulse">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-2">⚠️ Emergency - Immediate Medical Attention Required</h3>
                  <p className="text-sm text-red-800 mb-3">
                    Your fever is very high. Please seek immediate medical care. Do not delay.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-red-800 space-y-1 mb-4">
                    <li>Contact your doctor immediately or visit the nearest emergency room</li>
                    <li>Do NOT take multiple medications without medical supervision</li>
                    <li>Monitor symptoms closely and seek help if condition worsens</li>
                  </ul>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'doctor-list' } }));
                    }}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
                  >
                    Book a Doctor Immediately
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* High Fever Warning Banner */}
          {result.prediction.probability >= 0.70 && result.prediction.probability < 0.90 && (
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-5 shadow-md">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-900 mb-1">High Fever Detected</h3>
                  <p className="text-sm text-orange-800 mb-3">
                    Please consult with a healthcare professional. Monitor your symptoms and seek medical advice if they persist or worsen.
                  </p>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'doctor-list' } }));
                    }}
                    className="bg-orange-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    Book a Doctor Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Precautions Card */}
          <div className="rounded-xl border border-gray-200 bg-blue-50 p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Precautions</h3>
            </div>
            <ul className="space-y-2.5">
              {result.suggestions?.precautions?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Diet Plan Card */}
          <div className="rounded-xl border border-gray-200 bg-green-50 p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <BeakerIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Diet Plan</h3>
            </div>
            <ul className="space-y-2.5">
              {result.suggestions?.dietPlan?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-green-600 mt-1">•</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Medication Suggestions - Dynamic Cards */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Medication Suggestions</h3>
              <p className="text-xs text-gray-500">Example guidance — verify with a clinician before use.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {result.suggestions?.medications?.map((med) => (
                <div
                  key={med.id}
                  className={`rounded-xl border-2 p-5 transition-all hover:shadow-lg ${
                    med.emergency
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white hover:border-primary-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900">{med.name}</h4>
                    {med.clinicianVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <CheckCircleIcon className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {med.dosage && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dosage</p>
                      <p className="text-sm text-gray-700 mt-0.5">{med.dosage}</p>
                    </div>
                  )}
                  
                  {med.interval && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Interval</p>
                      <p className="text-sm text-gray-700 mt-0.5">{med.interval}</p>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-3">{med.guidance}</p>
                  
                  {med.caution && med.caution.length > 0 && (
                    <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-medium text-yellow-800 mb-1">Cautions:</p>
                      <ul className="text-xs text-yellow-700 space-y-0.5">
                        {med.caution.map((caution, idx) => (
                          <li key={idx}>• {caution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {med.source && (
                    <a
                      href={med.source}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Reference
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Hospitals Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">Nearby Hospitals</h3>
              </div>
              {(() => {
                const location = result.location || (result.fever_classification ? null : null);
                if (location) {
                  if (location.city) {
                    return <span className="text-sm text-gray-600">📍 {location.city}</span>;
                  } else if (location.lat && location.lon) {
                    return <span className="text-sm text-gray-600">📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</span>;
                  }
                }
                return null;
              })()}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {result.hospitals?.length ? (
                result.hospitals.map((hospital) => (
                  <div
                    key={hospital.name}
                    className="rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <h4 className="text-base font-semibold text-gray-900 mb-2">{hospital.name}</h4>
                    {hospital.address && (
                      <p className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                        <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{hospital.address}</span>
                      </p>
                    )}
                    {hospital.distance_km && (
                      <p className="text-xs text-gray-500 mb-3">Approx. {hospital.distance_km} km away</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {hospital.phone && (
                        <a
                          href={`tel:${hospital.phone}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          <PhoneIcon className="w-4 h-4" />
                          Call
                        </a>
                      )}
                      {hospital.map_url && (
                        <a
                          href={hospital.map_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border-2 border-primary-600 bg-white px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          Directions
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>No hospitals found for the provided location.</strong>
                  </p>
                  {result.location ? (
                    <p className="text-xs text-gray-600">
                      Location used: {result.location.city || `${result.location.lat?.toFixed(4)}, ${result.location.lon?.toFixed(4)}`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">
                      Please provide your city name or enable location services to find nearby hospitals.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
        <p className="flex items-start gap-2">
          <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            This service provides AI-driven symptom checking and is not a substitute for professional medical advice, diagnosis, or treatment. In emergencies call local emergency services.
          </span>
        </p>
      </div>

      </div>
    </>
  );
}
