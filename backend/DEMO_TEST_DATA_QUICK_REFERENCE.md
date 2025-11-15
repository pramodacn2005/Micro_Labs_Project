# Demo Test Data - Quick Reference

## 🔥 High Fever Test Cases

### Case 1: Severe High Fever (39.5°C)
```json
{
  "age": 35,
  "gender": "Male",
  "body_temperature": { "temperature_value": 39.5, "temperature_unit": "C" },
  "heart_rate_bpm": 110,
  "respiratory_rate_bpm": 22,
  "spo2": 96,
  "bp_systolic": 130,
  "bp_diastolic": 85,
  "chills": true,
  "sweating": true,
  "loss_of_appetite": true,
  "sore_throat": true,
  "runny_nose": false,
  "nasal_congestion": true,
  "vomiting": true,
  "fatigue": "severe",
  "headache": "severe",
  "body_aches": "severe",
  "breathing_difficulty": "mild",
  "cough": "dry",
  "body_pain_scale": 8,
  "alcohol_consumption": "none",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "Mumbai" },
  "consent": true
}
```

### Case 2: Very High Fever with Complications (40.2°C)
```json
{
  "age": 68,
  "gender": "Female",
  "body_temperature": { "temperature_value": 40.2, "temperature_unit": "C" },
  "heart_rate_bpm": 125,
  "respiratory_rate_bpm": 28,
  "spo2": 92,
  "bp_systolic": 140,
  "bp_diastolic": 90,
  "chills": true,
  "sweating": false,
  "loss_of_appetite": true,
  "sore_throat": false,
  "runny_nose": false,
  "nasal_congestion": true,
  "vomiting": true,
  "fatigue": "severe",
  "headache": "moderate",
  "body_aches": "severe",
  "breathing_difficulty": "moderate",
  "cough": "wet",
  "body_pain_scale": 9,
  "alcohol_consumption": "none",
  "medical_history": true,
  "medical_history_text": "Hypertension, Diabetes",
  "location": { "city": "Delhi" },
  "consent": true
}
```

### Case 3: Child with High Fever (39.8°C)
```json
{
  "age": 8,
  "gender": "Male",
  "body_temperature": { "temperature_value": 39.8, "temperature_unit": "C" },
  "heart_rate_bpm": 130,
  "respiratory_rate_bpm": 24,
  "spo2": 97,
  "bp_systolic": 110,
  "bp_diastolic": 70,
  "chills": true,
  "sweating": true,
  "loss_of_appetite": true,
  "sore_throat": true,
  "runny_nose": true,
  "nasal_congestion": true,
  "vomiting": false,
  "fatigue": "moderate",
  "headache": "moderate",
  "body_aches": "moderate",
  "breathing_difficulty": "none",
  "cough": "dry",
  "body_pain_scale": 6,
  "alcohol_consumption": "none",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "Bangalore" },
  "consent": true
}
```

## 🌡️ Normal Temperature Test Cases

### Case 1: Healthy Adult (36.8°C)
```json
{
  "age": 28,
  "gender": "Female",
  "body_temperature": { "temperature_value": 36.8, "temperature_unit": "C" },
  "heart_rate_bpm": 72,
  "respiratory_rate_bpm": 16,
  "spo2": 98,
  "bp_systolic": 120,
  "bp_diastolic": 80,
  "chills": false,
  "sweating": false,
  "loss_of_appetite": false,
  "sore_throat": false,
  "runny_nose": false,
  "nasal_congestion": false,
  "vomiting": false,
  "fatigue": "none",
  "headache": "none",
  "body_aches": "none",
  "breathing_difficulty": "none",
  "cough": "none",
  "body_pain_scale": 1,
  "alcohol_consumption": "occasional",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "Pune" },
  "consent": true
}
```

### Case 2: Normal Temp with Mild Cold (37.1°C)
```json
{
  "age": 42,
  "gender": "Male",
  "body_temperature": { "temperature_value": 37.1, "temperature_unit": "C" },
  "heart_rate_bpm": 78,
  "respiratory_rate_bpm": 18,
  "spo2": 97,
  "bp_systolic": 125,
  "bp_diastolic": 82,
  "chills": false,
  "sweating": false,
  "loss_of_appetite": false,
  "sore_throat": true,
  "runny_nose": true,
  "nasal_congestion": true,
  "vomiting": false,
  "fatigue": "mild",
  "headache": "mild",
  "body_aches": "none",
  "breathing_difficulty": "none",
  "cough": "dry",
  "body_pain_scale": 2,
  "alcohol_consumption": "none",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "Chennai" },
  "consent": true
}
```

### Case 3: Elderly Healthy (36.5°C)
```json
{
  "age": 75,
  "gender": "Female",
  "body_temperature": { "temperature_value": 36.5, "temperature_unit": "C" },
  "heart_rate_bpm": 68,
  "respiratory_rate_bpm": 14,
  "spo2": 96,
  "bp_systolic": 135,
  "bp_diastolic": 88,
  "chills": false,
  "sweating": false,
  "loss_of_appetite": false,
  "sore_throat": false,
  "runny_nose": false,
  "nasal_congestion": false,
  "vomiting": false,
  "fatigue": "none",
  "headache": "none",
  "body_aches": "none",
  "breathing_difficulty": "none",
  "cough": "none",
  "body_pain_scale": 0,
  "alcohol_consumption": "none",
  "medical_history": true,
  "medical_history_text": "Arthritis (controlled)",
  "location": { "city": "Hyderabad" },
  "consent": true
}
```

## ⚠️ Moderate Fever Test Case

### Case 1: Moderate Fever (38.5°C)
```json
{
  "age": 30,
  "gender": "Male",
  "body_temperature": { "temperature_value": 38.5, "temperature_unit": "C" },
  "heart_rate_bpm": 95,
  "respiratory_rate_bpm": 20,
  "spo2": 97,
  "bp_systolic": 125,
  "bp_diastolic": 80,
  "chills": true,
  "sweating": true,
  "loss_of_appetite": true,
  "sore_throat": true,
  "runny_nose": true,
  "nasal_congestion": true,
  "vomiting": false,
  "fatigue": "moderate",
  "headache": "moderate",
  "body_aches": "moderate",
  "breathing_difficulty": "none",
  "cough": "dry",
  "body_pain_scale": 5,
  "alcohol_consumption": "none",
  "medical_history": false,
  "medical_history_text": "",
  "location": { "city": "Kolkata" },
  "consent": true
}
```

## 📝 How to Use

### Option 1: Run Automated Tests
```bash
cd backend
node scripts/test-demo-data.js
```

### Option 2: Manual Testing via API
```bash
# Test High Fever Case
curl -X POST http://localhost:4000/api/fever-check \
  -H "Content-Type: application/json" \
  -d @demo-test-data.json
```

### Option 3: Use in Frontend
Copy any of the JSON objects above and paste into the Fever Checker form in the frontend.

## 🎯 Expected Results

- **High Fever Cases (≥39°C)**: Should predict "High Fever" with high probability
- **Normal Cases (<38°C)**: Should predict "No Fever" or "Mild Fever"
- **Moderate Cases (38-39°C)**: Should predict "Moderate Fever"

## 📊 Key Features

- **Temperature ranges**: 36.5°C (normal) to 40.2°C (very high)
- **Age ranges**: 8 (child) to 75 (elderly)
- **Symptom combinations**: Various combinations of fever symptoms
- **Medical history**: Some cases include medical history

