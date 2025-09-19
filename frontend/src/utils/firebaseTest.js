// frontend/src/utils/firebaseTest.js
import { getFirebaseDb } from '../services/firebaseService.js';
import { ref, onValue, off } from 'firebase/database';

export function testFirebaseConnection() {
  console.log('🧪 Testing Firebase Realtime Database Connection...');
  
  let db;
  try {
    db = getFirebaseDb();
    if (!db) {
      console.error('❌ Firebase database not initialized');
      return;
    }
    
    console.log('✅ Firebase database initialized');
  } catch (error) {
    console.error('❌ Firebase database initialization failed:', error);
    return;
  }
  
  // Test reading from sensor_data
  const sensorRef = ref(db, 'sensor_data');
  
  console.log('🔍 Attempting to read from sensor_data...');
  
  const unsubscribe = onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
      const readings = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
      console.log('✅ Firebase connection successful!');
      console.log(`📊 Found ${readings.length} readings in sensor_data`);
      console.log('📈 Sample data:', readings[0] || 'No data');
      
      // Show latest readings
      if (readings.length > 0) {
        console.log('🕐 Latest readings:');
        readings.slice(0, 3).forEach((reading, index) => {
          const date = new Date(reading.timestamp);
          console.log(`${index + 1}. ${date.toLocaleString()}: HR=${reading.heartRate}, SpO2=${reading.spo2}, Temp=${reading.bodyTemp}`);
        });
      }
    } else {
      console.log('⚠️ No data found in sensor_data path');
      console.log('💡 Make sure you have data in Firebase Realtime Database at /sensor_data');
    }
    
    // Unsubscribe after test
    unsubscribe();
  }, (error) => {
    console.error('❌ Firebase connection failed:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Common error solutions
    if (error.code === 'PERMISSION_DENIED') {
      console.log('💡 Solution: Deploy security rules to allow public read access');
    } else if (error.code === 'UNAVAILABLE') {
      console.log('💡 Solution: Check your internet connection and Firebase project status');
    } else if (error.code === 'INVALID_ARGUMENT') {
      console.log('💡 Solution: Check your Firebase configuration and database URL');
    }
  });
}

export function testFirebaseConfig() {
  console.log('🔧 Testing Firebase Configuration...');
  
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  
  const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingFields);
    console.log('💡 Please check your .env.local file');
    return false;
  }
  
  console.log('✅ All Firebase configuration fields present');
  console.log('🔗 Database URL:', config.databaseURL);
  console.log('🆔 Project ID:', config.projectId);
  
  return true;
}

// Run tests when imported
export function runAllTests() {
  console.log('🚀 Running Firebase Tests...');
  console.log('================================');
  
  if (testFirebaseConfig()) {
    testFirebaseConnection();
  }
  
  console.log('================================');
  console.log('🏁 Tests completed');
}
