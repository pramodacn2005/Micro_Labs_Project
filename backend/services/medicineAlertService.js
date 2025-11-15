import { sendSMS } from './alertService.js';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account key
    const serviceAccount = require('../config/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    console.log('⚠️ Service account not found, using default credentials');
    // Use default credentials (for production)
    admin.initializeApp();
  }
}

const db = admin.firestore();

/**
 * Send emergency alert for missed medicine dose
 * @param {Object} medicineData - Medicine information
 * @param {string} scheduledTime - When the medicine was scheduled
 * @param {number} delayMinutes - How many minutes overdue
 */
export async function sendMissedDoseAlert(medicineData, scheduledTime, delayMinutes) {
  try {
    const patientName = medicineData.patientName || 'Patient';
    const medicineName = medicineData.medicineName;
    const dosage = medicineData.dosage;
    
    // Format the scheduled time
    const scheduledDate = new Date(scheduledTime);
    const timeString = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Create the emergency message
    const emergencyMessage = `🚨 MISSED DOSE ALERT 🚨

Patient: ${patientName}
Medicine: ${medicineName} ${dosage}
Scheduled Time: ${timeString}
Overdue by: ${delayMinutes} minutes
Current Time: ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}

Please check on the patient immediately!
This is an automated alert from the HealthMonitor system.`;

    console.log('🚨 Sending missed dose alert:', {
      patient: patientName,
      medicine: medicineName,
      delay: delayMinutes
    });

    // Send SMS alert
    const smsResult = await sendSMS(emergencyMessage);
    
    // Log the alert to Firestore
    await logMissedDoseAlert(medicineData, scheduledTime, delayMinutes, smsResult);
    
    return {
      success: true,
      smsResult,
      message: 'Emergency alert sent successfully'
    };
    
  } catch (error) {
    console.error('❌ Failed to send missed dose alert:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send reminder notification (for future implementation)
 * @param {Object} medicineData - Medicine information
 */
export async function sendMedicineReminder(medicineData) {
  try {
    const patientName = medicineData.patientName || 'Patient';
    const medicineName = medicineData.medicineName;
    const dosage = medicineData.dosage;
    const scheduledTime = new Date(medicineData.scheduledTime);
    
    const timeString = scheduledTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const reminderMessage = `💊 Medicine Reminder

Patient: ${patientName}
Medicine: ${medicineName} ${dosage}
Scheduled: ${timeString}
Instructions: ${medicineData.foodTiming} food

Please remind the patient to take their medicine.
This is an automated reminder from HealthMonitor.`;

    console.log('💊 Sending medicine reminder:', {
      patient: patientName,
      medicine: medicineName,
      time: timeString
    });

    // For now, just log the reminder (you can enable SMS later)
    console.log('📱 [REMINDER] Would send SMS:', reminderMessage);
    
    return {
      success: true,
      message: 'Reminder logged successfully'
    };
    
  } catch (error) {
    console.error('❌ Failed to send medicine reminder:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log missed dose alert to Firestore
 * @param {Object} medicineData - Medicine information
 * @param {string} scheduledTime - When the medicine was scheduled
 * @param {number} delayMinutes - How many minutes overdue
 * @param {Object} smsResult - SMS sending result
 */
async function logMissedDoseAlert(medicineData, scheduledTime, delayMinutes, smsResult) {
  try {
    const alertData = {
      medicineId: medicineData.id,
      medicineName: medicineData.medicineName,
      dosage: medicineData.dosage,
      scheduledTime: scheduledTime,
      delayMinutes: delayMinutes,
      userId: medicineData.userId,
      patientName: medicineData.patientName || 'Patient',
      alertType: 'missed_dose',
      severity: 'high',
      smsSent: smsResult.status !== 'failed',
      smsSid: smsResult.sid,
      smsStatus: smsResult.status,
      createdAt: new Date().toISOString(),
      isResolved: false
    };

    await db.collection('missedDoseAlerts').add(alertData);
    console.log('✅ Missed dose alert logged to Firestore');
    
  } catch (error) {
    console.error('❌ Failed to log missed dose alert:', error);
  }
}

/**
 * Send daily medicine summary to caregiver
 * @param {string} userId - User ID
 * @param {Array} todaysMedicines - Today's medicines
 * @param {Array} medicineLogs - Today's medicine logs
 */
export async function sendDailySummary(userId, todaysMedicines, medicineLogs) {
  try {
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const patientName = userData?.fullName || 'Patient';
    
    // Count statistics
    const totalMedicines = todaysMedicines.length;
    const takenMedicines = medicineLogs.length;
    const missedMedicines = totalMedicines - takenMedicines;
    
    // Calculate on-time rate
    const onTimeCount = medicineLogs.filter(log => log.isOnTime).length;
    const onTimeRate = takenMedicines > 0 ? Math.round((onTimeCount / takenMedicines) * 100) : 0;
    
    const summaryMessage = `📊 Daily Medicine Summary

Patient: ${patientName}
Date: ${new Date().toLocaleDateString()}

📈 Statistics:
• Total Medicines: ${totalMedicines}
• Taken: ${takenMedicines}
• Missed: ${missedMedicines}
• On-time Rate: ${onTimeRate}%

${missedMedicines > 0 ? '⚠️ Please check on missed medicines.' : '✅ All medicines taken successfully!'}

This is an automated daily summary from HealthMonitor.`;

    console.log('📊 Sending daily summary:', {
      patient: patientName,
      total: totalMedicines,
      taken: takenMedicines,
      missed: missedMedicines
    });

    // For now, just log the summary (you can enable SMS later)
    console.log('📱 [SUMMARY] Would send SMS:', summaryMessage);
    
    return {
      success: true,
      message: 'Daily summary logged successfully'
    };
    
  } catch (error) {
    console.error('❌ Failed to send daily summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
