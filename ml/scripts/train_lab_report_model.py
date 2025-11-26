import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from joblib import dump
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = ROOT / "ml" / "data" / "Autoimmune_Disorder_10k_with_All_Disorders.csv"
MODEL_DIR = ROOT / "backend" / "models"
MODEL_PATH = MODEL_DIR / "lab_report_model.joblib"
METRICS_PATH = MODEL_DIR / "lab_report_model_metrics.json"

FEATURE_COLUMNS = [
  "wbc_count",
  "rbc_count",
  "platelet_count",
  "hemoglobin",
  "crp",
  "esr",
  "neutrophils",
  "lymphocytes",
  "temperature_c",
  "spo2",
  "heart_rate_bpm",
]

TARGET_LABELS = [
  "Viral Fever",
  "Bacterial Fever",
  "Dengue",
  "Typhoid",
  "Malaria",
  "Autoimmune-related fever",
  #"Unknown cause",
]

def derive_temperature(row):
  if row.get("Low-grade fever") == 1:
    return np.random.uniform(38.0, 39.5)
  return np.random.uniform(36.4, 37.2)

def assign_label(row):
  diagnosis = str(row.get("Diagnosis", "")).lower()
  wbc = row.get("WBC_Count")
  plt = row.get("PLT_Count")
  crp = row.get("CRP")
  esr = row.get("ESR")
  neut = row.get("Neutrophils")
  lymph = row.get("Lymphocytes")

  autoimmune_keywords = ["autoimmune", "lupus", "sjögren", "thyroid", "dermatomyositis", "scleroderma"]
  if any(keyword in diagnosis for keyword in autoimmune_keywords):
    return "Autoimmune-related fever"
  if plt is not None and plt < 130000 and (wbc is not None and wbc < 4500):
    return "Dengue"
  if wbc is not None and crp is not None and wbc > 12000 and crp > 20:
    return "Bacterial Fever"
  if esr is not None and esr > 45 and (crp is not None and crp > 12):
    return "Typhoid"
  if wbc is not None and lymph is not None and lymph > 45 and wbc < 9000:
    return "Viral Fever"
  if wbc is not None and neut is not None and neut > 70 and lymph < 20:
    return "Bacterial Fever"
  if row.get("RBC_Count") and row["RBC_Count"] < 3.5 and plt and plt < 150000:
    return "Malaria"
 # return "Unknown cause"

def synthesize(label, size):
  rng = np.random.default_rng(42)
  profiles = {
    "Viral Fever": {
      "wbc_count": rng.normal(6500, 1200, size),
      "platelet_count": rng.normal(210000, 30000, size),
      "crp": rng.normal(8, 2, size),
      "temperature_c": rng.normal(38.5, 0.3, size),
    },
    "Bacterial Fever": {
      "wbc_count": rng.normal(15000, 2000, size),
      "crp": rng.normal(35, 8, size),
      "neutrophils": rng.normal(78, 5, size),
    },
    "Dengue": {
      "wbc_count": rng.normal(3800, 600, size),
      "platelet_count": rng.normal(90000, 12000, size),
      "hemoglobin": rng.normal(12, 0.8, size),
    },
    "Typhoid": {
      "esr": rng.normal(55, 6, size),
      "crp": rng.normal(18, 3, size),
      "temperature_c": rng.normal(39.0, 0.2, size),
    },
    "Malaria": {
      "platelet_count": rng.normal(110000, 15000, size),
      "hemoglobin": rng.normal(10.5, 0.6, size),
      "rbc_count": rng.normal(3.8, 0.3, size),
    },
    "Autoimmune-related fever": {},
   # "Unknown cause": {},
  }
  base = {col: DEFAULT_SYNTH[col] for col in FEATURE_COLUMNS}
  data = {col: np.full(size, base[col]) for col in FEATURE_COLUMNS}
  profile = profiles.get(label, {})
  for key, values in profile.items():
    data[key] = values
  data["fever_type"] = [label] * size
  return pd.DataFrame(data)

DEFAULT_SYNTH = {
  "wbc_count": 7600,
  "rbc_count": 4.6,
  "platelet_count": 230000,
  "hemoglobin": 13.6,
  "crp": 6,
  "esr": 18,
  "neutrophils": 60,
  "lymphocytes": 30,
  "temperature_c": 37.2,
  "spo2": 97,
  "heart_rate_bpm": 84,
}

def augment_class(df, label, target_size=800):
  class_df = df[df["fever_type"] == label].copy()
  if class_df.empty:
    return synthesize(label, target_size)
  if len(class_df) >= target_size:
    return class_df
  needed = target_size - len(class_df)
  samples = class_df.sample(n=needed, replace=True, random_state=42).copy()
  for col in FEATURE_COLUMNS:
    noise = np.random.normal(0, 0.08, size=needed)
    samples[col] = samples[col] * (1 + noise)
  return pd.concat([class_df, samples], ignore_index=True)

def build_dataset():
  df = pd.read_csv(DATASET_PATH)
  df = df.rename(
    columns={
      "WBC_Count": "wbc_count",
      "RBC_Count": "rbc_count",
      "PLT_Count": "platelet_count",
      "Hemoglobin": "hemoglobin",
      "CRP": "crp",
      "ESR": "esr",
      "Neutrophils": "neutrophils",
      "Lymphocytes": "lymphocytes",
    }
  )

  df["temperature_c"] = df.apply(derive_temperature, axis=1)
  df["spo2"] = np.random.normal(97, 1.0, len(df)).clip(90, 100)
  df["heart_rate_bpm"] = np.random.normal(82, 12, len(df)).clip(50, 150)
  df["fever_type"] = df.apply(assign_label, axis=1)

  frames = []
  for label in TARGET_LABELS:
    frames.append(augment_class(df, label, target_size=1000))
  balanced = pd.concat(frames, ignore_index=True)

  balanced = balanced.fillna(balanced.median(numeric_only=True))
  return balanced

def train_model():
  dataset = build_dataset()
  X = dataset[FEATURE_COLUMNS]
  y = dataset["fever_type"]

  X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
  model = RandomForestClassifier(
    n_estimators=400,
    max_depth=12,
    min_samples_split=4,
    class_weight="balanced_subsample",
    random_state=42,
  )
  model.fit(X_train, y_train)
  preds = model.predict(X_test)
  report = classification_report(y_test, preds, labels=TARGET_LABELS, output_dict=True, zero_division=0)

  MODEL_DIR.mkdir(parents=True, exist_ok=True)
  dump({"model": model, "features": FEATURE_COLUMNS}, MODEL_PATH)
  METRICS_PATH.write_text(json.dumps({"report": report}, indent=2))

  return {
    "classes": TARGET_LABELS,
    "samples": len(dataset),
    "metrics": {
      label: {
        "precision": report[label]["precision"],
        "recall": report[label]["recall"],
        "f1": report[label]["f1-score"],
      }
      for label in TARGET_LABELS
    },
  }

def main():
  if not DATASET_PATH.exists():
    raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")
  result = train_model()
  print(json.dumps(result))

if __name__ == "__main__":
  if sys.stdin.isatty():
    main()
  else:
    payload = json.loads(sys.stdin.read() or "{}")
    action = payload.get("action")
    if action == "train":
      print(json.dumps(train_model()))
    else:
      main()

