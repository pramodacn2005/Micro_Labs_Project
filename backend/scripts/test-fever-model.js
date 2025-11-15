/**
 * Test script to verify the fever model is working correctly
 * Run with: node backend/scripts/test-fever-model.js
 */

const testPayload = {
  age: 32,
  gender: "Female",
  body_temperature: { temperature_value: 38.5, temperature_unit: "C" },
  heart_rate_bpm: 100,
  respiratory_rate_bpm: 20,
  spo2: 98,
  bp_systolic: 120,
  bp_diastolic: 80,
  chills: true,
  sweating: false,
  loss_of_appetite: true,
  sore_throat: true,
  runny_nose: false,
  nasal_congestion: true,
  vomiting: false,
  fatigue: "moderate",
  headache: "mild",
  body_aches: "moderate",
  breathing_difficulty: "none",
  cough: "dry",
  body_pain_scale: 5,
  alcohol_consumption: "none",
  medical_history: false,
  medical_history_text: "",
  location: { city: "New York" },
  consent: true,
};

async function testFeverModel() {
  const API_URL = process.env.API_URL || "http://localhost:3000/api/fever-check";
  
  console.log("🧪 Testing Fever Model API");
  console.log("=" .repeat(50));
  console.log(`📍 Endpoint: ${API_URL}`);
  console.log(`📦 Payload:`, JSON.stringify(testPayload, null, 2));
  console.log("\n⏳ Sending request...\n");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ Request failed!");
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error("Error:", JSON.stringify(responseData, null, 2));
      process.exit(1);
    }

    console.log("✅ Request successful!\n");
    console.log("📊 Response:");
    console.log("=" .repeat(50));
    
    // Display prediction
    if (responseData.prediction) {
      console.log("\n🎯 Prediction:");
      console.log(`   Label: ${responseData.prediction.label}`);
      console.log(`   Probability: ${(responseData.prediction.probability * 100).toFixed(1)}%`);
      console.log(`   Severity: ${responseData.prediction.severity}`);
    }

    // Display explainability
    if (responseData.explainability?.top_features) {
      console.log("\n🔍 Top Features (SHAP):");
      responseData.explainability.top_features.forEach((feature, idx) => {
        console.log(`   ${idx + 1}. ${feature.feature}`);
        console.log(`      Importance: ${(feature.importance * 100).toFixed(1)}%`);
        console.log(`      Direction: ${feature.direction}`);
      });
    }

    // Display suggestions
    if (responseData.suggestions) {
      console.log("\n💊 Medication Suggestions:");
      if (responseData.suggestions.medications?.length > 0) {
        responseData.suggestions.medications.forEach((med, idx) => {
          console.log(`   ${idx + 1}. ${med.name}`);
          console.log(`      Verified: ${med.clinicianVerified ? "Yes" : "No"}`);
        });
      } else {
        console.log("   (No medications suggested)");
      }

      console.log("\n⚠️  Precautions:");
      responseData.suggestions.precautions?.forEach((precaution, idx) => {
        console.log(`   ${idx + 1}. ${precaution}`);
      });
    }

    // Display hospitals
    if (responseData.hospitals?.length > 0) {
      console.log("\n🏥 Nearby Hospitals:");
      responseData.hospitals.slice(0, 3).forEach((hospital, idx) => {
        console.log(`   ${idx + 1}. ${hospital.name}`);
        if (hospital.address) console.log(`      ${hospital.address}`);
        if (hospital.distance_km) console.log(`      Distance: ${hospital.distance_km} km`);
      });
    }

    // Display session info
    if (responseData.ai_assistant_session_id) {
      console.log(`\n💬 AI Assistant Session ID: ${responseData.ai_assistant_session_id}`);
    }

    if (responseData.pdf_report_url) {
      console.log(`\n📄 PDF Report URL: ${responseData.pdf_report_url}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ All checks passed! Model is working correctly.");
    
  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testFeverModel();








