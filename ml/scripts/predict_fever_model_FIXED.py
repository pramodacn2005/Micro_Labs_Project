"""
FIXED VERSION - Use this to replace predict_fever_model.py
Key fixes:
1. Correct probability calculation (use predicted class prob, not max)
2. Clinical temperature override logic
3. Enhanced debugging
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import shap
from joblib import load
from train_fever_model import (
  MODEL_PATH,
  NUMERIC_FEATURES,
  BOOLEAN_FEATURES,
  CATEGORICAL_FEATURES,
  derive_features,
  train_model,
)

LABEL_MAP = {
  0: "No Fever",
  1: "Low Fever",
  2: "Moderate Fever",
  3: "High Fever",
}


def ensure_model():
  if not MODEL_PATH.exists():
    train_model({})


def normalize_payload(payload: dict) -> pd.DataFrame:
  record = {}
  
  # Debug: Check for critical missing features
  missing_critical = []
  if payload.get('temperature_c') is None:
    missing_critical.append('temperature_c')
  if payload.get('age') is None:
    missing_critical.append('age')
  
  if missing_critical:
    print(f"[WARNING] Missing critical features: {missing_critical}", file=sys.stderr)
  
  print(f"[DEBUG] Input payload keys: {list(payload.keys())}", file=sys.stderr)
  print(f"[DEBUG] Temperature (C): {payload.get('temperature_c')}", file=sys.stderr)
  print(f"[DEBUG] Heart rate: {payload.get('heart_rate_bpm')}", file=sys.stderr)
  print(f"[DEBUG] Respiratory rate: {payload.get('respiratory_rate_bpm')}", file=sys.stderr)
  print(f"[DEBUG] SpO2: {payload.get('spo2')}", file=sys.stderr)
  print(f"[DEBUG] Vomiting: {payload.get('vomiting')}", file=sys.stderr)
  
  for field in NUMERIC_FEATURES:
    record[field] = payload.get(field)
  for field in BOOLEAN_FEATURES:
    record[field] = bool(payload.get(field, False))
  for field in CATEGORICAL_FEATURES:
    record[field] = payload.get(field) or "unknown"
  df = pd.DataFrame([record])
  df = derive_features(df)
  
  print(f"[DEBUG] DataFrame shape: {df.shape}", file=sys.stderr)
  print(f"[DEBUG] DataFrame columns: {list(df.columns)}", file=sys.stderr)
  if 'temperature_c' in df.columns:
    print(f"[DEBUG] Temperature in DF: {df['temperature_c'].values[0]}", file=sys.stderr)
  if 'fever_flag' in df.columns:
    print(f"[DEBUG] fever_flag derived: {df['fever_flag'].values[0]}", file=sys.stderr)
  if 'tachycardia' in df.columns:
    print(f"[DEBUG] tachycardia derived: {df['tachycardia'].values[0]}", file=sys.stderr)
  print(f"[DEBUG] Missing values:\n{df.isnull().sum().to_dict()}", file=sys.stderr)
  
  return df


def severity_bucket(prob):
  if prob is None:
    return "unknown"
  if prob < 0.2:
    return "very unlikely"
  if prob < 0.5:
    return "low"
  if prob < 0.75:
    return "moderate"
  return "high"


def compute_shap_values(model, X):
  try:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    transformed = preprocessor.transform(X)
    if hasattr(transformed, "toarray"):
      transformed = transformed.toarray()
    explainer = shap.TreeExplainer(classifier)
    shap_values = explainer.shap_values(transformed)
    feature_names = preprocessor.get_feature_names_out()

    class_index = np.argmax(classifier.predict_proba(transformed), axis=1)[0]
    
    # Handle different SHAP output formats
    if isinstance(shap_values, list):
      if class_index < len(shap_values):
        class_shap = shap_values[class_index]
        if class_shap.ndim > 1:
          class_shap = class_shap[0]
      else:
        class_shap = shap_values[0]
        if class_shap.ndim > 1:
          class_shap = class_shap[0]
    elif isinstance(shap_values, np.ndarray):
      if shap_values.ndim == 3:
        if class_index < shap_values.shape[0]:
          class_shap = shap_values[class_index][0]
        else:
          class_shap = shap_values[0][0]
      elif shap_values.ndim == 2:
        class_shap = shap_values[0]
      else:
        class_shap = shap_values
    else:
      class_shap = shap_values[0] if hasattr(shap_values, '__getitem__') else shap_values
      if isinstance(class_shap, np.ndarray) and class_shap.ndim > 1:
        class_shap = class_shap[0]
    
    if isinstance(class_shap, np.ndarray) and class_shap.ndim > 1:
      class_shap = class_shap.flatten()
    
    if not isinstance(class_shap, np.ndarray) or len(class_shap) == 0:
      return []
    
    ordering = np.argsort(np.abs(class_shap))[::-1][:5]
    top_features = []
    for idx in ordering:
      if idx < len(feature_names) and idx < len(class_shap):
        top_features.append(
          {
            "feature": feature_names[idx],
            "importance": float(abs(class_shap[idx])),
            "direction": "positive" if class_shap[idx] >= 0 else "negative",
          }
        )
    return top_features
  except Exception as e:
    print(f"Warning: SHAP computation failed: {e}", file=sys.stderr)
    return []


def predict(payload: dict):
  ensure_model()
  model = load(MODEL_PATH)
  df = normalize_payload(payload)
  
  # ✅ CLINICAL OVERRIDE: Temperature-based logic
  temperature = payload.get('temperature_c')
  
  if temperature is not None:
    if temperature >= 39.0:
      # Very high fever - override to High Fever class
      print(f"[CLINICAL] Temperature {temperature}°C >= 39°C → High Fever", file=sys.stderr)
      prediction = 3  # High Fever
      probabilities = model.predict_proba(df)[0]
      # Boost high fever probability
      probabilities[3] = min(0.95, probabilities[3] + 0.4)
      probabilities = probabilities / probabilities.sum()
    elif temperature >= 38.0:
      # Fever detected - ensure not "No Fever"
      print(f"[CLINICAL] Temperature {temperature}°C >= 38°C → Fever detected", file=sys.stderr)
      prediction = model.predict(df)[0]
      probabilities = model.predict_proba(df)[0]
      # If model predicts "No Fever" but temp >= 38°C, override
      if prediction == 0:
        print(f"[CLINICAL] Override: Model predicted No Fever but temp >= 38°C", file=sys.stderr)
        # Use Moderate or High Fever based on temperature
        prediction = 2 if temperature < 39.0 else 3
        probabilities[prediction] = min(0.90, probabilities[prediction] + 0.3)
        probabilities[0] = max(0.05, probabilities[0] - 0.3)  # Reduce No Fever prob
        probabilities = probabilities / probabilities.sum()
    else:
      # Normal prediction
      prediction = model.predict(df)[0]
      probabilities = model.predict_proba(df)[0]
  else:
    # No temperature provided - use model prediction
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
  
  # ✅ FIX: Use probability of predicted class, not max probability
  predicted_class_idx = int(prediction)
  predicted_prob = float(probabilities[predicted_class_idx])
  
  # For debugging: also return all probabilities
  all_class_probs = {
    LABEL_MAP[i]: float(prob) for i, prob in enumerate(probabilities)
  }
  
  label = LABEL_MAP.get(predicted_class_idx, "Unknown")
  
  # Debug output
  print(f"[DEBUG] Prediction: class {predicted_class_idx} ({label})", file=sys.stderr)
  print(f"[DEBUG] Probability of predicted class: {predicted_prob:.2%}", file=sys.stderr)
  print(f"[DEBUG] All class probabilities: {all_class_probs}", file=sys.stderr)
  print(f"[DEBUG] Max probability: {np.max(probabilities):.2%} (class {np.argmax(probabilities)})", file=sys.stderr)
  
  shap_features = compute_shap_values(model, df)

  return {
    "prediction": {
      "label": label,
      "probability": predicted_prob,
      "severity": severity_bucket(predicted_prob).title() + " probability",
    },
    "explainability": {
      "top_features": shap_features,
    },
    "debug": {
      "all_class_probabilities": all_class_probs,
      "predicted_class_index": predicted_class_idx,
    }
  }


def main():
  raw = sys.stdin.read()
  payload = json.loads(raw or "{}")
  data = payload.get("payload", {})
  result = predict(data)
  print(json.dumps(result))


if __name__ == "__main__":
  main()











