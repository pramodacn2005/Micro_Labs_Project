// frontend/deploy-firebase-rules.js
// Script to deploy Firebase Realtime Database rules

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Deploying Firebase Realtime Database Rules...');

try {
  // Check if firebase CLI is installed
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI found');
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it first:');
    console.log('npm install -g firebase-tools');
    process.exit(1);
  }

  // Check if firebase.json exists
  const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');
  if (!fs.existsSync(firebaseConfigPath)) {
    console.error('❌ firebase.json not found in current directory');
    console.log('💡 Make sure you are in the frontend directory');
    process.exit(1);
  }

  // Deploy the rules
  console.log('📝 Deploying rules from realtime-database.rules.json...');
  execSync('firebase deploy --only database', { stdio: 'inherit' });
  
  console.log('✅ Firebase rules deployed successfully!');
  console.log('🔧 The test_connection path now allows read/write access');
  
} catch (error) {
  console.error('❌ Failed to deploy Firebase rules:', error.message);
  console.log('💡 Make sure you are logged in to Firebase CLI:');
  console.log('firebase login');
  process.exit(1);
}










