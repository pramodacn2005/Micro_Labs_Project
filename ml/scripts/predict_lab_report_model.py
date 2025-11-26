import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from joblib import load
from train_lab_report_model import (
  MODEL_PATH,
  FEATURE_COLUMNS,
  train_model,
)

DEFAULT_VALUES = {
  "wbc_count": 7200,
  "rbc_count": 4.5,
  "platelet_count": 240000,
  "hemoglobin": 13.5,
  "crp": 5.0,
  "esr": 18,
  "neutrophils": 55,
  "lymphocytes": 32,
  "temperature_c": 37.0,
  "spo2": 97,
  "heart_rate_bpm": 80,
}

def ensure_model():
  if not MODEL_PATH.exists():
    train_model()

def build_row(values):
  row = {}
  for feature in FEATURE_COLUMNS:
    val = values.get(feature)
    row[feature] = DEFAULT_VALUES[feature] if val in (None, "", "null") else float(val)
  return pd.DataFrame([row])

def adjust_with_markers(prediction, markers):
  markers = markers or []
  if any("Dengue" in marker for marker in markers):
    return "Dengue", 0.9
  if any("Malaria" in marker for marker in markers):
    return "Malaria", 0.85
  if any("Typhoid" in marker for marker in markers):
    return "Typhoid", 0.82
  return prediction

def build_explanation(values, label):
  reasons = []
  if values.get("wbc_count") and values["wbc_count"] > 12000:
    reasons.append("Elevated WBC count suggests bacterial stress.")
  if values.get("platelet_count") and values["platelet_count"] < 150000:
    reasons.append("Low platelet count consistent with viral hemorrhagic fevers.")
  if values.get("crp") and values["crp"] > 15:
    reasons.append("CRP above 15 mg/L indicates ongoing inflammation.")
  if values.get("temperature_c") and values["temperature_c"] >= 39:
    reasons.append("High temperature observed in report.")
  if not reasons:
    reasons.append(f"Pattern of labs aligned with {label}.")
  return " ".join(reasons)

def predict(payload):
  ensure_model()
  artifact = load(MODEL_PATH)
  model = artifact["model"]
  lab_values = payload.get("lab_values", {})
  markers = payload.get("markers")
  row = build_row(lab_values)
  probabilities = model.predict_proba(row)[0]
  classes = model.classes_
  max_idx = int(np.argmax(probabilities))
  fever_type = classes[max_idx]
  confidence = float(probabilities[max_idx])
  fever_type, confidence = adjust_with_markers((fever_type, confidence), markers)
  explanation = build_explanation(lab_values, fever_type)
  return {
    "fever_type": fever_type,
    "confidence": round(confidence, 4),
    "explanation": explanation,
  }

def main():
  raw = sys.stdin.read()
  payload = json.loads(raw or "{}")
  data = payload.get("payload", {})
  result = predict(data)
  print(json.dumps(result))

if __name__ == "__main__":
  main()




