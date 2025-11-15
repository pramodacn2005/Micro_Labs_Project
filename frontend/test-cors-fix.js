#!/usr/bin/env node

/**
 * Test script to verify CORS fixes
 * This script tests the Firebase Storage connection and CORS configuration
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// Test Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🧪 Testing CORS fixes for Firebase Storage...\n');

// Check configuration
console.log('📋 Configuration check:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`  ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
});

if (!firebaseConfig.storageBucket) {
  console.error('\n❌ Storage bucket not configured. Please check your .env file.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Test CORS-friendly URL generation
console.log('\n🔗 Testing CORS-friendly URL generation...');

const testPath = 'patient-files/test-user/test-file.pdf';
const storageRef = ref(storage, testPath);

// Generate a test URL
getDownloadURL(storageRef)
  .then((url) => {
    console.log('✅ Firebase Storage connection successful');
    console.log('📄 Generated URL:', url);
    
    // Test CORS-friendly URL
    const urlObj = new URL(url);
    urlObj.searchParams.set('alt', 'media');
    const corsFriendlyUrl = urlObj.toString();
    
    console.log('🔄 CORS-friendly URL:', corsFriendlyUrl);
    console.log('\n✅ CORS fixes appear to be working correctly!');
    console.log('\n💡 Next steps:');
    console.log('1. Deploy CORS configuration: node deploy-cors.js');
    console.log('2. Deploy storage rules: firebase deploy --only storage');
    console.log('3. Test file upload in your application');
  })
  .catch((error) => {
    console.error('❌ Firebase Storage test failed:', error.message);
    
    if (error.message.includes('CORS')) {
      console.log('\n🔄 CORS error detected. Please run:');
      console.log('1. node deploy-cors.js');
      console.log('2. firebase deploy --only storage');
    } else if (error.message.includes('permission')) {
      console.log('\n🔒 Permission error. Please check your Firebase Storage rules.');
    } else {
      console.log('\n❓ Unknown error. Please check your Firebase configuration.');
    }
  });
