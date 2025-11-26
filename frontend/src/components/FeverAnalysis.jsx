import React, { useState } from "react";
import LabReportUploaderPanel from "./LabReportUploaderPanel";
import FeverChecker from "./FeverChecker";

export default function FeverAnalysis() {
  const [labUploadInfo, setLabUploadInfo] = useState(null);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white p-8 shadow-xl">
        <p className="text-sm uppercase tracking-wide text-primary-200 mb-2">Fever Analysis</p>
        <h1 className="text-3xl font-bold mb-3">Combine Lab Reports & Symptoms</h1>
        <p className="text-primary-50 max-w-3xl">
          Upload your lab report, review extracted clinical values, and complete the symptom form
          to run a unified fever prediction with personalized precautions and safe medication tips.
        </p>
      </div>

      <LabReportUploaderPanel
        uploadInfo={labUploadInfo}
        onUploadComplete={setLabUploadInfo}
      />

      <FeverChecker
        labValues={labUploadInfo?.structured_values}
        labUploadInfo={labUploadInfo}
      />
    </div>
  );
}


