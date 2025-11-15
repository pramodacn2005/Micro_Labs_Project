// Script to remove specific appointments for patient "sanju"
import { db } from '../services/firebaseAdminService.js';
import admin from 'firebase-admin';

const appointmentsCollection = 'appointments';
const doctorsCollection = 'doctors';
const usersCollection = 'users';

/**
 * Find and remove appointments for patient "sanju" with specific doctors
 */
async function removeAppointments() {
  try {
    console.log('🔍 Finding patient "sanju"...');
    
    // Find patient "sanju" by name (case-insensitive)
    const usersSnapshot = await db.collection(usersCollection).get();
    let sanjuUserId = null;
    let sanjuName = null;
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const fullName = (userData.fullName || '').toLowerCase();
      if (fullName.includes('sanju')) {
        sanjuUserId = doc.id;
        sanjuName = userData.fullName;
        console.log(`✅ Found patient: ${sanjuName} (ID: ${sanjuUserId})`);
      }
    });
    
    if (!sanjuUserId) {
      console.log('❌ Patient "sanju" not found');
      return;
    }
    
    console.log('\n🔍 Fetching appointments for patient "sanju"...');
    
    // Get all appointments for this patient
    const appointmentsSnapshot = await db.collection(appointmentsCollection)
      .where('patient_id', '==', sanjuUserId)
      .get();
    
    if (appointmentsSnapshot.empty) {
      console.log('❌ No appointments found for patient "sanju"');
      return;
    }
    
    console.log(`✅ Found ${appointmentsSnapshot.size} appointment(s)`);
    console.log('\n🔍 Checking appointments for doctors to remove...\n');
    
    // Doctors to remove
    const doctorsToRemove = ['pramoda c n', 'pramoda cn', 'abhishek', 'doctor2'];
    
    const appointmentsToDelete = [];
    
    for (const doc of appointmentsSnapshot.docs) {
      const appointment = doc.data();
      const appointmentId = doc.id;
      
      // Get doctor info
      let doctorName = 'Unknown';
      try {
        const doctorDoc = await db.collection(doctorsCollection).doc(appointment.doctor_id).get();
        if (doctorDoc.exists) {
          doctorName = doctorDoc.data().name || 'Unknown';
        }
      } catch (error) {
        console.warn(`Could not fetch doctor for appointment ${appointmentId}:`, error.message);
      }
      
      // Check if doctor name matches any to remove
      const doctorNameLower = doctorName.toLowerCase();
      const shouldRemove = doctorsToRemove.some(name => 
        doctorNameLower.includes(name.toLowerCase())
      );
      
      if (shouldRemove) {
        appointmentsToDelete.push({
          appointmentId,
          doctorName,
          date: appointment.date || 'N/A',
          time_slot: appointment.time_slot || 'N/A',
          status: appointment.status || 'N/A'
        });
      }
    }
    
    if (appointmentsToDelete.length === 0) {
      console.log('✅ No appointments found matching the doctors to remove');
      console.log('   Looking for: pramoda C N, abhishek, Doctor2');
      return;
    }
    
    // Display appointments to be deleted
    console.log(`📋 Found ${appointmentsToDelete.length} appointment(s) to remove:\n`);
    appointmentsToDelete.forEach((apt, index) => {
      console.log(`${index + 1}. Appointment ID: ${apt.appointmentId}`);
      console.log(`   Doctor: ${apt.doctorName}`);
      console.log(`   Date: ${apt.date} | Time: ${apt.time_slot}`);
      console.log(`   Status: ${apt.status}`);
      console.log('');
    });
    
    // Delete the appointments
    console.log('🗑️  Deleting appointments...\n');
    
    const deletePromises = appointmentsToDelete.map(apt => 
      db.collection(appointmentsCollection).doc(apt.appointmentId).delete()
    );
    
    await Promise.all(deletePromises);
    
    console.log('✅ Successfully deleted appointments:\n');
    appointmentsToDelete.forEach((apt, index) => {
      console.log(`${index + 1}. ✅ Removed appointment with ${apt.doctorName}`);
    });
    
    console.log(`\n🎉 Removed ${appointmentsToDelete.length} appointment(s) for patient "${sanjuName}"!`);
    
  } catch (error) {
    console.error('❌ Error removing appointments:', error);
    throw error;
  }
}

// Run the script
removeAppointments()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

