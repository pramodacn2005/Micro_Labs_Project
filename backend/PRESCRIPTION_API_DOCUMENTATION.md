# Prescription API Documentation

## Overview

This API allows doctors to create, validate, and send prescription PDFs to patients via email, SMS, or in-app notifications. The system includes comprehensive safety checks for allergies, drug interactions, pediatric dosing, and controlled substances.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Creating a Prescription](#creating-a-prescription)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Frontend Integration](#frontend-integration)
8. [Examples](#examples)
9. [Safety Features](#safety-features)

---

## Authentication

All prescription endpoints require authentication using Firebase Auth tokens.

**Header Format:**
```
Authorization: Bearer <firebase_id_token>
```

**Required Role:** `doctor` (for creating prescriptions)

---

## API Endpoints

### 1. Create Prescription
**POST** `/api/prescriptions`

Creates a new prescription, validates it, generates a PDF, and optionally sends it to the patient.

**Required Role:** `doctor`

---

### 2. Get Prescription
**GET** `/api/prescriptions/:id`

Retrieves prescription details by ID.

**Access:** Doctor who created it, patient it's for, or admin

---

### 3. Download Prescription PDF
**GET** `/api/prescriptions/:id/download`

Downloads the prescription PDF file.

**Access:** Doctor who created it, patient it's for, or admin

---

### 4. Get Patient Prescriptions
**GET** `/api/prescriptions/patient/:patientId`

Gets all prescriptions for a specific patient.

**Access:** Patient themselves, their doctor, or admin

---

### 5. Get Doctor Prescriptions
**GET** `/api/prescriptions/doctor/:doctorId`

Gets all prescriptions created by a specific doctor.

**Access:** Doctor themselves or admin

---

## Creating a Prescription

### Request Body Structure

```json
{
  "doctor": {
    "id": "string (required)",
    "name": "string (required)",
    "license_number": "string (required)",
    "clinic_name": "string (optional)",
    "clinic_address": "string (optional)",
    "clinic_phone": "string (optional)",
    "digital_signature": "string (optional - base64 SVG or text)"
  },
  "patient": {
    "id": "string (required)",
    "name": "string (required)",
    "age": "number (required - in years)",
    "gender": "male|female|other|null (optional)",
    "address": "string|null (optional)",
    "phone": "string|null (optional)",
    "email": "string|null (optional)",
    "known_allergies": ["array of strings"] (optional)
  },
  "prescription_input": {
    "medications": [
      {
        "name": "string (required)",
        "strength_mg": "number|null (optional)",
        "form": "tablet|capsule|suspension|syrup|injection|other (optional)",
        "dose": "string (required)",
        "frequency": "string (required)",
        "route": "oral|iv|im|subcutaneous|other (optional)",
        "when": "before food|after food|with food|anytime (optional)",
        "duration_days": "number|null (optional)",
        "additional_instructions": "string|null (optional)"
      }
    ],
    "notes_for_patient": "string|null (optional)",
    "follow_up_date": "ISO8601 string|null (optional)",
    "refill_allowed": "boolean (optional, default: false)",
    "clinic_instructions": "string|null (optional)"
  },
  "send_options": {
    "send_method": "email|sms|in_app|none (optional, default: 'none')",
    "send_to": "string (optional - patient email/phone/id based on send_method)"
  },
  "require_consent_to_send": "boolean (optional, default: true)"
}
```

---

## Response Format

### Success Response (Status: 201)

```json
{
  "status": "success",
  "prescription_id": "presc_abc123...",
  "pdf_url": "http://localhost:4000/api/prescriptions/presc_abc123.../download",
  "prescription_json": {
    "doctor": { /* doctor details */ },
    "patient": { /* patient details */ },
    "medications": [
      {
        "name": "Paracetamol",
        "strength_mg": 500,
        "form": "tablet",
        "dose": "1 tablet",
        "frequency": "Twice daily",
        "route": "oral",
        "when": "after food",
        "duration_days": 5,
        "additional_instructions": "Take with water",
        "allergy_conflict": false,
        "interaction_flag": "none"
      }
    ],
    "notes_for_patient": "Rest well",
    "follow_up_date": "2024-02-15T10:00:00Z",
    "refill_allowed": false,
    "timestamp_issued": "2024-01-15T10:00:00Z"
  },
  "sent_status": "sent",
  "sent_via": "email",
  "sent_timestamp": "2024-01-15T10:00:00Z",
  "audit": {
    "created_by": "doctor_id",
    "created_at": "2024-01-15T10:00:00Z",
    "client_ip": "127.0.0.1"
  },
  "errors": []
}
```

### Pending Response (Status: 202)

Returned when safety checks require doctor confirmation:

```json
{
  "status": "pending",
  "prescription_id": "presc_abc123...",
  "pdf_url": null,
  "prescription_json": { /* prescription data */ },
  "sent_status": "pending_consent",
  "sent_via": null,
  "sent_timestamp": null,
  "audit": { /* audit data */ },
  "errors": [
    "Warning: Patient reports allergy to aspirin. Confirm you want to include this medication.",
    "Major interaction detected between Ibuprofen and Aspirin. Please revise prescription or confirm override."
  ]
}
```

### Error Response (Status: 400)

```json
{
  "status": "error",
  "prescription_id": null,
  "pdf_url": null,
  "prescription_json": null,
  "sent_status": "not_sent",
  "sent_via": null,
  "sent_timestamp": null,
  "audit": { /* audit data */ },
  "errors": [
    "doctor.id is required",
    "patient.id is required",
    "At least one medication is required"
  ]
}
```

---

## Error Handling

### Common Error Scenarios

1. **Missing Required Fields**
   - Status: `400`
   - Check `errors` array for specific missing fields

2. **Allergy Conflicts**
   - Status: `202` (pending)
   - Doctor must confirm before prescription is sent
   - Check `errors` array for warnings

3. **Major Drug Interactions**
   - Status: `202` (pending)
   - Doctor must revise or confirm override
   - Check `errors` array for interaction details

4. **Pediatric Dosing Warnings**
   - Status: `202` (pending) if patient < 2 months
   - Doctor must confirm dosage
   - Check `errors` array for warnings

5. **Controlled Substances**
   - Status: `202` (pending)
   - Doctor must confirm compliance
   - Check `errors` array for warnings

6. **Sending Failures**
   - Status: `201` (success) but `sent_status: "failed"`
   - PDF is generated but delivery failed
   - Check `sent_via` and `errors` for details

---

## Frontend Integration

### Example: React Component for Creating Prescription

```jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CreatePrescriptionForm({ patient, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prescription, setPrescription] = useState({
    medications: [{
      name: '',
      strength_mg: null,
      form: 'tablet',
      dose: '',
      frequency: '',
      route: 'oral',
      when: 'after food',
      duration_days: null,
      additional_instructions: ''
    }],
    notes_for_patient: '',
    follow_up_date: '',
    refill_allowed: false,
    clinic_instructions: ''
  });
  const [sendMethod, setSendMethod] = useState('email');
  const [requireConsent, setRequireConsent] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get doctor info (from your doctor profile/context)
      const doctor = {
        id: user.uid,
        name: user.displayName || 'Dr. Name',
        license_number: 'LIC12345', // Get from doctor profile
        clinic_name: 'Health Clinic',
        clinic_address: '123 Main St',
        clinic_phone: '+1234567890',
        digital_signature: null // Optional
      };

      const response = await fetch('http://localhost:4000/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          doctor,
          patient: {
            id: patient.id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            address: patient.address,
            phone: patient.phone,
            email: patient.email,
            known_allergies: patient.known_allergies || []
          },
          prescription_input: prescription,
          send_options: {
            send_method: sendMethod,
            send_to: sendMethod === 'email' ? patient.email : 
                    sendMethod === 'sms' ? patient.phone : 
                    patient.id
          },
          require_consent_to_send: requireConsent
        })
      });

      const data = await response.json();

      if (response.status === 201) {
        // Success
        alert('Prescription created and sent successfully!');
        onSuccess?.(data);
      } else if (response.status === 202) {
        // Pending - show warnings
        const warnings = data.errors.join('\n');
        const confirmed = window.confirm(
          `⚠️ Safety Warnings:\n\n${warnings}\n\nDo you want to proceed anyway?`
        );
        
        if (confirmed) {
          // Resubmit with doctor confirmation
          // You may need to add a confirmation flag in your API
          alert('Prescription created with warnings acknowledged.');
          onSuccess?.(data);
        }
      } else {
        // Error
        setError(data.errors?.join(', ') || 'Failed to create prescription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMedication = () => {
    setPrescription(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '',
        strength_mg: null,
        form: 'tablet',
        dose: '',
        frequency: '',
        route: 'oral',
        when: 'after food',
        duration_days: null,
        additional_instructions: ''
      }]
    }));
  };

  const updateMedication = (index, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">Create Prescription</h2>
      
      {/* Patient Info Display */}
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-semibold">Patient: {patient.name}</h3>
        <p className="text-sm">Age: {patient.age} | Gender: {patient.gender || 'N/A'}</p>
        {patient.known_allergies?.length > 0 && (
          <p className="text-sm text-red-600">
            ⚠️ Allergies: {patient.known_allergies.join(', ')}
          </p>
        )}
      </div>

      {/* Medications */}
      <div>
        <h3 className="font-semibold mb-2">Medications</h3>
        {prescription.medications.map((med, index) => (
          <div key={index} className="border p-4 mb-4 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Medication Name *</label>
                <input
                  type="text"
                  value={med.name}
                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Strength (mg)</label>
                <input
                  type="number"
                  value={med.strength_mg || ''}
                  onChange={(e) => updateMedication(index, 'strength_mg', parseInt(e.target.value) || null)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Form</label>
                <select
                  value={med.form}
                  onChange={(e) => updateMedication(index, 'form', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="suspension">Suspension</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Dose *</label>
                <input
                  type="text"
                  value={med.dose}
                  onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Frequency *</label>
                <input
                  type="text"
                  value={med.frequency}
                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Twice daily"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Route</label>
                <select
                  value={med.route}
                  onChange={(e) => updateMedication(index, 'route', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="oral">Oral</option>
                  <option value="iv">IV</option>
                  <option value="im">IM</option>
                  <option value="subcutaneous">Subcutaneous</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">When</label>
                <select
                  value={med.when}
                  onChange={(e) => updateMedication(index, 'when', e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="before food">Before Food</option>
                  <option value="after food">After Food</option>
                  <option value="with food">With Food</option>
                  <option value="anytime">Anytime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Duration (days)</label>
                <input
                  type="number"
                  value={med.duration_days || ''}
                  onChange={(e) => updateMedication(index, 'duration_days', parseInt(e.target.value) || null)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium">Additional Instructions</label>
              <textarea
                value={med.additional_instructions}
                onChange={(e) => updateMedication(index, 'additional_instructions', e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows="2"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addMedication}
          className="text-blue-600 hover:text-blue-800"
        >
          + Add Medication
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium">Notes for Patient</label>
        <textarea
          value={prescription.notes_for_patient}
          onChange={(e) => setPrescription(prev => ({ ...prev, notes_for_patient: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          rows="3"
        />
      </div>

      {/* Follow-up Date */}
      <div>
        <label className="block text-sm font-medium">Follow-up Date</label>
        <input
          type="datetime-local"
          value={prescription.follow_up_date}
          onChange={(e) => setPrescription(prev => ({ ...prev, follow_up_date: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Refill Allowed */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={prescription.refill_allowed}
            onChange={(e) => setPrescription(prev => ({ ...prev, refill_allowed: e.target.checked }))}
            className="mr-2"
          />
          Refill Allowed
        </label>
      </div>

      {/* Clinic Instructions */}
      <div>
        <label className="block text-sm font-medium">Clinic Instructions</label>
        <textarea
          value={prescription.clinic_instructions}
          onChange={(e) => setPrescription(prev => ({ ...prev, clinic_instructions: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          rows="2"
        />
      </div>

      {/* Send Options */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Send Options</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="email"
              checked={sendMethod === 'email'}
              onChange={(e) => setSendMethod(e.target.value)}
              className="mr-2"
            />
            Send via Email
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="sms"
              checked={sendMethod === 'sms'}
              onChange={(e) => setSendMethod(e.target.value)}
              className="mr-2"
            />
            Send via SMS
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="in_app"
              checked={sendMethod === 'in_app'}
              onChange={(e) => setSendMethod(e.target.value)}
              className="mr-2"
            />
            In-App Notification Only
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="none"
              checked={sendMethod === 'none'}
              onChange={(e) => setSendMethod(e.target.value)}
              className="mr-2"
            />
            Don't Send (Save Only)
          </label>
        </div>
        <label className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={requireConsent}
            onChange={(e) => setRequireConsent(e.target.checked)}
            className="mr-2"
          />
          Require Patient Consent
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create & Send Prescription'}
      </button>
    </form>
  );
}
```

---

## Examples

### Example 1: Simple Prescription (Email)

```javascript
const response = await fetch('http://localhost:4000/api/prescriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    doctor: {
      id: "doc123",
      name: "Dr. John Smith",
      license_number: "LIC12345",
      clinic_name: "HealthCare Clinic",
      clinic_address: "123 Main Street, City, State 12345",
      clinic_phone: "+1 (555) 123-4567"
    },
    patient: {
      id: "pat456",
      name: "Jane Doe",
      age: 35,
      gender: "female",
      address: "456 Oak Avenue",
      phone: "+1 (555) 987-6543",
      email: "jane.doe@example.com",
      known_allergies: []
    },
    prescription_input: {
      medications: [
        {
          name: "Paracetamol",
          strength_mg: 500,
          form: "tablet",
          dose: "1 tablet",
          frequency: "Twice daily",
          route: "oral",
          when: "after food",
          duration_days: 5,
          additional_instructions: "Take with plenty of water"
        }
      ],
      notes_for_patient: "Rest well and stay hydrated. Return if symptoms worsen.",
      follow_up_date: "2024-02-15T10:00:00Z",
      refill_allowed: false
    },
    send_options: {
      send_method: "email",
      send_to: "jane.doe@example.com"
    },
    require_consent_to_send: true
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: Prescription with Multiple Medications (SMS)

```javascript
const response = await fetch('http://localhost:4000/api/prescriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    doctor: {
      id: "doc123",
      name: "Dr. John Smith",
      license_number: "LIC12345",
      clinic_name: "HealthCare Clinic",
      clinic_address: "123 Main Street",
      clinic_phone: "+1 (555) 123-4567"
    },
    patient: {
      id: "pat456",
      name: "John Doe",
      age: 45,
      gender: "male",
      phone: "+1 (555) 987-6543",
      email: "john.doe@example.com",
      known_allergies: ["penicillin"]
    },
    prescription_input: {
      medications: [
        {
          name: "Paracetamol",
          strength_mg: 500,
          form: "tablet",
          dose: "1 tablet",
          frequency: "Every 6 hours",
          route: "oral",
          when: "after food",
          duration_days: 7
        },
        {
          name: "Ibuprofen",
          strength_mg: 400,
          form: "tablet",
          dose: "1 tablet",
          frequency: "Twice daily",
          route: "oral",
          when: "with food",
          duration_days: 5,
          additional_instructions: "Do not take with Paracetamol at the same time"
        }
      ],
      notes_for_patient: "Take medications as prescribed. Monitor temperature.",
      refill_allowed: false
    },
    send_options: {
      send_method: "sms",
      send_to: "+1 (555) 987-6543"
    },
    require_consent_to_send: true
  })
});
```

### Example 3: Download Prescription PDF

```javascript
const prescriptionId = "presc_abc123...";
const token = await user.getIdToken();

const response = await fetch(
  `http://localhost:4000/api/prescriptions/${prescriptionId}/download`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prescription_${prescriptionId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### Example 4: Get Patient's Prescriptions

```javascript
const patientId = "pat456";
const token = await user.getIdToken();

const response = await fetch(
  `http://localhost:4000/api/prescriptions/patient/${patientId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
if (data.success) {
  console.log('Prescriptions:', data.prescriptions);
}
```

---

## Safety Features

### 1. Allergy Checking
- Automatically checks if any medication matches patient's known allergies
- Flags medications with `allergy_conflict: true`
- Returns pending status requiring doctor confirmation

### 2. Drug Interaction Checking
- Checks for known drug-drug interactions
- Flags major interactions requiring doctor review
- Current database includes common interactions (expandable)

### 3. Pediatric Dosing
- Flags patients under 2 months old
- Checks for high doses relative to patient age
- Requires explicit confirmation for pediatric cases

### 4. Controlled Substances
- Detects controlled substances in prescription
- Requires doctor confirmation for compliance
- List can be expanded based on local regulations

### 5. Consent Management
- Validates patient consent before sending
- Ensures `send_to` matches patient contact info
- Returns `pending_consent` status if consent missing

---

## Best Practices

1. **Always Check Response Status**
   - `201`: Success - prescription created and sent
   - `202`: Pending - review warnings before proceeding
   - `400`: Error - fix validation errors

2. **Handle Warnings Appropriately**
   - Display warnings to doctor
   - Require explicit confirmation for safety-critical warnings
   - Log all warnings for audit trail

3. **Validate Patient Contact Info**
   - Ensure email/phone is valid before sending
   - Check patient consent preferences
   - Provide fallback options (in-app notification)

4. **Error Handling**
   - Always check `errors` array in response
   - Display user-friendly error messages
   - Log errors for debugging

5. **PDF Storage**
   - Prescriptions are stored in `backend/storage/prescriptions/`
   - Metadata stored in Firestore `prescriptions` collection
   - PDFs are accessible via download endpoint

---

## Environment Variables

Ensure these are set in your `.env` file:

```env
# Email Configuration (for sending prescriptions)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# OR SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Base URL for PDF links
PUBLIC_BASE_URL=http://localhost:4000
```

---

## Testing

### Test with cURL

```bash
# Create Prescription
curl -X POST http://localhost:4000/api/prescriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "doctor": {
      "id": "doc123",
      "name": "Dr. Test",
      "license_number": "TEST123"
    },
    "patient": {
      "id": "pat456",
      "name": "Test Patient",
      "age": 30,
      "gender": "male"
    },
    "prescription_input": {
      "medications": [
        {
          "name": "Paracetamol",
          "dose": "1 tablet",
          "frequency": "Twice daily"
        }
      ]
    },
    "send_options": {
      "send_method": "none"
    }
  }'
```

---

## Support

For issues or questions:
1. Check the `errors` array in API responses
2. Review server logs for detailed error messages
3. Ensure Firebase Admin SDK is properly configured
4. Verify email/SMS service credentials are set

---

## Version

**API Version:** 1.0.0  
**Last Updated:** January 2024

