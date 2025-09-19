// frontend/src/utils/testFirebaseConnection.js
import { getFirebaseDb } from '../services/firebaseService.js';
import { ref, set, onValue, off } from 'firebase/database';

export async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase Realtime Database Connection...');
  
  try {
    // Get database instance
    const db = getFirebaseDb();
    if (!db) {
      console.error('❌ Firebase database not initialized');
      return false;
    }
    
    console.log('✅ Firebase database initialized');
    
    // Test writing a simple value
    const testRef = ref(db, 'test_connection');
    const testData = {
      timestamp: Date.now(),
      message: 'Connection test successful',
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    console.log('📝 Writing test data to Firebase...');
    await set(testRef, testData);
    console.log('✅ Test data written successfully');
    
    // Test reading the data back
    console.log('📖 Reading test data from Firebase...');
    return new Promise((resolve) => {
      const unsubscribe = onValue(testRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('✅ Test data read successfully:', data);
          unsubscribe();
          resolve(true);
        } else {
          console.log('⚠️ No test data found');
          unsubscribe();
          resolve(false);
        }
      }, (error) => {
        console.error('❌ Error reading test data:', error);
        unsubscribe();
        resolve(false);
      });
    });
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
}

export async function testSensorDataPath() {
  console.log('🔍 Testing sensor_data path...');
  
  try {
    const db = getFirebaseDb();
    if (!db) {
      console.error('❌ Firebase database not initialized');
      return false;
    }
    
    const sensorRef = ref(db, 'sensor_data');
    
    return new Promise((resolve) => {
      const unsubscribe = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const readings = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
          console.log(`✅ Found ${readings.length} readings in sensor_data`);
          console.log('📊 Sample reading:', readings[0] || 'No data');
          unsubscribe();
          resolve(true);
        } else {
          console.log('⚠️ No data found in sensor_data path');
          unsubscribe();
          resolve(false);
        }
      }, (error) => {
        console.error('❌ Error reading sensor_data:', error);
        unsubscribe();
        resolve(false);
      });
    });
    
  } catch (error) {
    console.error('❌ Sensor data test failed:', error);
    return false;
  }
}

export async function runAllFirebaseTests() {
  console.log('🚀 Running All Firebase Tests...');
  console.log('================================');
  
  const connectionTest = await testFirebaseConnection();
  const sensorDataTest = await testSensorDataPath();
  
  console.log('================================');
  console.log('🏁 Test Results:');
  console.log(`- Connection Test: ${connectionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Sensor Data Test: ${sensorDataTest ? '✅ PASS' : '❌ FAIL'}`);
  
  return connectionTest && sensorDataTest;
}

