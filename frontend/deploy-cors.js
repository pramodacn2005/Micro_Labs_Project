#!/usr/bin/env node

/**
 * Script to deploy CORS configuration to Firebase Storage
 * Run this script to fix CORS issues with Firebase Storage
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Deploying CORS configuration to Firebase Storage...');

try {
  // Check if Firebase CLI is installed
  try {
    execSync('firebase --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it first:');
    console.error('npm install -g firebase-tools');
    process.exit(1);
  }

  // Check if user is logged in
  try {
    execSync('firebase projects:list', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Not logged in to Firebase. Please run:');
    console.error('firebase login');
    process.exit(1);
  }

  // Deploy CORS configuration
  console.log('📤 Deploying CORS configuration...');
  execSync('gsutil cors set cors.json gs://ai-healthcare-robot.firebasestorage.app', { stdio: 'inherit' });
  
  console.log('✅ CORS configuration deployed successfully!');
  console.log('🔄 Please refresh your browser and try uploading files again.');
  
} catch (error) {
  console.error('❌ Failed to deploy CORS configuration:', error.message);
  console.log('\n💡 Manual steps to fix CORS:');
  console.log('1. Go to Google Cloud Console');
  console.log('2. Navigate to Cloud Storage > Buckets');
  console.log('3. Select your Firebase Storage bucket');
  console.log('4. Go to Permissions tab');
  console.log('5. Add CORS configuration with the following JSON:');
  console.log(JSON.stringify([
    {
      "origin": ["http://localhost:3000", "http://localhost:5173", "https://your-domain.com"],
      "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "maxAgeSeconds": 3600,
      "responseHeader": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  ], null, 2));
}
