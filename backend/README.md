# Backend API

Express backend that powers vitals monitoring, file management, and the new **Fever Symptoms Checker** workflow (ML model inference, PDF reporting, and AI assistant chat).

## Key capabilities

- Vitals + medicine endpoints (legacy)
- File upload/management
- Fever Symptoms Checker
  - `/api/fever-check` tabular ML inference (Python + scikit-learn RandomForest with SHAP explainability)
  - AES-256-GCM encrypted PDF reports with explainability + hospitals + medication guidance
  - AI assistant chat (`/api/ai-assistant/:sessionId/message`) using OpenAI (fallback to deterministic guidance)
  - Nearby hospital lookup via Google Places or OpenStreetMap Nominatim
  - Medication suggestions driven by `config/medications.yaml` (requires clinician verification before production)
  - Protected `/api/model/train` endpoint for retraining on new datasets

## Project structure (new directories)

```
backend/
  controllers/feverController.js
  routes/feverCheckRoutes.js
  services/
    feverModelService.js         # Node ↔ Python bridge
    pdfReportService.js          # PDFKit + encryption
    assistantService.js          # AI chat + fallbacks
    hospitalLookupService.js
    medicationService.js
    rateLimiter.js
  store/feverSessionStore.js     # Encrypted PHI session storage
  utils/encryption.js
  config/medications.yaml        # TODO: fill clinician-verified data
  storage/reports/               # Encrypted PDF artifacts
ml/
  data/synthetic_fever_dataset.csv
  scripts/train_fever_model.py
  scripts/predict_fever_model.py
```

## Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Backend port (default `4000`) |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `PUBLIC_BASE_URL` | Public URL used inside PDF links (defaults to `http://localhost:PORT`) |
| `PHI_ENCRYPTION_KEY` | **Required in prod.** 32+ char secret for AES-256-GCM encryption of PHI + PDF artifacts |
| `GOOGLE_PLACES_API_KEY` | Optional — enables Google Places for hospital lookup (falls back to OpenStreetMap) |
| `OPENAI_API_KEY` | Optional — enables LLM responses for assistant (falls back to rule-based if absent) |
| `OPENAI_MODEL` | Optional — defaults to `gpt-4o-mini` |
| `MODEL_ADMIN_TOKEN` | Shared secret required by `/api/model/train` |
| `PYTHON_PATH` | Path to Python interpreter (default `python`) |

## Installation

```bash
cd backend
npm install
# Install Python deps for ML
cd ../ml
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Fever Symptoms Checker endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/fever-check` | Validates inputs, runs Python model, creates encrypted PDF, returns prediction + assistant session |
| `GET` | `/api/reports/:reportId?sessionId=` | Streams decrypted PDF if consent provided |
| `POST` | `/api/ai-assistant/:sessionId/message` | Context-aware assistant chat (rate-limited) |
| `POST` | `/api/model/train` | Protected model retrain trigger; returns metrics JSON |

### Sample request

```json
{
  "age": 28,
  "gender": "Male",
  "body_temperature": { "temperature_value": 101.3, "temperature_unit": "F" },
  "heart_rate_bpm": 102,
  "respiratory_rate_bpm": 20,
  "spo2": 96,
  "bp_systolic": 120,
  "bp_diastolic": 78,
  "chills": true,
  "fatigue": "moderate",
  "headache": "mild",
  "body_aches": "moderate",
  "cough": "dry",
  "body_pain_scale": 4,
  "alcohol_consumption": "occasional",
  "medical_history": true,
  "medical_history_text": "Paracetamol 500 mg PRN",
  "location": { "lat": 12.9716, "lon": 77.5946 },
  "consent": true
}
```

### Sample response

```json
{
  "prediction": { "label": "Moderate Fever", "probability": 0.82, "severity": "High probability" },
  "explainability": { "top_features": [{ "feature": "temperature_c", "importance": 0.45 }] },
  "pdf_report_url": "https://.../api/reports/report_123?sessionId=chat_abc",
  "ai_assistant_session_id": "chat_abc",
  "suggestions": { "precautions": [], "medications": [], "dietPlan": [] },
  "hospitals": [...]
}
```

## Security & compliance

- **Encryption at rest:** PHI session metadata + PDF reports are encrypted with AES-256-GCM (`PHI_ENCRYPTION_KEY`).
- **Consent enforcement:** `/api/reports/:id` requires consent and session verification.
- **AI assistant guardrails:** System prompt enforces disclaimers; medication guidance sourced from `medications.yaml` with TODO markers until clinician approval.
- **Rate limiting:** Chat messages limited per session via in-memory limiter.
- **Audit trails:** Sessions stored (encrypted) with timestamps and report references.

## ML + PDF pipeline

- Synthetic dataset + scripts live under `ml/`.
- `train_fever_model.py` performs stratified CV, saves `backend/models/fever_model.joblib` + metrics JSON.
- `predict_fever_model.py` loads the same pipeline, computes SHAP top features, and prints JSON for the Node service.
- PDF generation via `PDFKit` with encrypted storage; includes inputs, prediction, explainability, medication reminders, nearby hospitals, and diet plan.

## Running tests

```bash
cd backend
npm test
```

Tests cover payload validation, prediction pipeline mocks, hospital lookup fallback, and PDF endpoint access control.

## Updating medications

Edit `backend/config/medications.yaml`. Keep `clinician_verified: false` until a licensed clinician reviews each entry. The frontend surfaces this flag and references for transparency.

## Legacy endpoints

Existing vitals, file, and alert routes remain unchanged (`/api/vitals`, `/api/files`, `/api/medicine-alerts`, `/api/vital-alerts`, `/api/health`).
