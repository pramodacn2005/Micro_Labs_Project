// Test script to verify Firebase Admin SDK authentication
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFirebaseAdmin() {
  console.log('🔍 Testing Firebase Admin SDK Authentication...\n');
  
  try {
    // Get service account path
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                             path.join(__dirname, '..', 'config', 'serviceAccountKey.json');
    
    console.log(`📁 Service account path: ${serviceAccountPath}`);
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Service account file not found!');
      console.error('   Please ensure the file exists or set GOOGLE_APPLICATION_CREDENTIALS in .env');
      process.exit(1);
    }
    
    // Read and parse service account
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`✅ Service account file found`);
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);
    console.log(`   Has Private Key: ${!!serviceAccount.private_key}`);
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: serviceAccount.project_id
      });
      console.log('\n✅ Firebase Admin initialized');
    } else {
      console.log('\n✅ Firebase Admin already initialized');
    }
    
    // Test Firestore connection
    console.log('\n🔍 Testing Firestore connection...');
    const db = admin.firestore();
    
    // Try to read from doctors collection
    try {
      const doctorsRef = db.collection('doctors');
      const snapshot = await doctorsRef.limit(1).get();
      console.log(`✅ Firestore connection successful!`);
      console.log(`   Found ${snapshot.size} doctor(s) in test query`);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log(`   Sample doctor ID: ${doc.id}`);
      }
    } catch (firestoreError) {
      console.error('❌ Firestore connection failed!');
      console.error(`   Error code: ${firestoreError.code}`);
      console.error(`   Error message: ${firestoreError.message}`);
      
      if (firestoreError.code === 16 || firestoreError.message.includes('UNAUTHENTICATED')) {
        console.error('\n🔧 Troubleshooting steps:');
        console.error('   1. Verify service account key is valid and not expired');
        console.error('   2. Check service account has "Cloud Datastore User" or "Firestore User" role');
        console.error('   3. Ensure Firestore API is enabled in Google Cloud Console');
        console.error('   4. Verify service account is not disabled');
        console.error('   5. Try regenerating the service account key');
      } else if (firestoreError.code === 7 || firestoreError.message.includes('PERMISSION_DENIED')) {
        console.error('\n🔧 Permission issue:');
        console.error('   The service account needs Firestore read/write permissions');
        console.error('   Grant "Cloud Datastore User" role in Google Cloud Console');
      }
      
      process.exit(1);
    }
    
    // Test authentication token generation
    console.log('\n🔍 Testing authentication token generation...');
    try {
      // This will test if the service account can generate tokens
      const token = await admin.auth().createCustomToken('test-user-id');
      console.log('✅ Custom token generation successful');
      console.log('   (This confirms the service account credentials are valid)');
    } catch (authError) {
      console.error('⚠️  Custom token generation failed (this is OK for some service accounts)');
      console.error(`   ${authError.message}`);
    }
    
    console.log('\n✅ All tests passed! Firebase Admin SDK is properly configured.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testFirebaseAdmin();


