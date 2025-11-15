/**
 * Demo test script to test fever model with demo data
 * Run with: node backend/scripts/test-demo-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoDataPath = path.join(__dirname, '..', 'demo-test-data.json');

const API_URL = process.env.API_URL || "http://localhost:4000/api/fever-check";

async function testCase(caseData, caseName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${caseName}`);
  console.log(`📋 Description: ${caseData.description}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(caseData.data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ Request failed! Status: ${response.status}`);
      console.error("Error:", JSON.stringify(responseData, null, 2));
      return false;
    }

    // Display results
    console.log("✅ Request successful!\n");
    
    if (responseData.prediction) {
      console.log("🎯 Prediction Result:");
      console.log(`   Label: ${responseData.prediction.label}`);
      console.log(`   Probability: ${(responseData.prediction.probability * 100).toFixed(1)}%`);
      console.log(`   Severity: ${responseData.prediction.severity}`);
      console.log(`   Expected: ${caseData.expected_result}`);
      
      const match = responseData.prediction.label.toLowerCase().includes(
        caseData.expected_result.toLowerCase().replace(' ', '')
      );
      console.log(`   ${match ? '✅' : '⚠️'} Result ${match ? 'matches' : 'differs from'} expected`);
    }

    if (responseData.explainability?.top_features) {
      console.log("\n🔍 Top Contributing Features:");
      responseData.explainability.top_features.slice(0, 5).forEach((feature, idx) => {
        console.log(`   ${idx + 1}. ${feature.feature}: ${(feature.importance * 100).toFixed(1)}%`);
      });
    }

    if (responseData.suggestions?.medications?.length > 0) {
      console.log("\n💊 Medication Suggestions:");
      responseData.suggestions.medications.slice(0, 3).forEach((med, idx) => {
        console.log(`   ${idx + 1}. ${med.name}`);
      });
    }

    if (responseData.hospitals?.length > 0) {
      console.log(`\n🏥 Nearby Hospitals: ${responseData.hospitals.length} found`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error testing case: ${error.message}`);
    return false;
  }
}

async function runDemoTests() {
  console.log("🚀 Starting Demo Test Suite for Fever Model");
  console.log(`📍 API Endpoint: ${API_URL}`);
  console.log(`📁 Demo Data: ${demoDataPath}\n`);

  // Load demo data
  if (!fs.existsSync(demoDataPath)) {
    console.error(`❌ Demo data file not found: ${demoDataPath}`);
    process.exit(1);
  }

  const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));

  let passed = 0;
  let total = 0;

  // Test High Fever Cases
  console.log("\n" + "🔥".repeat(30));
  console.log("🔥 HIGH FEVER CASES");
  console.log("🔥".repeat(30));
  
  for (const testCase of demoData.high_fever_cases) {
    total++;
    const result = await testCase(testCase, testCase.name);
    if (result) passed++;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }

  // Test Normal Fever Cases
  console.log("\n" + "🌡️".repeat(30));
  console.log("🌡️ NORMAL TEMPERATURE CASES");
  console.log("🌡️".repeat(30));
  
  for (const testCase of demoData.normal_fever_cases) {
    total++;
    const result = await testCase(testCase, testCase.name);
    if (result) passed++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test Moderate Fever Cases
  console.log("\n" + "⚠️".repeat(30));
  console.log("⚠️ MODERATE FEVER CASES");
  console.log("⚠️".repeat(30));
  
  for (const testCase of demoData.moderate_fever_cases) {
    total++;
    const result = await testCase(testCase, testCase.name);
    if (result) passed++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("=".repeat(60) + "\n");
}

// Run the tests
runDemoTests().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});

