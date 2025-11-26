import path from "path";
import fs from "fs-extra";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "..", "config", "medications.yaml");

let cachedConfig = null;

function ageBand(age) {
  if (age < 12) return "child";
  if (age < 18) return "adolescent";
  if (age < 65) return "adult";
  return "senior";
}

export function loadMedicationConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const file = fs.readFileSync(configPath, "utf8");
    cachedConfig = yaml.load(file) || [];
    return cachedConfig;
  } catch (error) {
    console.warn("[MedicationService] Unable to load medications.yaml", error.message);
    cachedConfig = [];
    return cachedConfig;
  }
}

/**
 * Get dynamic medication suggestions based on fever severity and probability
 * @param {number} age - Patient age
 * @param {string} severityBucket - Severity bucket (e.g., "Low probability", "High probability")
 * @param {number} probability - Prediction probability (0-1)
 * @returns {Array} Array of medication suggestions
 */
export function getMedicationSuggestions({ age, severityBucket, probability = 0.5 }) {
  // Determine severity level based on probability
  let severityLevel;
  if (probability < 0.40) {
    severityLevel = "low";
  } else if (probability < 0.70) {
    severityLevel = "moderate";
  } else if (probability < 0.90) {
    severityLevel = "high";
  } else {
    severityLevel = "very_high";
  }

  const meds = loadMedicationConfig();
  const band = ageBand(age);
  const allMeds = meds
    .map((entry) => {
      const bandInfo = entry.ages?.[band];
      if (!bandInfo) return null;
      return {
        id: entry.id,
        name: entry.name,
        clinicianVerified: Boolean(entry.clinician_verified),
        guidance: bandInfo.dosing_guidance || "TODO - Awaiting clinician-approved dosing.",
        source: entry.references?.[0] || entry.notes || "Pending clinician reference",
        severityFit: entry.severity || ["low", "moderate", "high"],
        caution: entry.contraindications || [],
        notes: entry.notes,
      };
    })
    .filter(Boolean);

  // Dynamic medication selection based on severity
  let selectedMedications = [];

  if (severityLevel === "low") {
    // Low Fever: Paracetamol only + light hydration
    selectedMedications = allMeds
      .filter((med) => med.id === "paracetamol")
      .map((med) => ({
        ...med,
        dosage: getAgeBasedDosage(med, band),
        reference: med.source,
      }));
    
    // Add hydration advice
    selectedMedications.push({
      id: "hydration_light",
      name: "Hydration",
      clinicianVerified: true,
      guidance: "Drink plenty of water. Aim for 8-10 glasses per day.",
      source: "General medical guidance",
      dosage: "Water intake",
      caution: [],
      notes: "Light hydration recommended",
    });
  } else if (severityLevel === "moderate") {
    // Moderate Fever: Paracetamol + Ibuprofen + ORS
    selectedMedications = allMeds
      .filter((med) => med.id === "paracetamol" || med.id === "ibuprofen")
      .map((med) => ({
        ...med,
        dosage: getAgeBasedDosage(med, band),
        reference: med.source,
      }));
    
    // Add ORS
    selectedMedications.push({
      id: "ors",
      name: "Oral Rehydration Solution (ORS)",
      clinicianVerified: true,
      guidance: "Take ORS to maintain electrolyte balance. Mix as per package instructions.",
      source: "WHO guidelines",
      dosage: "As per package instructions",
      caution: [],
      notes: "Important for maintaining hydration",
    });
  } else if (severityLevel === "high") {
    // High Fever: Paracetamol + Ibuprofen (with intervals) + Strong hydration
    selectedMedications = allMeds
      .filter((med) => med.id === "paracetamol" || med.id === "ibuprofen")
      .map((med) => ({
        ...med,
        dosage: getAgeBasedDosage(med, band),
        reference: med.source,
        interval: med.id === "paracetamol" ? "Every 4-6 hours" : "Every 6-8 hours (not with paracetamol)",
      }));
    
    // Add strong hydration
    selectedMedications.push({
      id: "hydration_strong",
      name: "Electrolyte ORS / Strong Hydration",
      clinicianVerified: true,
      guidance: "Maintain strong hydration with electrolyte solutions. Monitor fluid intake carefully.",
      source: "Medical guidance for high fever",
      dosage: "Frequent small sips",
      caution: ["Monitor for signs of dehydration"],
      notes: "Critical for high fever management",
    });
  } else {
    // Very High Fever: Paracetamol ONLY + Emergency instructions
    selectedMedications = allMeds
      .filter((med) => med.id === "paracetamol")
      .map((med) => ({
        ...med,
        dosage: getAgeBasedDosage(med, band),
        reference: med.source,
        emergency: true,
      }));
  }

  return selectedMedications.map((med) => ({
    id: med.id,
    name: med.name,
    clinicianVerified: med.clinicianVerified,
    guidance: med.guidance,
    source: med.source,
    dosage: med.dosage,
    caution: med.caution || [],
    notes: med.notes,
    interval: med.interval,
    emergency: med.emergency || false,
  }));
}

function getAgeBasedDosage(medEntry, ageBand) {
  if (!medEntry || !medEntry.id) return "Consult clinician";
  const meds = loadMedicationConfig();
  const entry = meds.find((m) => m.id === medEntry.id);
  if (!entry || !entry.ages?.[ageBand]) return "Consult clinician";
  return entry.ages[ageBand].dosing_guidance || "Consult clinician";
}

function getMedicationById(id, age) {
  const meds = loadMedicationConfig();
  const entry = meds.find((med) => med.id === id);
  if (!entry) return null;
  const band = ageBand(age);
  return {
    id: entry.id,
    name: entry.name,
    clinicianVerified: Boolean(entry.clinician_verified),
    guidance: entry.notes || "Example guidance – verify with clinician.",
    dosage: entry.ages?.[band]?.dosing_guidance || "Consult clinician",
    caution: entry.contraindications || [],
    reference: entry.references?.[0],
  };
}

const FEVER_TYPE_RULES = {
  "Viral Fever": {
    medications: [{ id: "paracetamol" }, { id: "hydration_light" }],
    precautions: [
      "Rest, hydrate, and avoid crowded environments.",
      "Monitor temperature every 4 hours.",
    ],
    dietPlan: ["Broths, soups, herbal teas", "Vitamin C fruits and ORS after sweating"],
  },
  "Bacterial Fever": {
    medications: [{ id: "paracetamol" }],
    precautions: [
      "Seek clinician evaluation for antibiotics.",
      "Do not start antibiotics without prescription.",
    ],
    dietPlan: ["Soft bland diet", "Plenty of fluids"],
  },
  Dengue: {
    medications: [{ id: "paracetamol" }, { id: "ors" }],
    precautions: [
      "Avoid NSAIDs (ibuprofen, aspirin).",
      "Monitor platelet count twice daily if available.",
    ],
    dietPlan: ["ORS, coconut water, papaya leaf juice (evidence limited)"],
  },
  Typhoid: {
    medications: [{ id: "paracetamol" }],
    precautions: [
      "Clinical antibiotics required – consult doctor immediately.",
      "Avoid raw foods; maintain hygiene.",
    ],
    dietPlan: ["Soft low-fiber foods", "Ensure safe drinking water"],
  },
  Malaria: {
    medications: [{ id: "paracetamol" }],
    precautions: [
      "Urgent doctor visit for antimalarial therapy.",
      "Prevent mosquito exposure for others in household.",
    ],
    dietPlan: ["Electrolyte drinks", "Easily digestible carbs"],
  },
  "Autoimmune-related fever": {
    medications: [{ id: "paracetamol" }],
    precautions: [
      "Coordinate with rheumatologist; do not stop baseline therapy abruptly.",
      "Monitor for flare symptoms or new rashes.",
    ],
    dietPlan: ["Anti-inflammatory diet focus (omega-3, turmeric)", "Limit processed sugars"],
  },
  "Unknown cause": {
    medications: [{ id: "paracetamol" }, { id: "hydration_light" }],
    precautions: [
      "Track temperature and vitals. If symptoms persist beyond 24 hrs, seek care.",
      "Avoid combining multiple OTC drugs.",
    ],
    dietPlan: ["Light meals", "Hydration with ORS"],
  },
};

function buildHydrationEntry(strength = "light") {
  if (strength === "strong") {
    return {
      id: "hydration_strong",
      name: "Electrolyte hydration",
      clinicianVerified: true,
      guidance: "Frequent ORS/electrolyte sips; monitor urine output.",
      dosage: "150-200 ml every 30 mins",
      caution: ["Limit free water if vomiting continues"],
      interval: "Continuous sips",
    };
  }
  return {
    id: "hydration_light",
    name: "Hydration",
    clinicianVerified: true,
    guidance: "Drink 8-10 cups of water or ORS per day.",
    dosage: "200 ml every hour while awake",
    caution: [],
  };
}

const SPECIAL_MED_ENTRIES = {
  ors: {
    id: "ors",
    name: "Oral Rehydration Solution",
    clinicianVerified: true,
    guidance: "Mix as per pack. Take 200-250 ml after each loose stool.",
    dosage: "Up to 1L/day unless clinician advises otherwise",
  },
  hydration_light: buildHydrationEntry("light"),
  hydration_strong: buildHydrationEntry("strong"),
};

export function getMedicationsForFeverType({ feverType = "Unknown cause", age = 30 }) {
  const rule = FEVER_TYPE_RULES[feverType] || FEVER_TYPE_RULES["Unknown cause"];
  const meds = rule.medications.map((entry) => {
    if (SPECIAL_MED_ENTRIES[entry.id]) {
      return SPECIAL_MED_ENTRIES[entry.id];
    }
    const med = getMedicationById(entry.id, age);
    if (!med) return null;
    return {
      id: med.id,
      name: med.name,
      clinicianVerified: med.clinicianVerified,
      guidance: med.guidance,
      dosage: med.dosage,
      caution: med.caution,
    };
  });

  return {
    medications: meds.filter(Boolean),
    precautions: rule.precautions || [],
    dietPlan: rule.dietPlan || [],
  };
}


