#!/usr/bin/env node

/**
 * Test script to verify Firebase Database integration
 * This script tests the prescription storage functionality
 */

import { testDatabaseConnection } from './src/services/firebaseDatabaseService.js';

console.log('🧪 Testing Firebase Database Integration...\n');

async function runTests() {
  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    const connectionResult = await testDatabaseConnection();
    
    if (connectionResult.success) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed:', connectionResult.error);
      return;
    }
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Open your app at http://localhost:5174/');
    console.log('2. Go to History section');
    console.log('3. Try uploading a prescription');
    console.log('4. Check Firebase Console to see the data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your .env file has correct Firebase config');
    console.log('2. Ensure Firebase project is set up correctly');
    console.log('3. Check Firebase Console for database rules');
  }
}

runTests();


















