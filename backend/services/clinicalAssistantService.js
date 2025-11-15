/**
 * Clinical AI Assistant Service
 * Implements comprehensive fever classification and medical guidance
 */

import { lookupHospitals } from "./hospitalLookupService.js";

const DISCLAIMER = "This is informational and not a substitute for professional medical care.";

/**
 * Classify fever type based on patient parameters
 */
function classifyFeverType(params) {
  const {
    temperature_c,
    heart_rate_bpm,
    respiratory_rate_bpm,
    spo2,
    bp_systolic,
    bp_diastolic,
    chills,
    sweating,
    loss_appetite,
    sore_throat,
    runny_nose,
    nasal_congestion,
    vomiting,
    fatigue,
    headache,
    myalgia,
    breathing_difficulty,
    cough,
    pain_scale,
  } = params;

  const temp = temperature_c || 0;
  const hr = heart_rate_bpm || 0;
  const rr = respiratory_rate_bpm || 0;
  const spO2 = spo2 || 100;
  const bpSys = bp_systolic || 120;
  const bpDia = bp_diastolic || 80;

  // Score each fever type
  const scores = {
    viral: 0,
    bacterial: 0,
    dengue: 0,
    typhoid: 0,
    malaria: 0,
    covid_flu: 0,
    heat_stroke: 0,
  };

  // Viral Fever: moderate fever (38-39°C), cough/cold symptoms, normal SpO₂
  if (temp >= 38 && temp < 39) {
    scores.viral += 30;
  }
  if (cough && cough !== "none") scores.viral += 20;
  if (runny_nose || nasal_congestion) scores.viral += 15;
  if (sore_throat) scores.viral += 10;
  if (spO2 >= 95) scores.viral += 10;
  if (fatigue && fatigue !== "none") scores.viral += 10;
  if (headache && headache !== "none") scores.viral += 5;

  // Bacterial Fever: high fever (39-40+°C), very high HR, vomiting, severe sore throat
  if (temp >= 39 && temp < 40) {
    scores.bacterial += 30;
  }
  if (temp >= 40) scores.bacterial += 20;
  if (hr > 100) scores.bacterial += 15;
  if (vomiting) scores.bacterial += 15;
  if (sore_throat && (headache === "severe" || pain_scale >= 7)) scores.bacterial += 10;
  if (fatigue === "severe") scores.bacterial += 10;

  // Dengue Fever: very high fever (~40°C), low/normal heart rate, severe myalgia, low BP, chills
  if (temp >= 39.5) scores.dengue += 25;
  if (temp >= 40) scores.dengue += 15;
  if (hr < 100 && hr > 60) scores.dengue += 15; // Low/normal HR
  if (myalgia === "severe" || pain_scale >= 8) scores.dengue += 20;
  if (bpSys < 100) scores.dengue += 15;
  if (chills) scores.dengue += 10;

  // Typhoid Fever: slow rising fever, headache, loss of appetite, low HR, no cold symptoms
  if (temp >= 38 && temp < 40) scores.typhoid += 20;
  if (headache && headache !== "none") scores.typhoid += 15;
  if (loss_appetite) scores.typhoid += 15;
  if (hr < 90) scores.typhoid += 15;
  if (!runny_nose && !nasal_congestion) scores.typhoid += 10;
  if (fatigue === "severe") scores.typhoid += 10;
  if (vomiting) scores.typhoid += 5;

  // Malaria Fever: chills → fever → sweating cycles, headache, body aches
  if (chills && sweating) scores.malaria += 30;
  if (chills) scores.malaria += 15;
  if (sweating) scores.malaria += 10;
  if (headache && headache !== "none") scores.malaria += 15;
  if (myalgia && myalgia !== "none") scores.malaria += 15;
  if (temp >= 38.5 && temp < 40) scores.malaria += 10;

  // COVID/Flu (Respiratory): fever + LOW SpO₂ + high RR + dry cough + breathing difficulty
  if (temp >= 37.5) scores.covid_flu += 15;
  if (spO2 < 95) scores.covid_flu += 25;
  if (spO2 < 92) scores.covid_flu += 15;
  if (rr > 20) scores.covid_flu += 15;
  if (cough === "dry") scores.covid_flu += 15;
  if (breathing_difficulty && breathing_difficulty !== "none") scores.covid_flu += 15;
  if (fatigue && fatigue !== "none") scores.covid_flu += 5;

  // Heat Stroke: >40°C, no infection symptoms, very high HR, dehydration, fatigue, dizziness
  if (temp >= 40) scores.heat_stroke += 30;
  if (temp >= 41) scores.heat_stroke += 20;
  if (hr > 120) scores.heat_stroke += 20;
  if (!chills && !sore_throat && !runny_nose && !nasal_congestion) scores.heat_stroke += 15;
  if (fatigue === "severe") scores.heat_stroke += 10;
  if (vomiting) scores.heat_stroke += 5;

  // Find top 2 fever types
  const sorted = Object.entries(scores)
    .map(([type, score]) => ({ type, score }))
    .sort((a, b) => b.score - a.score);

  const topType = sorted[0];
  const secondType = sorted[1];

  // Calculate confidence (normalize to 0-100)
  const maxScore = Math.max(...Object.values(scores));
  const confidence = Math.min(100, Math.round((maxScore / 100) * 100));

  // Map type names
  const typeMap = {
    viral: "Viral Fever",
    bacterial: "Bacterial Fever",
    dengue: "Dengue Fever",
    typhoid: "Typhoid Fever",
    malaria: "Malaria Fever",
    covid_flu: "COVID / Flu (Respiratory Fever)",
    heat_stroke: "Heat Stroke (Non-infectious Fever)",
  };

  // Build rationale
  const rationale = buildRationale(params, topType.type, typeMap);

  return {
    fever_type: typeMap[topType.type] || "Viral Fever",
    confidence_score: confidence,
    rationale,
    secondary_type: secondType.score > 30 ? typeMap[secondType.type] : null,
    secondary_confidence: secondType.score > 30 ? Math.round((secondType.score / 100) * 100) : null,
  };
}

/**
 * Build rationale explanation
 */
function buildRationale(params, feverType, typeMap) {
  const { temperature_c, heart_rate_bpm, spo2, respiratory_rate_bpm, cough, breathing_difficulty, myalgia, chills, sweating } = params;
  
  const reasons = [];
  
  switch (feverType) {
    case "viral":
      if (temperature_c >= 38 && temperature_c < 39) reasons.push(`moderate fever (${temperature_c}°C)`);
      if (cough && cough !== "none") reasons.push("cough present");
      if (params.runny_nose || params.nasal_congestion) reasons.push("cold symptoms");
      break;
    case "bacterial":
      if (temperature_c >= 39) reasons.push(`high fever (${temperature_c}°C)`);
      if (heart_rate_bpm > 100) reasons.push(`elevated heart rate (${heart_rate_bpm} bpm)`);
      if (params.vomiting) reasons.push("vomiting");
      break;
    case "dengue":
      if (temperature_c >= 39.5) reasons.push(`very high fever (${temperature_c}°C)`);
      if (myalgia === "severe" || params.pain_scale >= 8) reasons.push("severe body aches");
      if (params.bp_systolic < 100) reasons.push("low blood pressure");
      break;
    case "typhoid":
      if (temperature_c >= 38) reasons.push(`fever (${temperature_c}°C)`);
      if (params.loss_appetite) reasons.push("loss of appetite");
      if (heart_rate_bpm < 90) reasons.push("low heart rate");
      break;
    case "malaria":
      if (chills && sweating) reasons.push("chills and sweating pattern");
      if (chills) reasons.push("chills");
      if (params.headache && params.headache !== "none") reasons.push("headache");
      break;
    case "covid_flu":
      if (spo2 < 95) reasons.push(`low SpO₂ (${spo2}%)`);
      if (respiratory_rate_bpm > 20) reasons.push(`elevated respiratory rate (${respiratory_rate_bpm} bpm)`);
      if (cough === "dry") reasons.push("dry cough");
      if (breathing_difficulty && breathing_difficulty !== "none") reasons.push("breathing difficulty");
      break;
    case "heat_stroke":
      if (temperature_c >= 40) reasons.push(`very high temperature (${temperature_c}°C)`);
      if (heart_rate_bpm > 120) reasons.push(`very high heart rate (${heart_rate_bpm} bpm)`);
      if (!chills && !params.sore_throat) reasons.push("absence of infection symptoms");
      break;
  }
  
  return `Based on your symptoms: ${reasons.join(", ")}.`;
}

/**
 * Check for emergency/urgent conditions
 */
function checkEmergencyConditions(params) {
  const {
    temperature_c,
    spo2,
    respiratory_rate_bpm,
    breathing_difficulty,
    bp_systolic,
  } = params;

  const urgentFlags = [];
  let isEmergency = false;
  let isUrgent = false;

  // Emergency conditions
  if (temperature_c >= 40) {
    urgentFlags.push(`Temperature ${temperature_c}°C is dangerously high (≥40°C = emergency)`);
    isEmergency = true;
  }
  if (spo2 < 92) {
    urgentFlags.push(`SpO₂ ${spo2}% is critically low (<92%)`);
    isEmergency = true;
  }
  if (bp_systolic < 90) {
    urgentFlags.push(`Blood pressure ${bp_systolic} mmHg is critically low (<90 mmHg)`);
    isEmergency = true;
  }

  // Urgent conditions
  if (temperature_c >= 39 && temperature_c < 40) {
    urgentFlags.push(`Temperature ${temperature_c}°C indicates high fever (≥39°C)`);
    isUrgent = true;
  }
  if (spo2 < 94 && spo2 >= 92) {
    urgentFlags.push(`SpO₂ ${spo2}% is low (<94%)`);
    isUrgent = true;
  }
  if (respiratory_rate_bpm > 24) {
    urgentFlags.push(`Respiratory rate ${respiratory_rate_bpm} bpm is elevated (>24 bpm)`);
    isUrgent = true;
  }
  if (breathing_difficulty === "severe") {
    urgentFlags.push("Severe breathing difficulty detected");
    isUrgent = true;
  }

  return {
    isEmergency,
    isUrgent,
    urgentFlags,
    message: urgentFlags.length > 0
      ? `${isEmergency ? "🚨 EMERGENCY" : "⚠️ URGENT"}: Your signs indicate possible severe illness. Seek emergency care immediately.`
      : null,
  };
}

/**
 * Format hospitals for JSON output
 */
async function formatHospitals(location, radius_km = 5, isUrgent = false) {
  if (!location || (!location.lat && !location.lon && !location.city)) {
    return [];
  }

  try {
    // Try initial search
    let hospitals = await lookupHospitals(location);
    
    // If no results and we have coordinates, expand radius
    if (hospitals.length === 0 && location.lat && location.lon) {
      // Retry with expanded radius (handled by service)
      hospitals = await lookupHospitals(location);
    }

    // Format hospitals according to required structure
    return hospitals.map((hosp) => ({
      name: hosp.name || "Hospital",
      type: determineHospitalType(hosp.name, hosp.address),
      address: hosp.address || hosp.name || "Address not available",
      lat: hosp.lat || location.lat || null,
      lon: hosp.lon || location.lon || null,
      distance_km: hosp.distance_km ? parseFloat(hosp.distance_km.toFixed(2)) : null,
      estimated_travel_time_min: hosp.distance_km ? Math.round(hosp.distance_km * 2) : null, // Rough estimate: 2 min per km
      phone: hosp.phone || null,
      open_now: null, // Not available from current service
      specialties: [], // Not available from current service
      accepts_teleconsult: null, // Not available from current service
      ratings: null, // Not available from current service
      directions_url: hosp.map_url || hosp.directions_url || null,
    }));
  } catch (error) {
    console.error("[ClinicalAssistant] Hospital lookup error:", error);
    return [];
  }
}

/**
 * Determine hospital type from name/address
 */
function determineHospitalType(name, address) {
  const text = `${name} ${address}`.toLowerCase();
  if (text.includes("emergency") || text.includes("trauma")) return "emergency_center";
  if (text.includes("clinic") || text.includes("health center")) return "clinic";
  return "hospital";
}

/**
 * Generate clinical guidance summary
 */
function generateSummary(feverAssessment, emergencyCheck, hospitals) {
  const { fever_type, confidence_score, rationale } = feverAssessment;
  const { isEmergency, isUrgent, message } = emergencyCheck;

  let summary = "";

  if (message) {
    summary += `${message}\n\n`;
  }

  summary += `Based on your symptoms, the most likely diagnosis is **${fever_type}** (${confidence_score}% confidence). ${rationale}\n\n`;

  if (isEmergency || isUrgent) {
    summary += "**Immediate Action Required:** Please seek emergency medical care right away. Do not delay.\n\n";
  } else {
    summary += "**Recommended Actions:**\n";
    summary += "• Monitor your temperature and symptoms closely\n";
    summary += "• Stay hydrated and get adequate rest\n";
    summary += "• Consider OTC medications (Paracetamol/Ibuprofen) with proper dosing\n";
    summary += "• Watch for red flags: worsening symptoms, difficulty breathing, persistent high fever\n\n";
  }

  if (hospitals && hospitals.length > 0) {
    summary += `**Nearby Medical Facilities:** ${hospitals.length} hospital(s) found within your area. `;
    summary += "Please review the hospital list for contact information and directions.\n\n";
  }

  summary += DISCLAIMER;

  return summary;
}

/**
 * Main clinical assessment function
 */
export async function performClinicalAssessment(params) {
  // Validate required parameters
  const required = ["age", "gender", "temperature_c"];
  const missing = required.filter((field) => !params[field] && params[field] !== 0);

  if (missing.length > 0) {
    return {
      error: "Missing required parameters",
      missing_fields: missing,
      message: `Please provide the following required information: ${missing.join(", ")}`,
    };
  }

  // Check for location consent
  if (!params.consent_location && !params.location) {
    return {
      error: "Location consent required",
      message: "To find nearby hospitals, please provide location consent or specify your city name.",
    };
  }

  // Classify fever type
  const feverAssessment = classifyFeverType(params);

  // Check for emergency conditions
  const emergencyCheck = checkEmergencyConditions(params);

  // Find hospitals if location provided
  let hospitals = [];
  if (params.location && (params.location.lat || params.location.city)) {
    hospitals = await formatHospitals(
      params.location,
      5, // Initial radius
      emergencyCheck.isUrgent || emergencyCheck.isEmergency
    );
    
    // Sort by distance (nearest first), or prioritize emergency centers if urgent
    if (emergencyCheck.isUrgent || emergencyCheck.isEmergency) {
      hospitals.sort((a, b) => {
        if (a.type === "emergency_center" && b.type !== "emergency_center") return -1;
        if (b.type === "emergency_center" && a.type !== "emergency_center") return 1;
        return (a.distance_km || 999) - (b.distance_km || 999);
      });
    } else {
      hospitals.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }
  }

  // Generate summary
  const summary = generateSummary(feverAssessment, emergencyCheck, hospitals);

  // Build response
  return {
    fever_assessment: {
      fever_type: feverAssessment.fever_type,
      confidence_score: feverAssessment.confidence_score,
      rationale: feverAssessment.rationale,
      secondary_type: feverAssessment.secondary_type,
      secondary_confidence: feverAssessment.secondary_confidence,
    },
    emergency_status: {
      is_emergency: emergencyCheck.isEmergency,
      is_urgent: emergencyCheck.isUrgent,
      urgent_message: emergencyCheck.message,
      flags: emergencyCheck.urgentFlags,
    },
    results_json: hospitals,
    summary_text: summary,
  };
}

/**
 * Generate OTC medication guidance
 */
export function getOTCGuidance(params, feverType) {
  const { age, temperature_c } = params;
  const isChild = age < 12;
  const isAdult = age >= 12;

  const guidance = {
    paracetamol: {
      name: "Paracetamol (Acetaminophen)",
      safe: true,
      dosing: isChild
        ? "10-15 mg/kg per dose, every 4-6 hours (max 4-5 doses/day)"
        : "500-1000 mg per dose, every 4-6 hours (max 4 doses/day, max 4g/day)",
      cautions: "Do not exceed maximum daily dose. Avoid if liver disease.",
    },
    ibuprofen: {
      name: "Ibuprofen",
      safe: temperature_c < 39.5,
      dosing: isChild
        ? "5-10 mg/kg per dose, every 6-8 hours (max 3-4 doses/day)"
        : "200-400 mg per dose, every 6-8 hours (max 3-4 doses/day, max 1.2g/day)",
      cautions: "Avoid if stomach ulcers, kidney disease, or taking blood thinners. Not recommended for high fever (>39.5°C) without medical supervision.",
    },
  };

  return {
    medications: Object.values(guidance),
    red_flags: [
      "Temperature ≥40°C",
      "SpO₂ <94%",
      "Severe breathing difficulty",
      "Persistent vomiting",
      "Altered mental state",
      "Severe dehydration",
    ],
    when_to_seek_care: [
      "Fever persists >48-72 hours",
      "Symptoms worsen despite OTC medications",
      "Any red flag appears",
      "Unable to keep fluids down",
      "Severe pain or discomfort",
    ],
  };
}

