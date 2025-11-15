# Testing the Fever Model

This guide explains multiple ways to verify that the fever prediction model is working correctly.

## Prerequisites

1. **Backend server running** on port 3000 (or configured port)
2. **Python dependencies installed**:
   ```bash
   pip install numpy pandas scikit-learn shap joblib
   ```
3. **Model file exists** at `backend/models/fever_model.joblib` (will be auto-created if missing)

## Method 1: Test via API (Recommended)

Test the full API endpoint including all services (model, PDF generation, hospital lookup, etc.)

### Using the Test Script

```bash
# From project root
node backend/scripts/test-fever-model.js
```

This will:
- ✅ Send a test request to the API
- ✅ Display prediction results
- ✅ Show SHAP explainability features
- ✅ List medication suggestions
- ✅ Show precautions and nearby hospitals
- ✅ Verify PDF report generation

### Using curl

```bash
curl -X POST http://localhost:3000/api/fever-check \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "age": 32,
  "gender": "Female",
  "body_temperature": { "temperature_value": 38.5, "temperature_unit": "C" },
  "heart_rate_bpm": 100,
  "respiratory_rate_bpm": 20,
  "spo2": 98,
  "bp_systolic": 120,
  "bp_diastolic": 80,
  "chills": true,
  "sweating": false,
  "loss_of_appetite": true,
  "sore_throat": true,
  "runny_nose": false,
  "nasal_congestion": true,
  "vomiting": false,
  "fatigue": "moderate",
  "headache": "mild",
  "body_aches": "moderate",
  "breathing_difficulty": "none",
  "cough": "dry",
  "body_pain_scale": 5,
  "alcohol_consumption": "none",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "New York" },
  "consent": true
}
EOF
```

### Using HTTP Client (VS Code REST Client)

Use the file `backend/scripts/demo-fever-check.http` with the REST Client extension.

## Method 2: Test Model Directly (Python)

Test the Python model without going through the API:

```bash
python ml/scripts/test_model_direct.py
```

This will:
- ✅ Verify the model file exists
- ✅ Test prediction directly
- ✅ Display SHAP explainability
- ✅ Show prediction results

## Method 3: Run Unit Tests

Run the Jest test suite:

```bash
cd backend
npm test
```

This runs mocked tests to verify the API structure.

## Method 4: Test via Frontend

1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to the Fever Checker component
3. Fill in the form with test data
4. Submit and verify the results display correctly

## Expected Results

A successful test should return:

```json
{
  "prediction": {
    "label": "No Fever" | "Low Fever" | "Moderate Fever" | "High Fever",
    "probability": 0.0-1.0,
    "severity": "Very unlikely" | "Low probability" | "Moderate probability" | "High probability"
  },
  "explainability": {
    "top_features": [
      {
        "feature": "temperature_c",
        "importance": 0.4,
        "direction": "positive"
      }
    ]
  },
  "suggestions": {
    "medications": [...],
    "precautions": [...],
    "dietPlan": [...]
  },
  "hospitals": [...],
  "pdf_report_url": "http://...",
  "ai_assistant_session_id": "..."
}
```

## Troubleshooting

### Error: "Python script not found"
- Check that `ml/scripts/predict_fever_model.py` exists
- Verify Python is in PATH: `python --version`

### Error: "Model file not found"
- The model will auto-train on first use if missing
- Check `backend/models/fever_model.joblib` exists after first run

### Error: "SHAP computation failed"
- This is handled gracefully - prediction will still work
- Check Python dependencies: `pip install shap`

### Error: "500 Internal Server Error"
- Check server console logs for detailed error messages
- Verify all environment variables are set
- Ensure Python dependencies are installed

## Quick Health Check

Run this to verify everything is set up:

```bash
# Check model file
ls -la backend/models/fever_model.joblib

# Check Python script
ls -la ml/scripts/predict_fever_model.py

# Check Python dependencies
python -c "import numpy, pandas, sklearn, shap, joblib; print('✅ All dependencies installed')"

# Test API endpoint
node backend/scripts/test-fever-model.js
```








