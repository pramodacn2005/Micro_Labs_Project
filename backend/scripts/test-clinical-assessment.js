/**
 * Test script for clinical assessment endpoint
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

const testPayload = {
  // Demographics
  age: 35,
  gender: "Male",
  
  // Vital Signs
  temperature_c: 39.5,
  heart_rate_bpm: 110,
  respiratory_rate: 22,
  spo2_pct: 96,
  bp_systolic: 130,
  bp_diastolic: 85,
  
  // Symptoms
  chills: true,
  sweating: true,
  loss_appetite: true,
  sore_throat: true,
  runny_nose: false,
  nasal_congestion: true,
  vomiting: true,
  fatigue: "severe",
  headache: "severe",
  myalgia: "severe",
  breathing_difficulty: "mild",
  cough: "dry",
  pain_scale: 8,
  
  // Lifestyle
  alcohol_consumption: "none",
  
  // Medical History
  medical_history_text: "",
  medications_text: "",
  
  // Location
  location: { city: "Mumbai" },
  consent_location: true,
  
  // Optional time series
  time_series_temps: null,
};

async function testClinicalAssessment() {
  try {
    console.log('🧪 Testing Clinical Assessment Endpoint...\n');
    console.log('📤 Sending request to:', `${API_URL}/clinical-assessment`);
    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));
    console.log('\n');

    const response = await axios.post(`${API_URL}/clinical-assessment`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('✅ Response Status:', response.status);
    console.log('\n📊 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response structure
    if (response.data.fever_assessment) {
      console.log('\n✅ Fever Assessment:', response.data.fever_assessment);
    } else {
      console.log('\n❌ Missing fever_assessment in response');
    }

    if (response.data.charts && Array.isArray(response.data.charts)) {
      console.log('\n✅ Charts:', response.data.charts.length, 'chart(s)');
      response.data.charts.forEach((chart, idx) => {
        console.log(`  Chart ${idx + 1}: ${chart.id} (${chart.type})`);
      });
    } else {
      console.log('\n❌ Missing or invalid charts in response');
    }

    if (response.data.results_json) {
      console.log('\n✅ Hospitals:', response.data.results_json.length, 'found');
    }

    if (response.data.summary_text) {
      console.log('\n✅ Summary:', response.data.summary_text);
    }

    if (response.data.disclaimer) {
      console.log('\n✅ Disclaimer:', response.data.disclaimer);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    }
    process.exit(1);
  }
}

testClinicalAssessment();




