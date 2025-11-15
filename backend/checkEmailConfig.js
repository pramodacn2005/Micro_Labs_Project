// backend/checkEmailConfig.js
// Check email configuration and test sending

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('🔍 Checking Email Configuration\n');

// Check environment variables
console.log('📧 Email Configuration:');
console.log('GMAIL_USER:', process.env.GMAIL_USER ? '✅ Set' : '❌ Not set');
console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? '✅ Set' : '❌ Not set');
console.log('DOCTOR_EMAIL:', process.env.DOCTOR_EMAIL || '❌ Not set');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
console.log('SMTP_USER:', process.env.SMTP_USER || 'Not set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Not set');

console.log('\n📋 Current Settings:');
console.log('From Email:', process.env.GMAIL_USER || process.env.SMTP_USER || 'Not configured');
console.log('To Email:', process.env.DOCTOR_EMAIL || 'doctor@example.com');

// Test email transporter
console.log('\n🧪 Testing Email Transporter...');

const createTransporter = () => {
  // Option 1: Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    console.log('Using Gmail SMTP...');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }
  
  // Option 2: Custom SMTP
  if (process.env.SMTP_HOST) {
    console.log('Using Custom SMTP...');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  console.log('❌ No email configuration found');
  return null;
};

const transporter = createTransporter();

if (transporter) {
  console.log('✅ Email transporter created successfully');
  
  // Test connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email connection failed:', error.message);
    } else {
      console.log('✅ Email connection successful!');
      console.log('📧 Ready to send emails');
    }
  });
} else {
  console.log('❌ Email transporter not available');
  console.log('\n🔧 To fix this, add to your .env file:');
  console.log('GMAIL_USER=your-email@gmail.com');
  console.log('GMAIL_PASS=your-app-password');
  console.log('DOCTOR_EMAIL=doctor@hospital.com');
}
