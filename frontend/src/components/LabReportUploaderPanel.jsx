import React, { useMemo, useState } from "react";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { uploadLabReport } from "../services/labReportService";

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

export default function LabReportUploaderPanel({
  uploadInfo,
  onUploadComplete,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const extractedEntries = useMemo(() => {
    if (!uploadInfo?.structured_values) return [];
    return Object.entries(uploadInfo.structured_values).map(([key, value]) => ({
      key,
      label: fieldLabels[key] || key,
      value: value != null ? String(value) : null,
    }));
  }, [uploadInfo]);

  const handleFileSelect = (file) => {
    if (!file) return;
    setError("");
    setSuccessMessage("");
    setIsUploading(true);
    uploadLabReport(file)
      .then((data) => {
        const extractedCount = Object.values(data.structured_values || {}).filter(
          (v) => v != null
        ).length;
        setSuccessMessage(
          `✅ Lab report processed. Extracted ${extractedCount} parameter${
            extractedCount === 1 ? "" : "s"
          }.`
        );
        onUploadComplete?.(data);
      })
      .catch((err) => {
        console.error("[LabReportUploaderPanel] Upload error:", err);
        setError(
          err.message ||
            "Unable to extract lab report. Please ensure the file is a clear PDF or image."
        );
      })
      .finally(() => setIsUploading(false));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  return (
    <section className="space-y-4">
      <div
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
            <p className="text-lg font-semibold text-gray-900">Upload Lab Report</p>
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
              Extracting medical values…
            </div>
          )}
          {uploadInfo && !isUploading && (
            <p className="text-sm text-green-600 font-medium">
              Latest upload: {uploadInfo.file?.name || "Report"}
            </p>
          )}
        </div>
      </div>

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

      {uploadInfo && (
        <div className="rounded-2xl bg-white border border-gray-200">
          <div className="border-b border-gray-100 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Extracted Lab Values</p>
              <p className="text-xs text-gray-500">
                OCR provider: {uploadInfo.provider?.replace("_", " ")} • Detected markers:{" "}
                {uploadInfo.detected_markers?.length
                  ? uploadInfo.detected_markers.join(", ")
                  : "None"}
              </p>
            </div>
            {uploadInfo.text_preview && (
              <details className="text-xs">
                <summary className="cursor-pointer text-primary-600 hover:text-primary-700">
                  View OCR Text
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-40 text-gray-700 whitespace-pre-wrap">
                  {uploadInfo.text_preview}
                </pre>
              </details>
            )}
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="pb-2">Parameter</th>
                  <th className="pb-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {extractedEntries.length ? (
                  extractedEntries.map((entry) => (
                    <tr key={entry.key} className="border-t border-gray-100">
                      <td className="py-2 font-medium text-gray-800">{entry.label}</td>
                      <td
                        className={`py-2 ${
                          entry.value != null ? "text-gray-900 font-semibold" : "text-gray-400 italic"
                        }`}
                      >
                        {entry.value != null ? entry.value : "Not detected"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-gray-500 italic">
                      No lab values extracted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}


