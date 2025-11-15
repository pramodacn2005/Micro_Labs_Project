// Test script to check missed dose detection
// Run this in browser console on the Medicine Reminder page

console.log('🧪 Testing Missed Dose Detection...');

// Test data
const testMedicine = {
  id: 'test123',
  medicineName: 'Test Medicine',
  dosage: '100mg',
  scheduledTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 minutes ago
  maxDelayMinutes: 30,
  userId: 'test-user',
  patientName: 'Test Patient'
};

console.log('Test medicine scheduled 35 minutes ago with 30 minute delay');
console.log('This should trigger a missed dose alert');

// Check if the medicine is overdue
const now = new Date();
const scheduledTime = new Date(testMedicine.scheduledTime);
const maxDelayTime = new Date(scheduledTime.getTime() + (testMedicine.maxDelayMinutes * 60000));

console.log('Current time:', now.toLocaleTimeString());
console.log('Scheduled time:', scheduledTime.toLocaleTimeString());
console.log('Max delay time:', maxDelayTime.toLocaleTimeString());
console.log('Is overdue?', now > maxDelayTime);
console.log('Delay minutes:', Math.floor((now - scheduledTime) / (1000 * 60)));















