# How to Use Prescription Feature

## Overview

After a doctor accepts an appointment, they can now send a prescription directly to the patient through the Doctor Dashboard.

## Steps to Send a Prescription

### 1. Accept an Appointment
- Go to the **Doctor Dashboard**
- Find a **pending** appointment
- Click the **"Accept"** button
- The appointment status will change to **"accepted"**

### 2. Send Prescription
- Once the appointment is **accepted**, you'll see a new **"Send Prescription"** button (purple button with document icon)
- Click **"Send Prescription"**
- A modal will open with the prescription form

### 3. Fill Prescription Details

#### Patient Information
- Patient details are automatically filled from the appointment
- Check for any **allergies** displayed in red

#### Medications
- Click **"Add Medication"** to add more medications
- For each medication, fill in:
  - **Medication Name** * (required)
  - **Strength (mg)** (optional)
  - **Form**: Tablet, Capsule, Suspension, Syrup, Injection, Other
  - **Dose** * (required) - e.g., "1 tablet"
  - **Frequency** * (required) - e.g., "Twice daily"
  - **Route**: Oral, IV, IM, Subcutaneous, Other
  - **When**: Before Food, After Food, With Food, Anytime
  - **Duration (days)** (optional)
  - **Additional Instructions** (optional)

#### Additional Information
- **Notes for Patient**: General instructions for the patient
- **Follow-up Date**: When the patient should return (optional)
- **Refill Allowed**: Check if medication can be refilled
- **Clinic Instructions**: Internal notes (optional)

#### Send Options
- **Send via Email**: Prescription will be emailed to patient
- **Send via SMS**: Prescription link will be sent via SMS
- **In-App Notification**: Only notify in the app
- **Don't Send**: Save prescription without sending
- **Require Patient Consent**: Check to ensure patient consent before sending

### 4. Submit Prescription
- Click **"Create & Send Prescription"**
- The system will:
  - Validate all required fields
  - Check for allergy conflicts
  - Check for drug interactions
  - Check pediatric dosing (if applicable)
  - Check for controlled substances

### 5. Handle Warnings (if any)
- If safety warnings appear, review them carefully
- Confirm if you want to proceed despite warnings
- The prescription will be created with warnings acknowledged

## Safety Features

### Allergy Checking
- If a medication matches patient's known allergies, a warning will appear
- You must confirm to proceed

### Drug Interaction Checking
- Major drug interactions are flagged
- Review and revise if needed

### Pediatric Dosing
- Patients under 2 months old require special confirmation
- High doses for age are flagged

### Controlled Substances
- Controlled medications require explicit confirmation
- Ensure compliance with local regulations

## What Happens After Submission

1. **PDF Generation**: A professional prescription PDF is generated
2. **Storage**: Prescription is saved in the system
3. **Delivery**: Based on your selection:
   - **Email**: Patient receives email with PDF link
   - **SMS**: Patient receives SMS with PDF link
   - **In-App**: Patient sees notification in app
   - **None**: Prescription is saved but not sent

4. **Patient Access**: Patient can:
   - View prescription in their dashboard
   - Download the PDF
   - See prescription history

## Troubleshooting

### "Prescription created but not sent"
- Check if patient email/phone is valid
- Verify send method matches patient contact info
- Check if consent is required

### "Warnings appeared"
- Review the warnings carefully
- Confirm if you want to proceed
- Consider revising prescription if needed

### "Failed to create prescription"
- Check all required fields are filled
- Ensure medication name and dose are provided
- Verify doctor information is complete

## Notes

- Prescriptions are stored securely in the system
- All prescriptions are logged for audit purposes
- PDFs can be downloaded anytime by the patient
- Doctors can view all prescriptions they've created

## Support

If you encounter any issues:
1. Check the error message displayed
2. Verify all required fields are filled
3. Ensure patient contact information is correct
4. Contact system administrator if problems persist

