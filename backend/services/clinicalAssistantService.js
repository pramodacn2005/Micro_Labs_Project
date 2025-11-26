/**
 * Clinical AI Assistant Service
 * Implements comprehensive fever classification with exact rule-based logic
 * Returns structured JSON with charts and clinical guidance
 */

import { lookupHospitals } from "./hospitalLookupService.js";

const DISCLAIMER = "This is informational and not a substitute for professional medical care.";

/**
 * Validate required inputs
 */
function validateRequiredInputs(params) {
  const missing = [];

  // Check demographics
  if (params.age === undefined || params.age === null || params.age === "") {
    missing.push("age");
  }
  if (params.gender === undefined || params.gender === null || params.gender === "") {
    missing.push("gender");
  }

  // Check vitals - accept multiple formats
  if ((params.temperature_c === undefined || params.temperature_c === null || params.temperature_c === "") &&
      (!params.body_temperature || (params.body_temperature && typeof params.body_temperature === 'object' && !params.body_temperature.temperature_value))) {
    missing.push("temperature_c");
  }
  if (params.heart_rate_bpm === undefined || params.heart_rate_bpm === null || params.heart_rate_bpm === "") {
    missing.push("heart_rate_bpm");
  }
  if ((params.respiratory_rate === undefined || params.respiratory_rate === null || params.respiratory_rate === "") &&
      (params.respiratory_rate_bpm === undefined || params.respiratory_rate_bpm === null || params.respiratory_rate_bpm === "")) {
    missing.push("respiratory_rate");
  }
  if ((params.spo2 === undefined || params.spo2 === null || params.spo2 === "") &&
      (params.spo2_pct === undefined || params.spo2_pct === null || params.spo2_pct === "")) {
    missing.push("spo2_pct");
  }
  if (params.bp_systolic === undefined || params.bp_systolic === null || params.bp_systolic === "") {
    missing.push("bp_systolic");
  }
  if (params.bp_diastolic === undefined || params.bp_diastolic === null || params.bp_diastolic === "") {
    missing.push("bp_diastolic");
  }

  return missing;
}

/**
 * Classify fever type based on exact rules
 */
export function classifyFeverType(params) {
  const {
    temperature_c,
    heart_rate_bpm,
    respiratory_rate,
    respiratory_rate_bpm,
    spo2,
    spo2_pct,
    bp_systolic,
    bp_diastolic,
    chills,
    sweating,
    loss_appetite,
    loss_of_appetite,
    sore_throat,
    runny_nose,
    nasal_congestion,
    vomiting,
    fatigue,
    headache,
    myalgia,
    body_aches,
    breathing_difficulty,
    cough,
    pain_scale,
    body_pain_scale,
    wbc_count,
    platelet_count,
    crp,
    esr,
    neutrophils,
    lymphocytes,
  } = params;

  const temp = temperature_c || 0;
  const hr = heart_rate_bpm || 0;
  const rr = respiratory_rate || respiratory_rate_bpm || 0;
  const spO2 = spo2 || spo2_pct || 100;
  const bpSys = bp_systolic || 120;
  const lossAppetite = loss_appetite !== undefined ? loss_appetite : loss_of_appetite;
  const myalgiaValue = myalgia || body_aches || "none";
  const painScale = pain_scale || body_pain_scale || 0;
  const parseMetric = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
  };
  const wbc = parseMetric(wbc_count);
  const platelets = parseMetric(platelet_count);
  const crpValue = parseMetric(crp);
  const esrValue = parseMetric(esr);
  const neut = parseMetric(neutrophils);
  const lymph = parseMetric(lymphocytes);

  // Score each fever type according to exact rules
  const scores = {
    viral: 0,
    bacterial: 0,
    dengue: 0,
    typhoid: 0,
    malaria: 0,
    covid_flu: 0,
    heat_stroke: 0,
  };

  // Viral: temp 38–39, mild HR rise, normal SpO₂, cough/cold symptoms
  if (temp >= 38 && temp < 39) scores.viral += 35;
  if (hr > 70 && hr < 100) scores.viral += 10; // Mild HR rise
  if (spO2 >= 95) scores.viral += 15; // Normal SpO₂
  if (cough && cough !== "none") scores.viral += 20;
  if (runny_nose || nasal_congestion) scores.viral += 15;
  if (sore_throat) scores.viral += 5;
  if (wbc && wbc >= 3500 && wbc <= 9000) scores.viral += 10;
  if (lymph && lymph >= 35) scores.viral += 5;

  // Bacterial: temp ≥39–40+, strong tachycardia, focal severe pain/vomiting, possible hypotension
  if (temp >= 39 && temp < 40) scores.bacterial += 30;
  if (temp >= 40) scores.bacterial += 40;
  if (hr > 100) scores.bacterial += 20; // Strong tachycardia
  if (hr > 120) scores.bacterial += 10;
  if (vomiting) scores.bacterial += 15;
  if (painScale >= 7 || (headache === "severe" && sore_throat)) scores.bacterial += 15;
  if (bpSys < 100) scores.bacterial += 10; // Possible hypotension
  if (wbc && wbc > 12000) scores.bacterial += 20;
  if (neut && neut > 75) scores.bacterial += 10;
  if (crpValue && crpValue > 15) scores.bacterial += 15;
  if (crpValue && crpValue > 30) scores.bacterial += 10;

  // Dengue: temp ~40 spike, relative low/normal HR (pulse-temp dissociation), severe myalgia, low BP
  if (temp >= 39.5 && temp <= 40.5) scores.dengue += 30;
  if (temp >= 40) scores.dengue += 10;
  // Pulse-temp dissociation: high temp but relatively low HR
  if (temp >= 39.5 && hr < 100 && hr >= 60) scores.dengue += 25;
  if (myalgiaValue === "severe" || painScale >= 8) scores.dengue += 20;
  if (bpSys < 100) scores.dengue += 15;
  if (chills) scores.dengue += 5;
  if (platelets && platelets < 130000) scores.dengue += 25;
  if (platelets && platelets < 100000) scores.dengue += 15;
  if (wbc && wbc < 4500) scores.dengue += 10;
  if (lymph && lymph > 40) scores.dengue += 5;

  // Typhoid: gradual stepwise fever rise, low-normal HR, loss of appetite, abdominal complaints
  if (temp >= 38 && temp < 40) scores.typhoid += 25;
  if (hr < 90 && hr >= 60) scores.typhoid += 20; // Low-normal HR
  if (lossAppetite) scores.typhoid += 20;
  if (headache && headache !== "none") scores.typhoid += 15;
  if (vomiting || fatigue === "severe") scores.typhoid += 10;
  if (!runny_nose && !nasal_congestion) scores.typhoid += 10; // No cold symptoms
  if (wbc && wbc >= 4500 && wbc <= 6500) scores.typhoid += 10;
  if (esrValue && esrValue > 35) scores.typhoid += 15;
  if (crpValue && crpValue >= 10 && crpValue <= 25) scores.typhoid += 10;

  // Malaria: cyclic spikes (chills→fever→sweating), high temp during spikes, severe headache/myalgia
  if (chills && sweating) scores.malaria += 35; // Cyclic pattern
  if (chills) scores.malaria += 15;
  if (sweating) scores.malaria += 10;
  if (temp >= 38.5 && temp < 40.5) scores.malaria += 20; // High temp during spikes
  if (headache === "severe" || myalgiaValue === "severe") scores.malaria += 20;
  if (headache && headache !== "none") scores.malaria += 10;
  if (myalgiaValue && myalgiaValue !== "none") scores.malaria += 10;
  if (platelets && platelets < 150000) scores.malaria += 15;
  if (wbc && wbc < 5000) scores.malaria += 10;

  // COVID/Flu: temp 38–39, high RR, low SpO₂ (<94), dry cough, breathing difficulty
  if (temp >= 38 && temp < 39) scores.covid_flu += 25;
  if (rr > 20) scores.covid_flu += 20; // High RR
  if (rr > 24) scores.covid_flu += 10; // Very high RR
  if (spO2 < 94) scores.covid_flu += 30;
  if (spO2 < 92) scores.covid_flu += 15;
  if (cough === "dry") scores.covid_flu += 20;
  if (breathing_difficulty && breathing_difficulty !== "none") scores.covid_flu += 15;
  if (breathing_difficulty === "severe") scores.covid_flu += 10;
  if (fatigue && fatigue !== "none") scores.covid_flu += 5;
  if (lymph && lymph < 20) scores.covid_flu += 10;

  // Heat Stroke: temp >40, very high HR, dehydration signs, absence of infection respiratory symptoms
  if (temp > 40) scores.heat_stroke += 40;
  if (temp >= 41) scores.heat_stroke += 20;
  if (hr > 120) scores.heat_stroke += 25; // Very high HR
  if (hr > 140) scores.heat_stroke += 10;
  // Absence of infection symptoms
  if (!chills && !sore_throat && !runny_nose && !nasal_congestion && cough === "none") {
    scores.heat_stroke += 20;
  }
  if (fatigue === "severe") scores.heat_stroke += 10;
  if (vomiting) scores.heat_stroke += 5; // Dehydration sign

  // Normalize scores to 0-100 confidence
  const maxPossibleScore = 100;
  const typeMap = {
    viral: "Viral Fever",
    bacterial: "Bacterial Fever",
    dengue: "Dengue Fever",
    typhoid: "Typhoid Fever",
    malaria: "Malaria Fever",
    covid_flu: "COVID / Flu",
    heat_stroke: "Heat Stroke",
  };

  // Calculate all confidences for chart (in exact order)
  const allConfidences = {
    "Viral Fever": Math.min(100, Math.round((scores.viral / maxPossibleScore) * 100)),
    "Bacterial Fever": Math.min(100, Math.round((scores.bacterial / maxPossibleScore) * 100)),
    "Dengue Fever": Math.min(100, Math.round((scores.dengue / maxPossibleScore) * 100)),
    "Typhoid Fever": Math.min(100, Math.round((scores.typhoid / maxPossibleScore) * 100)),
    "Malaria Fever": Math.min(100, Math.round((scores.malaria / maxPossibleScore) * 100)),
    "COVID / Flu": Math.min(100, Math.round((scores.covid_flu / maxPossibleScore) * 100)),
    "Heat Stroke": Math.min(100, Math.round((scores.heat_stroke / maxPossibleScore) * 100)),
  };

  // Find top 2 fever types
  const sorted = Object.entries(scores)
    .map(([type, score]) => ({ type, score, name: typeMap[type] }))
    .sort((a, b) => b.score - a.score);

  const topType = sorted[0] || { type: "viral", score: 0, name: "Viral Fever" };
  const secondType = sorted[1] || null;

  // Calculate confidence
  const maxScore = Math.max(...Object.values(scores));
  const primaryConfidence = Math.min(100, Math.round((maxScore / maxPossibleScore) * 100));
  const secondaryConfidence = secondType && secondType.score > 20 
    ? Math.min(100, Math.round((secondType.score / maxPossibleScore) * 100))
    : null;

  // Build rationale
  const rationale = buildRationale(params, topType.type, temp, hr, rr, spO2, bpSys, myalgiaValue, painScale, lossAppetite, chills, sweating, cough, breathing_difficulty);

  return {
    fever_type: topType.name,
    secondary_type: secondaryConfidence && secondType ? secondType.name : null,
    primary_confidence: primaryConfidence,
    secondary_confidence: secondaryConfidence,
    rationale,
    all_confidences: allConfidences,
  };
}

/**
 * Build rationale explanation
 */
function buildRationale(params, feverType, temp, hr, rr, spO2, bpSys, myalgiaValue, painScale, lossAppetite, chills, sweating, cough, breathing_difficulty) {
  const reasons = [];
  
  switch (feverType) {
    case "viral":
      if (temp >= 38 && temp < 39) reasons.push(`moderate fever (${temp}°C)`);
      if (cough && cough !== "none") reasons.push("cough/cold symptoms");
      if (spO2 >= 95) reasons.push("normal SpO₂");
      break;
    case "bacterial":
      if (temp >= 39) reasons.push(`high fever (${temp}°C)`);
      if (hr > 100) reasons.push(`strong tachycardia (${hr} bpm)`);
      if (params.vomiting) reasons.push("vomiting");
      if (painScale >= 7) reasons.push("severe pain");
      break;
    case "dengue":
      if (temp >= 39.5) reasons.push(`very high fever spike (~${temp}°C)`);
      if (temp >= 39.5 && hr < 100) reasons.push("pulse-temp dissociation");
      if (myalgiaValue === "severe" || painScale >= 8) reasons.push("severe myalgia");
      if (bpSys < 100) reasons.push("low BP");
      break;
    case "typhoid":
      if (temp >= 38) reasons.push(`gradual fever rise (${temp}°C)`);
      if (hr < 90) reasons.push("low-normal HR");
      if (lossAppetite) reasons.push("loss of appetite");
      break;
    case "malaria":
      if (chills && sweating) reasons.push("cyclic chills→fever→sweating pattern");
      if (temp >= 38.5) reasons.push(`high temp during spike (${temp}°C)`);
      if (params.headache === "severe" || myalgiaValue === "severe") reasons.push("severe headache/myalgia");
      break;
    case "covid_flu":
      if (temp >= 38 && temp < 39) reasons.push(`fever (${temp}°C)`);
      if (rr > 20) reasons.push(`high RR (${rr} bpm)`);
      if (spO2 < 94) reasons.push(`low SpO₂ (${spO2}%)`);
      if (cough === "dry") reasons.push("dry cough");
      if (breathing_difficulty && breathing_difficulty !== "none") reasons.push("breathing difficulty");
      break;
    case "heat_stroke":
      if (temp > 40) reasons.push(`very high temp (${temp}°C)`);
      if (hr > 120) reasons.push(`very high HR (${hr} bpm)`);
      if (!chills && !params.sore_throat) reasons.push("absence of infection symptoms");
      break;
  }
  
  return reasons.length > 0 ? reasons.join(", ") : "Based on provided symptoms.";
}

/**
 * Check for emergency/urgent conditions
 */
function checkEmergencyConditions(params) {
  const {
    temperature_c,
    spo2,
    spo2_pct,
    respiratory_rate,
    respiratory_rate_bpm,
    breathing_difficulty,
    bp_systolic,
  } = params;

  const spO2 = parseFloat(spo2 || spo2_pct || 100);
  const rr = parseFloat(respiratory_rate || respiratory_rate_bpm || 0);
  const temp = parseFloat(temperature_c || 0);
  const bpSys = parseFloat(bp_systolic || 120);

  const urgentFlags = [];
  let isEmergency = false;
  let isUrgent = false;

  // Emergency conditions
  if (temp >= 40) {
    urgentFlags.push(`Temperature ${temp}°C ≥ 40°C`);
    isEmergency = true;
  }
  if (spO2 < 92) {
    urgentFlags.push(`SpO₂ ${spO2}% < 92%`);
    isEmergency = true;
  }
  if (bpSys < 90) {
    urgentFlags.push(`Systolic BP ${bpSys} mmHg < 90 mmHg`);
    isEmergency = true;
  }
  if (breathing_difficulty === "severe") {
    urgentFlags.push("Severe breathing difficulty");
    isEmergency = true;
  }

  // Urgent conditions
  if (temp >= 39 && temp < 40) {
    urgentFlags.push(`Temperature ${temp}°C ≥ 39°C`);
    isUrgent = true;
  }
  if (spO2 < 94 && spO2 >= 92) {
    urgentFlags.push(`SpO₂ ${spO2}% < 94%`);
    isUrgent = true;
  }
  if (rr > 24) {
    urgentFlags.push(`Respiratory rate ${rr} bpm > 24 bpm`);
    isUrgent = true;
  }

  return {
    isEmergency,
    isUrgent,
    urgentFlags,
    urgentMessage: (isEmergency || isUrgent) 
      ? "URGENT: Your signs may indicate severe illness — seek emergency care now."
      : null,
  };
}

/**
 * Generate temperature trend chart
 */
function generateTemperatureTrendChart(params, currentTemp) {
  const { time_series_temps } = params;

  if (time_series_temps && Array.isArray(time_series_temps) && time_series_temps.length > 0) {
    // Sort by timestamp
    const sorted = [...time_series_temps].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const labels = sorted.map((item) => item.timestamp);
    const data = sorted.map((item) => parseFloat(item.temperature_c));

    return {
      id: "temp_trend",
      type: "line",
      labels,
      datasets: [{
        label: "Temperature (°C)",
        data,
      }],
      y_axis: {
        min: 35,
        max: 42,
      },
      is_single_point: false,
    };
  } else {
    // Single point with current temperature
    const now = new Date().toISOString();
    return {
      id: "temp_trend",
      type: "line",
      labels: [now],
      datasets: [{
        label: "Temperature (°C)",
        data: [currentTemp || 0],
      }],
      y_axis: {
        min: 35,
        max: 42,
      },
      is_single_point: true,
    };
  }
}

/**
 * Generate fever confidence comparison chart
 */
function generateFeverConfidenceChart(allConfidences) {
  // Exact order as specified
  const labels = [
    "Viral Fever",
    "Bacterial Fever",
    "Dengue Fever",
    "Typhoid Fever",
    "Malaria Fever",
    "COVID / Flu",
    "Heat Stroke",
  ];

  const data = labels.map((label) => allConfidences[label] || 0);

  return {
    id: "fever_confidence",
    type: "bar",
    labels,
    datasets: [{
      label: "Confidence (%)",
      data,
    }],
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
    const formatted = hospitals.map((hosp) => ({
      name: hosp.name || "Hospital",
      type: determineHospitalType(hosp.name, hosp.address),
      address: hosp.address || hosp.name || "Address not available",
      lat: hosp.lat || location.lat || null,
      lon: hosp.lon || location.lon || null,
      distance_km: hosp.distance_km ? parseFloat(hosp.distance_km.toFixed(2)) : null,
      estimated_travel_time_min: hosp.distance_km ? Math.round(hosp.distance_km * 2) : null,
      phone: hosp.phone || null,
      open_now: null,
      specialties: [],
      accepts_teleconsult: null,
      ratings: null,
      directions_url: hosp.map_url || hosp.directions_url || null,
    }));

    // Sort by distance (nearest first), or prioritize emergency centers if urgent
    if (isUrgent) {
      formatted.sort((a, b) => {
        if (a.type === "emergency_center" && b.type !== "emergency_center") return -1;
        if (b.type === "emergency_center" && a.type !== "emergency_center") return 1;
        return (a.distance_km || 999) - (b.distance_km || 999);
      });
    } else {
      formatted.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    return formatted;
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
 * Generate summary text
 */
function generateSummary(feverAssessment, emergencyCheck, tempTrendChart, hasTimeSeries) {
  const { fever_type, primary_confidence, secondary_type, secondary_confidence, rationale } = feverAssessment;
  const { urgentMessage } = emergencyCheck;

  let summary = "";

  if (urgentMessage) {
    summary += `${urgentMessage} `;
  }

  summary += `Based on your symptoms, the most likely diagnosis is **${fever_type}** (${primary_confidence}% confidence). ${rationale}`;

  if (secondary_type && secondary_confidence) {
    summary += ` Secondary possibility: **${secondary_type}** (${secondary_confidence}% confidence).`;
  }

  if (!hasTimeSeries && tempTrendChart.is_single_point) {
    summary += " Note: Temperature trend chart shows a single data point (current temperature) as time-series data was not provided.";
  }

  return summary;
}

/**
 * Main clinical assessment function
 */
export async function performClinicalAssessment(params) {
  try {
    console.log("[ClinicalAssistant] Received params:", JSON.stringify(params, null, 2));

    // Validate required inputs
    const missing = validateRequiredInputs(params);
    if (missing.length > 0) {
      console.log("[ClinicalAssistant] Missing fields:", missing);
      return {
        error: "Missing required parameters",
        missing_fields: missing,
        message: `Please provide the following required information: ${missing.join(", ")}`,
      };
    }

    // Check for location consent if hospital search needed
    if (params.request_hospitals && !params.consent_location && !params.location && !params.user_location) {
      return {
        error: "Location consent required",
        message: "To find nearby hospitals, please provide location consent or specify your city name.",
      };
    }

    // Classify fever type
    console.log("[ClinicalAssistant] Classifying fever type...");
    const feverAssessment = classifyFeverType(params);
    console.log("[ClinicalAssistant] Fever assessment:", JSON.stringify(feverAssessment, null, 2));

    // Check for emergency conditions
    const emergencyCheck = checkEmergencyConditions(params);
    console.log("[ClinicalAssistant] Emergency check:", JSON.stringify(emergencyCheck, null, 2));

    // Generate charts
    console.log("[ClinicalAssistant] Generating charts...");
    const tempTrendChart = generateTemperatureTrendChart(params, params.temperature_c);
    const feverConfidenceChart = generateFeverConfidenceChart(feverAssessment.all_confidences);
    console.log("[ClinicalAssistant] Charts generated:", {
      tempTrend: tempTrendChart.id,
      confidence: feverConfidenceChart.id,
    });

    // Find hospitals if location provided
    let hospitals = [];
    if ((params.location || params.user_location) && params.request_hospitals !== false) {
      console.log("[ClinicalAssistant] Looking up hospitals...");
      const location = params.location || params.user_location;
      hospitals = await formatHospitals(
        location,
        5,
        emergencyCheck.isUrgent || emergencyCheck.isEmergency
      );
      console.log("[ClinicalAssistant] Found hospitals:", hospitals.length);
    }

    // Generate summary
    const hasTimeSeries = params.time_series_temps && Array.isArray(params.time_series_temps) && params.time_series_temps.length > 0;
    const summary = generateSummary(feverAssessment, emergencyCheck, tempTrendChart, hasTimeSeries);

    // Build exact response format
    const response = {
      fever_assessment: {
        fever_type: feverAssessment.fever_type,
        secondary_type: feverAssessment.secondary_type,
        primary_confidence: feverAssessment.primary_confidence,
        secondary_confidence: feverAssessment.secondary_confidence,
        rationale: feverAssessment.rationale,
      },
      charts: [
        tempTrendChart,
        feverConfidenceChart,
      ],
      results_json: hospitals,
      summary_text: summary,
      disclaimer: DISCLAIMER,
    };

    console.log("[ClinicalAssistant] Response prepared successfully");
    return response;
  } catch (error) {
    console.error("[ClinicalAssistant] Error in performClinicalAssessment:", error);
    console.error("[ClinicalAssistant] Error stack:", error.stack);
    return {
      error: "Internal server error",
      message: "Unable to perform clinical assessment. Please try again later.",
      detail: process.env.NODE_ENV !== "production" ? error.message : undefined,
    };
  }
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
