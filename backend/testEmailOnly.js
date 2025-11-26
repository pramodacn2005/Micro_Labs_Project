// backend/testEmailOnly.js
// Simple test to verify email sending without database dependency

import { sendAbnormalVitalsEmail } from './services/emailAlertService.js';

async function testEmailOnly() {
  console.log('🧪 Testing Email Sending Only\n');
  
  const testPatientData = {
    patientName: 'Test Patient',
    patientId: 'TEST001',
    email: 'test@example.com'
  };
  
  const testAbnormalVitals = [
    {
      metric: 'heartRate',
      value: 120,
      status: 'warning',
      threshold: '60-100BPM (Critical: 50-120BPM)',
      consecutiveCount: 3
    },
    {
      metric: 'spo2',
      value: 86,
      status: 'critical',
      threshold: '95-100% (Critical: 90-100%)',
      consecutiveCount: 3
    },
    {
      metric: 'bodyTemp',
      value: 39,
      status: 'critical',
      threshold: '36.1-37.2°C (Critical: 35-38°C)',
      consecutiveCount: 3
    }
  ];
  
  const timestamp = Date.now();
  
  console.log('📧 Sending test email...');
  console.log('Patient:', testPatientData);
  console.log('Abnormal Vitals:', testAbnormalVitals);
  
  try {
    const result = await sendAbnormalVitalsEmail(testPatientData, testAbnormalVitals, timestamp);
    console.log('\n✅ Email Result:', result);
    
    if (result.success) {
      console.log('🎉 Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Status:', result.status);
    } else {
      console.log('❌ Email failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmailOnly().catch(console.error);

















