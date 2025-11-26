/**
 * Clinical Assistant Controller
 * Handles clinical fever assessment requests
 */

import { performClinicalAssessment as performClinicalAssessmentService, getOTCGuidance } from "../services/clinicalAssistantService.js";

/**
 * POST /api/clinical-assessment
 * Performs comprehensive clinical fever assessment
 */
export async function performClinicalAssessment(req, res) {
  try {
    const {
      // Demographics
      age,
      gender,
      
      // Vital Signs
      temperature_c,
      body_temperature, // Support both formats
      heart_rate_bpm,
      respiratory_rate_bpm,
      respiratory_rate, // Support both formats
      spo2,
      spo2_pct, // Support both formats
      bp_systolic,
      bp_diastolic,
      
      // Symptoms
      chills,
      sweating,
      loss_appetite,
      loss_of_appetite, // Support both formats
      sore_throat,
      runny_nose,
      nasal_congestion,
      vomiting,
      fatigue,
      headache,
      myalgia,
      body_aches, // Support both formats
      breathing_difficulty,
      cough,
      pain_scale,
      body_pain_scale, // Support both formats
      
      // Lifestyle
      alcohol_consumption,
      
      // Medical History
      medical_history_text,
      medications_text,
      
      // Location
      location,
      user_location, // Support both formats
      consent_location,
    } = req.body;

    // Normalize temperature
    let temp = temperature_c;
    if (!temp && body_temperature) {
      if (typeof body_temperature === 'object' && body_temperature.temperature_value) {
        temp = body_temperature.temperature_unit === 'F' 
          ? (body_temperature.temperature_value - 32) * 5/9 
          : body_temperature.temperature_value;
      } else if (typeof body_temperature === 'number') {
        temp = body_temperature;
      }
    }

    // Normalize SpO2
    const spO2 = spo2 || spo2_pct;

    // Normalize respiratory rate
    const respRate = respiratory_rate || respiratory_rate_bpm;

    // Normalize location
    const userLoc = location || user_location;

    // Normalize other fields
    const lossAppetite = loss_appetite !== undefined ? loss_appetite : loss_of_appetite;
    const myalgiaValue = myalgia || body_aches;
    const painScale = pain_scale || body_pain_scale || 0;

    // Build parameters object
    const params = {
      // Demographics
      age: parseInt(age),
      gender: gender,
      
      // Vital Signs
      temperature_c: temp ? parseFloat(temp) : null,
      heart_rate_bpm: heart_rate_bpm ? parseInt(heart_rate_bpm) : null,
      respiratory_rate: respRate ? parseInt(respRate) : null,
      respiratory_rate_bpm: respRate ? parseInt(respRate) : null,
      spo2: spO2 ? parseFloat(spO2) : null,
      spo2_pct: spO2 ? parseFloat(spO2) : null,
      bp_systolic: bp_systolic ? parseInt(bp_systolic) : null,
      bp_diastolic: bp_diastolic ? parseInt(bp_diastolic) : null,
      
      // Symptoms
      chills: chills === true || chills === 'true',
      sweating: sweating === true || sweating === 'true',
      loss_appetite: lossAppetite === true || lossAppetite === 'true',
      sore_throat: sore_throat === true || sore_throat === 'true',
      runny_nose: runny_nose === true || runny_nose === 'true',
      nasal_congestion: nasal_congestion === true || nasal_congestion === 'true',
      vomiting: vomiting === true || vomiting === 'true',
      fatigue: fatigue || 'none',
      headache: headache || 'none',
      myalgia: myalgiaValue || 'none',
      breathing_difficulty: breathing_difficulty || 'none',
      cough: cough || 'none',
      pain_scale: parseInt(painScale),
      
      // Lifestyle
      alcohol_consumption: alcohol_consumption || 'none',
      
      // Medical History
      medical_history_text: medical_history_text || '',
      medications_text: medications_text || '',
      
      // Location
      location: userLoc,
      user_location: userLoc,
      consent_location: consent_location === true || consent_location === 'true',
      
      // Time series data (optional)
      time_series_temps: req.body.time_series_temps || null,
      
      // Hospital search flag
      request_hospitals: req.body.request_hospitals !== false, // Default to true
    };

    // Perform clinical assessment
    const result = await performClinicalAssessmentService(params);

    // If error (missing fields), return it
    if (result.error) {
      return res.status(400).json(result);
    }

    // Return exact format as specified
    return res.status(200).json({
      fever_assessment: result.fever_assessment,
      charts: result.charts,
      results_json: result.results_json,
      summary_text: result.summary_text,
      disclaimer: result.disclaimer,
    });

  } catch (error) {
    console.error("[ClinicalAssistant] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Unable to perform clinical assessment. Please try again later.",
      detail: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
}

