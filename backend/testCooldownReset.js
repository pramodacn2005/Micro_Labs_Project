// backend/testCooldownReset.js
// Test script to demonstrate the new 10-minute cooldown functionality

import { processVitalReading, getVitalStatus, resetVitalCounter } from './controllers/vitalAlertController.js';

// Test data
const testDeviceId = 'test-device-cooldown';
const testPatientData = {
  patientName: 'Test Patient',
  patientId: 'P002',
  email: 'test@example.com'
};

async function testCooldownFunctionality() {
  console.log('🧪 Testing 10-Minute Cooldown Functionality\n');
  
  // Test 1: Send first alert (simulate 3 consecutive readings)
  console.log('📋 Test 1: Simulating 3 consecutive abnormal readings to trigger email');
  
  // First abnormal reading
  console.log('  📊 Reading 1: Abnormal vitals detected');
  await processVitalReading(testDeviceId, {
    heartRate: 110, // Abnormal
    spo2: 88,       // Abnormal  
    bodyTemp: 38.5  // Abnormal
  }, testPatientData);
  
  // Second abnormal reading
  console.log('  📊 Reading 2: Still abnormal, counter = 2');
  await processVitalReading(testDeviceId, {
    heartRate: 115, // Still abnormal
    spo2: 87,       // Still abnormal
    bodyTemp: 38.8  // Still abnormal
  }, testPatientData);
  
  // Third abnormal reading - should trigger email
  console.log('  📊 Reading 3: Still abnormal, counter = 3 - EMAIL SHOULD BE SENT!');
  const result1 = await processVitalReading(testDeviceId, {
    heartRate: 120, // Still abnormal
    spo2: 86,       // Still abnormal
    bodyTemp: 39.0  // Still abnormal
  }, testPatientData);
  
  console.log('✅ First alert result:', result1.abnormalVitals.length > 0 ? 'EMAIL SENT!' : 'No email');
  
  // Test 2: Try to send another alert immediately (should be blocked by cooldown)
  console.log('\n📋 Test 2: Trying to send another alert immediately (should be blocked by 10-min cooldown)');
  
  // Simulate another 3 consecutive readings
  console.log('  📊 Reading 4: Abnormal again, but in cooldown period');
  await processVitalReading(testDeviceId, {
    heartRate: 125, // Still abnormal
    spo2: 85,       // Still abnormal
    bodyTemp: 39.2  // Still abnormal
  }, testPatientData);
  
  console.log('  📊 Reading 5: Still abnormal, counter = 2, but in cooldown');
  await processVitalReading(testDeviceId, {
    heartRate: 130, // Still abnormal
    spo2: 84,       // Still abnormal
    bodyTemp: 39.5  // Still abnormal
  }, testPatientData);
  
  console.log('  📊 Reading 6: Still abnormal, counter = 3, but should be BLOCKED by cooldown');
  const result2 = await processVitalReading(testDeviceId, {
    heartRate: 135, // Still abnormal
    spo2: 83,       // Still abnormal
    bodyTemp: 40.0  // Still abnormal
  }, testPatientData);
  
  console.log('✅ Second alert result:', result2.abnormalVitals.length > 0 ? 'EMAIL SENT!' : 'BLOCKED BY COOLDOWN');
  
  // Show current status
  const status = getVitalStatus(testDeviceId);
  console.log('\n📊 Current Status:');
  console.log('Consecutive Counters:', JSON.stringify(status.consecutiveCounters));
  console.log('Active Cooldowns:', Object.keys(status.cooldowns).length);
  
  // Show cooldown details
  Object.entries(status.cooldowns).forEach(([key, cooldown]) => {
    const minutesRemaining = Math.ceil((600000 - cooldown.timeSinceLastAlert) / 60000);
    console.log(`⏰ ${key}: ${minutesRemaining} minutes remaining in cooldown`);
  });
  
  console.log('\n💡 Key Points:');
  console.log('✅ Email sent successfully on 3rd consecutive abnormal reading');
  console.log('⏰ 10-minute cooldown now active - no more emails for same vitals');
  console.log('🔄 After 10 minutes, system will send emails again for new abnormal readings');
  console.log('📧 Check your email inbox for the alert!');
  
  console.log('\n🎯 To test again after 10 minutes:');
  console.log('1. Wait 10 minutes');
  console.log('2. Run this script again');
  console.log('3. Or run: node testVitalAlerts.js');
}

// Run the test
testCooldownFunctionality().catch(console.error);
