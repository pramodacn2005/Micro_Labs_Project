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
  
  print(f"[DEBUG] Input payload - Temperature (C): {payload.get('temperature_c')}, Heart rate: {payload.get('heart_rate_bpm')}, SpO2: {payload.get('spo2')}", file=sys.stderr)
  
  for field in NUMERIC_FEATURES:
    record[field] = payload.get(field)
  for field in BOOLEAN_FEATURES:
    record[field] = bool(payload.get(field, False))
  for field in CATEGORICAL_FEATURES:
    record[field] = payload.get(field) or "unknown"
  df = pd.DataFrame([record])
  df = derive_features(df)
  
  # Debug derived features
  if 'temperature_c' in df.columns:
    print(f"[DEBUG] Temperature in DF: {df['temperature_c'].values[0]}", file=sys.stderr)
  if 'fever_flag' in df.columns:
    print(f"[DEBUG] fever_flag derived: {df['fever_flag'].values[0]}", file=sys.stderr)
  if 'tachycardia' in df.columns:
    print(f"[DEBUG] tachycardia derived: {df['tachycardia'].values[0]}", file=sys.stderr)
  
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
    # For multi-class: shap_values can be a list of arrays or a 3D array
    # For binary: shap_values can be a single 2D array
    if isinstance(shap_values, list):
      # List format: one array per class
      if class_index < len(shap_values):
        class_shap = shap_values[class_index]
        if class_shap.ndim > 1:
          class_shap = class_shap[0]  # Get first sample
      else:
        # Fallback to first class if index out of bounds
        class_shap = shap_values[0]
        if class_shap.ndim > 1:
          class_shap = class_shap[0]
    elif isinstance(shap_values, np.ndarray):
      # Array format: check dimensions
      if shap_values.ndim == 3:
        # 3D array: (n_classes, n_samples, n_features)
        if class_index < shap_values.shape[0]:
          class_shap = shap_values[class_index][0]
        else:
          class_shap = shap_values[0][0]
      elif shap_values.ndim == 2:
        # 2D array: (n_samples, n_features) - single class or binary
        class_shap = shap_values[0]
      else:
        # 1D array: single sample, single class
        class_shap = shap_values
    else:
      # Fallback: try to get first element
      class_shap = shap_values[0] if hasattr(shap_values, '__getitem__') else shap_values
      if isinstance(class_shap, np.ndarray) and class_shap.ndim > 1:
        class_shap = class_shap[0]
    
    # Ensure class_shap is 1D
    if isinstance(class_shap, np.ndarray) and class_shap.ndim > 1:
      class_shap = class_shap.flatten()
    
    # Safety check: ensure we have valid data
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
    # If SHAP computation fails, return empty list rather than crashing
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
      
      # Ensure high fever probability is at least 85% (0.85)
      # Calculate how much to boost based on temperature severity
      base_prob = probabilities[3]
      if temperature >= 40.0:
        # Very high fever (40°C+) - set to 92-95%
        target_prob = 0.92 + (temperature - 40.0) * 0.03  # 40°C = 92%, 41°C = 95%
        target_prob = min(0.98, target_prob)
      elif temperature >= 39.5:
        # High fever (39.5-40°C) - set to 88-92%
        target_prob = 0.88 + (temperature - 39.5) * 0.08  # 39.5°C = 88%, 40°C = 92%
      else:
        # Moderate-high fever (39.0-39.5°C) - set to 85-88%
        target_prob = 0.85 + (temperature - 39.0) * 0.06  # 39.0°C = 85%, 39.5°C = 88%
      
      # Set high fever probability to target, redistribute others
      probabilities[3] = target_prob
      remaining_prob = 1.0 - target_prob
      
      # Redistribute remaining probability proportionally to other classes
      other_probs_sum = sum(probabilities[i] for i in range(4) if i != 3)
      if other_probs_sum > 0:
        for i in range(4):
          if i != 3:
            probabilities[i] = (probabilities[i] / other_probs_sum) * remaining_prob
      else:
        # Fallback: distribute evenly
        for i in range(4):
          if i != 3:
            probabilities[i] = remaining_prob / 3
      
      # Ensure probabilities sum to 1.0
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
        if temperature >= 38.5:
          prediction = 3  # High Fever
          target_prob = 0.80 + (temperature - 38.5) * 0.10  # 38.5°C = 80%, 39°C = 85%
        else:
          prediction = 2  # Moderate Fever
          target_prob = 0.70 + (temperature - 38.0) * 0.20  # 38.0°C = 70%, 38.5°C = 80%
        
        probabilities[prediction] = target_prob
        remaining_prob = 1.0 - target_prob
        
        # Redistribute remaining probability
        other_probs_sum = sum(probabilities[i] for i in range(4) if i != prediction)
        if other_probs_sum > 0:
          for i in range(4):
            if i != prediction:
              probabilities[i] = (probabilities[i] / other_probs_sum) * remaining_prob
        else:
          for i in range(4):
            if i != prediction:
              probabilities[i] = remaining_prob / 3
        
        probabilities = probabilities / probabilities.sum()
      else:
        # Model predicted fever correctly, but boost probability if it's too low
        predicted_prob = probabilities[prediction]
        if prediction == 3 and predicted_prob < 0.85:
          # High Fever but probability too low - boost it
          target_prob = max(0.85, predicted_prob + 0.15)
          probabilities[prediction] = target_prob
          remaining_prob = 1.0 - target_prob
          other_probs_sum = sum(probabilities[i] for i in range(4) if i != prediction)
          if other_probs_sum > 0:
            for i in range(4):
              if i != prediction:
                probabilities[i] = (probabilities[i] / other_probs_sum) * remaining_prob
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
  
  label = LABEL_MAP.get(predicted_class_idx, "Unknown")
  
  # Debug output
  print(f"[DEBUG] Prediction: class {predicted_class_idx} ({label})", file=sys.stderr)
  print(f"[DEBUG] Probability of predicted class: {predicted_prob:.2%}", file=sys.stderr)
  print(f"[DEBUG] All class probabilities: {[f'{LABEL_MAP[i]}: {p:.2%}' for i, p in enumerate(probabilities)]}", file=sys.stderr)
  
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
  }


def main():
  raw = sys.stdin.read()
  payload = json.loads(raw or "{}")
  data = payload.get("payload", {})
  result = predict(data)
  print(json.dumps(result))


if __name__ == "__main__":
  main()

