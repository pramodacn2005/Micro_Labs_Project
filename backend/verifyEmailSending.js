// backend/verifyEmailSending.js
// Comprehensive email verification script

import { sendAbnormalVitalsEmail } from './services/emailAlertService.js';

async function verifyEmailSending() {
  console.log('🔍 COMPREHENSIVE EMAIL VERIFICATION\n');
  
  // Test data
  const testPatientData = {
    patientName: 'John Doe',
    patientId: 'P001',
    email: 'john.doe@example.com'
  };
  
  const testAbnormalVitals = [
    {
      metric: 'heartRate',
      value: 125,
      status: 'critical',
      threshold: '60-100BPM (Critical: 50-120BPM)',
      consecutiveCount: 3
    },
    {
      metric: 'spo2',
      value: 85,
      status: 'critical',
      threshold: '95-100% (Critical: 90-100%)',
      consecutiveCount: 3
    }
  ];
  
  const timestamp = Date.now();
  
  console.log('📧 SENDING TEST EMAIL...');
  console.log('⏰ Timestamp:', new Date(timestamp).toLocaleString());
  console.log('👤 Patient:', testPatientData.patientName);
  console.log('📊 Abnormal Vitals:', testAbnormalVitals.length);
  
  try {
    const result = await sendAbnormalVitalsEmail(testPatientData, testAbnormalVitals, timestamp);
    
    console.log('\n📋 EMAIL RESULT:');
    console.log('Success:', result.success ? '✅ YES' : '❌ NO');
    console.log('Message ID:', result.messageId);
    console.log('Status:', result.status);
    
    if (result.success) {
      console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
      console.log('📧 Check your inbox at: cnpramoda01@gmail.com');
      console.log('📧 Subject: "🚨 Abnormal Health Vitals Alert for John Doe"');
      console.log('📧 Message ID:', result.messageId);
      
      console.log('\n📝 WHAT TO LOOK FOR IN YOUR EMAIL:');
      console.log('• Red alert banner with "ABNORMAL VITALS ALERT"');
      console.log('• Patient information (Name, ID, Email)');
      console.log('• Table showing abnormal vitals with values and thresholds');
      console.log('• Action required message');
      console.log('• Professional HTML formatting');
      
    } else {
      console.log('\n❌ EMAIL FAILED:');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR SENDING EMAIL:');
    console.error(error.message);
  }
  
  console.log('\n🔍 VERIFICATION STEPS:');
  console.log('1. Check your Gmail inbox: cnpramoda01@gmail.com');
  console.log('2. Look for subject: "🚨 Abnormal Health Vitals Alert for John Doe"');
  console.log('3. Check spam folder if not in inbox');
  console.log('4. Verify the email contains patient details and vital table');
  
  console.log('\n📊 EMAIL CONFIGURATION:');
  console.log('From:', process.env.GMAIL_USER);
  console.log('To:', process.env.DOCTOR_EMAIL);
  console.log('Service: Gmail SMTP');
}

verifyEmailSending().catch(console.error);

















