// Script to add random ratings to all doctors
import { db } from '../services/firebaseAdminService.js';
import admin from 'firebase-admin';

const doctorsCollection = 'doctors';

/**
 * Generate a random rating between min and max
 * @param {number} min - Minimum rating (default: 3.5)
 * @param {number} max - Maximum rating (default: 5.0)
 * @returns {number} Random rating rounded to 1 decimal place
 */
function generateRandomRating(min = 3.5, max = 5.0) {
  const rating = Math.random() * (max - min) + min;
  return Math.round(rating * 10) / 10; // Round to 1 decimal place
}

/**
 * Add random ratings to all doctors
 */
async function addDoctorRatings() {
  try {
    console.log('🔍 Fetching all doctors...');
    
    // Get all active doctors
    const snapshot = await db.collection(doctorsCollection)
      .where('isActive', '==', true)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No active doctors found');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} doctor(s)`);
    console.log('\n📊 Adding random ratings...\n');
    
    const updates = [];
    
    snapshot.forEach((doc) => {
      const doctor = doc.data();
      const randomRating = generateRandomRating(3.5, 5.0);
      
      updates.push({
        doctorId: doc.id,
        doctorName: doctor.name,
        specialization: doctor.specialization || 'N/A',
        currentRating: doctor.rating || 0,
        newRating: randomRating
      });
    });
    
    // Wait for all updates to complete
    await Promise.all(
      updates.map(update => 
        db.collection(doctorsCollection).doc(update.doctorId).update({
          rating: update.newRating,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      )
    );
    
    // Display results
    console.log('✅ Successfully updated ratings:\n');
    updates.forEach((update, index) => {
      const stars = '⭐'.repeat(Math.floor(update.newRating));
      console.log(`${index + 1}. ${update.doctorName}`);
      console.log(`   Specialization: ${update.specialization}`);
      console.log(`   Rating: ${update.currentRating} → ${update.newRating} ${stars}`);
      console.log('');
    });
    
    console.log(`\n🎉 Updated ${updates.length} doctor(s) with random ratings!`);
    
  } catch (error) {
    console.error('❌ Error adding doctor ratings:', error);
    throw error;
  }
}

// Run the script
addDoctorRatings()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

