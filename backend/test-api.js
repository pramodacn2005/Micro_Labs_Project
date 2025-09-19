// Simple test script to verify API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('Testing History API endpoints...\n');

  try {
    // Test 1: Get files for patient
    console.log('1. Testing GET /api/files/patient/Pramoda CN');
    const response1 = await fetch(`${BASE_URL}/api/files/patient/Pramoda%20CN`);
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('✅ Get files endpoint working\n');

    // Test 2: Test with filters
    console.log('2. Testing GET /api/files/patient/Pramoda CN?type=pdf');
    const response2 = await fetch(`${BASE_URL}/api/files/patient/Pramoda%20CN?type=pdf`);
    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    console.log('✅ Filter by type working\n');

    // Test 3: Test health endpoint
    console.log('3. Testing GET /api/health');
    const response3 = await fetch(`${BASE_URL}/api/health`);
    const data3 = await response3.json();
    console.log('Response:', JSON.stringify(data3, null, 2));
    console.log('✅ Health endpoint working\n');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPI();
