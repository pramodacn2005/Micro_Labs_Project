import React, { useState, useMemo } from "react";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import AssistantChatModal from "./AssistantChatModal";
import { uploadLabReport, predictLabReport } from "../services/labReportService";

const severityStyles = {
  green: "bg-green-50 border-green-200 text-green-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  red: "bg-red-50 border-red-200 text-red-800",
};

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

const fieldLabels = {
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

export default function UploadLabReport() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [uploadInfo, setUploadInfo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [patient, setPatient] = useState({ name: "", age: 32, gender: "Female" });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);

  const extractedEntries = useMemo(() => {
    if (!uploadInfo?.structured_values) return [];
    return Object.entries(uploadInfo.structured_values)
      .map(([key, value]) => ({
        key,
        label: fieldLabels[key] || key,
        value: value != null ? String(value) : null,
      }));
    // Show all entries, even if null, so user can see what was searched for
  }, [uploadInfo]);

  const handleFileSelect = (file) => {
    if (!file) return;
    setError("");
    setSuccessMessage("");
    setIsUploading(true);
    setAnalysis(null);
    setUploadInfo(null);
    uploadLabReport(file)
      .then((data) => {
        console.log("[UploadLabReport] Upload success:", data);
        setUploadInfo(data);
        const extractedCount = Object.values(data.structured_values || {}).filter(v => v != null).length;
        setSuccessMessage(
          `✅ Lab report uploaded successfully! Extracted ${extractedCount} parameter${extractedCount !== 1 ? 's' : ''} from ${data.file?.name || 'file'}.`
        );
      })
      .catch((err) => {
        console.error("[UploadLabReport] Upload error:", err);
        setError(err.message || "Unable to extract lab report. Please check the file format and try again.");
      })
      .finally(() => setIsUploading(false));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleRunAnalysis = async () => {
    if (!uploadInfo?.uploadId) return;
    setError("");
    setIsPredicting(true);
    try {
      const payload = {
        uploadId: uploadInfo.uploadId,
        patient: {
          name: patient.name || "Patient",
          age: Number(patient.age),
          gender: patient.gender,
        },
      };
      const response = await predictLabReport(payload);
      setAnalysis(response);
    } catch (err) {
      setError(err.message || "Unable to run analysis.");
    } finally {
      setIsPredicting(false);
    }
  };

  const severityClass =
    analysis?.severity?.badge && severityStyles[analysis.severity.badge]
      ? severityStyles[analysis.severity.badge]
      : severityStyles.green;

  const dispatchDoctorNavigation = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "doctor-list" } }));
  };

  const onAskAssistant = () => {
    if (analysis?.assistant_session_id) {
      setAssistantOpen(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white p-8 shadow-xl">
        <p className="text-sm uppercase tracking-wide text-primary-200 mb-2">Upload Lab Report → AI Fever Analysis</p>
        <h1 className="text-3xl font-bold mb-3">Upload Lab Report</h1>
        <p className="text-primary-50 max-w-3xl">
          Drag & drop PDF/JPG lab reports, let government-grade OCR extract key values, and run our AI fever classifier to
          predict fever type, safety warnings, and clinician-ready PDF reports.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload card */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed ${
          isDragging ? "border-primary-500 bg-primary-50/60" : "border-gray-300 bg-white"
        } p-6 transition`}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <CloudArrowUpIcon className="w-12 h-12 text-primary-500" />
          <div>
            <p className="text-lg font-semibold text-gray-900">Drag & drop lab report</p>
            <p className="text-sm text-gray-500">Supports PDF, JPG, PNG – up to 10MB</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 cursor-pointer">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(event) => handleFileSelect(event.target.files?.[0])}
            />
            Choose File
          </label>
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-primary-700 font-medium">
              <ArrowDownTrayIcon className="w-4 h-4 animate-bounce" />
              <span>Extracting medical values from lab report…</span>
            </div>
          )}
          {uploadInfo && !isUploading && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <span>✓</span>
              <span>Upload complete - {uploadInfo.file?.name || "file processed"}</span>
            </div>
          )}
        </div>
      </section>

      {/* Patient metadata */}
      <section className="rounded-2xl bg-white border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient Name</label>
          <input
            type="text"
            value={patient.name}
            onChange={(event) => setPatient((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</label>
          <input
            type="number"
            min="0"
            max="120"
            value={patient.age}
            onChange={(event) => setPatient((prev) => ({ ...prev, age: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
          <select
            value={patient.gender}
            onChange={(event) => setPatient((prev) => ({ ...prev, gender: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {genderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Extracted values */}
      {uploadInfo && (
        <section className="rounded-2xl bg-white border border-gray-200">
          <div className="border-b border-gray-100 p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Extracted Lab Values</p>
                <p className="text-xs text-gray-500">
                  OCR provider: {uploadInfo.provider?.replace("_", " ")} • Detected markers:{" "}
                  {uploadInfo.detected_markers?.length ? uploadInfo.detected_markers.join(", ") : "None"}
                </p>
              </div>
            </div>
            {uploadInfo.text_preview && (
              <details className="text-xs">
                <summary className="cursor-pointer text-primary-600 hover:text-primary-700">View OCR Text</summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-40 text-gray-700 whitespace-pre-wrap">
                  {uploadInfo.text_preview}
                </pre>
              </details>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="pb-2">Parameter</th>
                  <th className="pb-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {extractedEntries.length > 0 ? (
                  extractedEntries.map((entry) => (
                    <tr key={entry.key} className="border-t border-gray-100">
                      <td className="py-2 font-medium text-gray-800">{entry.label}</td>
                      <td className={`py-2 ${entry.value != null ? "text-gray-900 font-semibold" : "text-gray-400 italic"}`}>
                        {entry.value != null ? entry.value : "Not found in report"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-gray-500 italic">
                      No lab values extracted. The OCR may not have detected structured data. Try uploading a clearer image or PDF.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRunAnalysis}
          disabled={!uploadInfo?.uploadId || isPredicting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-40"
        >
          <SparklesIcon className="w-4 h-4" />
          {isPredicting ? "Running AI Analysis…" : "Run AI Fever Analysis"}
        </button>
        {analysis?.pdf_report_url && (
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            href={analysis.pdf_report_url}
            target="_blank"
            rel="noreferrer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download PDF Report
          </a>
        )}
        {analysis?.doctor_recommendation_route && (
          <button
            onClick={dispatchDoctorNavigation}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-500 px-5 py-3 text-sm font-semibold text-primary-600 hover:bg-primary-50"
          >
            Book Doctor
          </button>
        )}
      </div>

      {/* Analysis cards */}
      {analysis && (
        <section className="space-y-6">
          <div className={`rounded-2xl border ${severityClass} p-6`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase text-gray-500">Fever type</p>
                <h2 className="text-2xl font-semibold text-gray-900">{analysis.prediction?.fever_type}</h2>
                <p className="text-sm text-gray-600 mt-1">{analysis.prediction?.explanation}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round((analysis.prediction?.confidence || 0) * 100)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Severity: {analysis.severity?.label} (score {analysis.severity?.score})
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide bg-white/60 border border-white/80 rounded-full px-3 py-1">
                {analysis.severity?.recommendation}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide bg-white/60 border border-white/80 rounded-full px-3 py-1">
                Safety Verified OCR
              </span>
            </div>
          </div>

          {/* Medications */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Medication plan</p>
                <p className="text-xs text-gray-500">OTC-safe guidance – verify doses with clinician.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.medications?.map((med) => (
                <div key={med.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{med.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full border">
                      {med.clinicianVerified ? "Clinician verified" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{med.guidance}</p>
                  {med.dosage && <p className="text-xs text-gray-500 mt-1">Dose: {med.dosage}</p>}
                  {med.caution?.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2">Caution: {med.caution.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings?.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-2 text-red-800 font-semibold">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Safety Warnings
              </div>
              <ul className="mt-3 list-disc pl-6 text-sm text-red-900 space-y-1">
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onAskAssistant}
              disabled={!analysis.assistant_session_id}
              className="rounded-xl bg-primary-600 text-white px-5 py-3 text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 flex items-center gap-2"
            >
              Ask AI Assistant
            </button>
            <button
              onClick={dispatchDoctorNavigation}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Visit Appointment Module
            </button>
          </div>
        </section>
      )}

      <p className="text-xs text-gray-500 text-center">
        This is AI-assisted guidance, not a medical diagnosis. In emergencies call your local emergency number immediately.
      </p>

      <AssistantChatModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        sessionId={analysis?.assistant_session_id}
        context={{ prediction: analysis?.prediction }}
      />
    </div>
  );
}


