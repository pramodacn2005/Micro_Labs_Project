# Fever Symptoms Checker ML Assets

This directory contains the training and inference scripts for the Fever Symptoms Checker feature.

## Contents

- `data/synthetic_fever_dataset.csv` — clinician informed synthetic dataset used for the baseline model.
- `scripts/train_fever_model.py` — trains the tabular RandomForestClassifier pipeline, performs stratified cross-validation, and stores the model artifact under `backend/models/fever_model.joblib`.
- `scripts/predict_fever_model.py` — lightweight inference endpoint invoked by the Node backend through a Python child process. Returns the predicted severity label, probability, and SHAP-based top feature importances for each request.
- `requirements.txt` — Python dependency pin-set for reproducible environments.

## Quick start

```bash
cd ml
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/train_fever_model.py < options.json
```

The training script reads JSON from stdin. Example payload:

```json
{
  "options": {
    "datasetPath": "ml/data/synthetic_fever_dataset.csv"
  }
}
```

When the backend handles a `/api/fever-check` request it automatically invokes `predict_fever_model.py` (and silently trains the baseline model if no artifact exists yet).









