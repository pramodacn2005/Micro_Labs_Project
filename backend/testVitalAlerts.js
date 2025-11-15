// backend/testVitalAlerts.js
// Test script for the vital alert email notification system

import { processVitalReading, getVitalStatus, getVitalThresholds } from './controllers/vitalAlertController.js';

// Test data
const testDeviceId = 'test-device-001';
const testPatientData = {
  patientName: 'John Doe',
  patientId: 'P001',
  email: 'john.doe@example.com'
};

// Test scenarios
const testScenarios = [
  {
    name: 'Normal readings - should not trigger alerts',
    vitals: {
      heartRate: 75,
      spo2: 98,
      bodyTemp: 36.5,
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  },
  {
    name: 'First abnormal reading - should increment counter',
    vitals: {
      heartRate: 110, // Above normal (100)
      spo2: 88, // Below normal (95)
      bodyTemp: 38.5, // Above normal (37.2)
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  },
  {
    name: 'Second abnormal reading - should increment counter',
    vitals: {
      heartRate: 115, // Still abnormal
      spo2: 87, // Still abnormal
      bodyTemp: 38.8, // Still abnormal
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  },
  {
    name: 'Third abnormal reading - should trigger email alert',
    vitals: {
      heartRate: 120, // Still abnormal - 3rd consecutive
      spo2: 86, // Still abnormal - 3rd consecutive
      bodyTemp: 39.0, // Still abnormal - 3rd consecutive
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  },
  {
    name: 'Normal readings after alert - should reset counters',
    vitals: {
      heartRate: 78, // Back to normal
      spo2: 97, // Back to normal
      bodyTemp: 36.8, // Back to normal
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  },
  {
    name: 'Another abnormal reading - should start new counter',
    vitals: {
      heartRate: 105, // Abnormal again
      spo2: 92, // Abnormal again
      bodyTemp: 37.5, // Abnormal again
      ambientTemp: 22,
      accMagnitude: 1.2
    }
  }
];

async function runTests() {
  console.log('🧪 Starting Vital Alert Email System Tests\n');
  console.log('📊 Current Vital Thresholds:');
  const thresholds = getVitalThresholds();
  Object.entries(thresholds).forEach(([vital, config]) => {
    console.log(`  ${config.name}: ${config.min}-${config.max}${config.unit} (Critical: ${config.criticalMin}-${config.criticalMax}${config.unit})`);
  });
  console.log('\n');

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Test ${i + 1}: ${scenario.name}`);
    console.log(`📊 Vitals: ${JSON.stringify(scenario.vitals, null, 2)}`);
    
    try {
      const result = await processVitalReading(testDeviceId, scenario.vitals, testPatientData);
      console.log(`✅ Result: ${JSON.stringify(result, null, 2)}`);
      
      // Show current status
      const status = getVitalStatus(testDeviceId);
      console.log(`📈 Current Status:`);
      console.log(`  Consecutive Counters: ${JSON.stringify(status.consecutiveCounters)}`);
      console.log(`  Cooldowns: ${Object.keys(status.cooldowns).length} active`);
      
    } catch (error) {
      console.error(`❌ Error in test ${i + 1}:`, error.message);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Tests completed!');
  console.log('\n📧 Check your email (or console logs) for any alert emails that were sent.');
  console.log('📊 Final device status:');
  const finalStatus = getVitalStatus(testDeviceId);
  console.log(JSON.stringify(finalStatus, null, 2));
}

// Run the tests
runTests().catch(console.error);














