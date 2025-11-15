import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "ml" / "data"
DEFAULT_DATASET = DATA_DIR / "synthetic_fever_dataset.csv"
MODEL_DIR = ROOT_DIR / "backend" / "models"
MODEL_PATH = MODEL_DIR / "fever_model.joblib"
METRICS_PATH = MODEL_DIR / "fever_model_metrics.json"

NUMERIC_FEATURES = [
  "age",
  "temperature_c",
  "heart_rate_bpm",
  "respiratory_rate_bpm",
  "spo2",
  "bp_systolic",
  "bp_diastolic",
  "body_pain_scale",
]

BOOLEAN_FEATURES = [
  "chills",
  "sweating",
  "loss_of_appetite",
  "sore_throat",
  "runny_nose",
  "nasal_congestion",
  "vomiting",
  "medical_history",
  "tachycardia",
  "fever_flag",
]

CATEGORICAL_FEATURES = [
  "gender",
  "fatigue",
  "headache",
  "body_aches",
  "breathing_difficulty",
  "cough",
  "alcohol_consumption",
]


def derive_features(df: pd.DataFrame) -> pd.DataFrame:
  derived = df.copy()
  threshold = np.where(derived["age"] < 12, 110, np.where(derived["age"] < 60, 100, 95))
  derived["tachycardia"] = (derived["heart_rate_bpm"] > threshold).astype(int)
  derived["fever_flag"] = (derived["temperature_c"] >= 38.0).astype(int)
  return derived


def build_model():
  numeric_pipeline = Pipeline(
    steps=[
      ("imputer", SimpleImputer(strategy="median")),
      ("scaler", StandardScaler()),
    ]
  )

  categorical_pipeline = Pipeline(
    steps=[
      ("imputer", SimpleImputer(strategy="most_frequent")),
      ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ]
  )

  preprocessor = ColumnTransformer(
    transformers=[
      ("num", numeric_pipeline, NUMERIC_FEATURES),
      ("bool", "passthrough", BOOLEAN_FEATURES),
      ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
    ]
  )

  model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    min_samples_split=4,
    class_weight="balanced",
    random_state=42,
  )

  clf = Pipeline(steps=[("preprocessor", preprocessor), ("classifier", model)])
  return clf


def evaluate_model(df: pd.DataFrame, target: pd.Series):
  kf = StratifiedKFold(n_splits=min(5, len(df)))
  metrics = []

  for train_index, test_index in kf.split(df, target):
    X_train, X_test = df.iloc[train_index], df.iloc[test_index]
    y_train, y_test = target.iloc[train_index], target.iloc[test_index]

    clf = build_model()
    clf.fit(X_train, y_train)
    preds = clf.predict(X_test)
    probas = clf.predict_proba(X_test)

    try:
      roc = roc_auc_score(y_test, probas, multi_class="ovr")
    except ValueError:
      roc = None

    metrics.append(
      {
        "accuracy": accuracy_score(y_test, preds),
        "precision": precision_score(y_test, preds, average="macro", zero_division=0),
        "recall": recall_score(y_test, preds, average="macro", zero_division=0),
        "f1": f1_score(y_test, preds, average="macro", zero_division=0),
        "roc_auc": roc,
      }
    )

  averages = {key: float(np.nanmean([m[key] for m in metrics if m[key] is not None])) for key in metrics[0]}
  return averages


def train_model(options: dict | None = None):
  options = options or {}
  dataset_path = Path(options.get("datasetPath") or DEFAULT_DATASET)
  if not dataset_path.exists():
    raise FileNotFoundError(f"Dataset not found at {dataset_path}")

  df = pd.read_csv(dataset_path)
  df = derive_features(df)

  target = df["label"]
  features = df.drop(columns=["label"])

  metrics = evaluate_model(features, target)

  final_model = build_model()
  final_model.fit(features, target)

  MODEL_DIR.mkdir(parents=True, exist_ok=True)
  dump(final_model, MODEL_PATH)

  metadata = {
    "trained_at": pd.Timestamp.utcnow().isoformat(),
    "dataset": str(dataset_path),
    "metrics": metrics,
    "model_path": str(MODEL_PATH),
  }
  METRICS_PATH.write_text(json.dumps(metadata, indent=2))
  return metadata


def main():
  raw = sys.stdin.read()
  payload = json.loads(raw or "{}")
  options = payload.get("options", {})
  result = train_model(options)
  print(json.dumps(result))


if __name__ == "__main__":
  main()

