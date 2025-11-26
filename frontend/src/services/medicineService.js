import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getFirestore } from './firebaseService';

const MEDICINES_COLLECTION = 'medicines';
const MEDICINE_LOGS_COLLECTION = 'medicineLogs';
const MISSED_DOSE_ALERTS_COLLECTION = 'missedDoseAlerts';

// Medicine Management Functions
export const addMedicine = async (medicineData) => {
  try {
    const db = getFirestore();
    const docRef = await addDoc(collection(db, MEDICINES_COLLECTION), {
      ...medicineData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    });
    return { id: docRef.id, ...medicineData };
  } catch (error) {
    console.error('Error adding medicine:', error);
    throw error;
  }
};

export const updateMedicine = async (medicineId, updateData) => {
  try {
    const db = getFirestore();
    const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
    await updateDoc(medicineRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { id: medicineId, ...updateData };
  } catch (error) {
    console.error('Error updating medicine:', error);
    throw error;
  }
};

export const deleteMedicine = async (medicineId) => {
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, MEDICINES_COLLECTION, medicineId));
    return { id: medicineId };
  } catch (error) {
    console.error('Error deleting medicine:', error);
    throw error;
  }
};

export const getMedicines = async (userId) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, MEDICINES_COLLECTION),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting medicines:', error);
    throw error;
  }
};

export const subscribeToMedicines = (userId, callback) => {
  const db = getFirestore();
  const q = query(
    collection(db, MEDICINES_COLLECTION),
    where('userId', '==', userId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const medicines = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(medicines);
  });
};

// Medicine Logging Functions
export const logMedicineTaken = async (medicineId, medicineData, takenAt = null) => {
  try {
    const db = getFirestore();
    const logData = {
      medicineId,
      medicineName: medicineData.medicineName,
      dosage: medicineData.dosage,
      scheduledTime: medicineData.scheduledTime,
      takenAt: takenAt || serverTimestamp(),
      isOnTime: true, // Will be calculated based on delay
      delayMinutes: 0, // Will be calculated
      userId: medicineData.userId,
      confirmationMethod: 'button', // 'button' or 'voice'
      createdAt: serverTimestamp()
    };

    // Calculate if taken on time
    const scheduledTime = new Date(medicineData.scheduledTime);
    const actualTime = takenAt ? new Date(takenAt) : new Date();
    const delayMs = actualTime - scheduledTime;
    const delayMinutes = Math.floor(delayMs / (1000 * 60));
    
    logData.delayMinutes = delayMinutes;
    logData.isOnTime = delayMinutes <= medicineData.maxDelayMinutes;

    const docRef = await addDoc(collection(db, MEDICINE_LOGS_COLLECTION), logData);
    return { id: docRef.id, ...logData };
  } catch (error) {
    console.error('Error logging medicine taken:', error);
    throw error;
  }
};

export const getMedicineLogs = async (userId, date = null) => {
  try {
    const db = getFirestore();
    let q = query(
      collection(db, MEDICINE_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('takenAt', 'desc')
    );

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      q = query(
        collection(db, MEDICINE_LOGS_COLLECTION),
        where('userId', '==', userId),
        where('takenAt', '>=', Timestamp.fromDate(startOfDay)),
        where('takenAt', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('takenAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting medicine logs:', error);
    throw error;
  }
};

// Missed Dose Alert Functions
export const createMissedDoseAlert = async (medicineData, scheduledTime, delayMinutes) => {
  try {
    console.log('🚨 Creating missed dose alert:', {
      medicine: medicineData.medicineName,
      scheduledTime,
      delayMinutes
    });
    
    const db = getFirestore();
    
    // First, send email alert via backend API
    try {
      const response = await fetch('http://localhost:4000/api/medicine-alerts/missed-dose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicineData,
          scheduledTime,
          delayMinutes
        })
      });
      
      const emailResult = await response.json();
      console.log('📧 Email Alert Result:', emailResult);
    } catch (emailError) {
      console.error('❌ Failed to send email alert:', emailError);
      // Continue with database logging even if email fails
    }
    
    // Then, log to Firestore
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
      isResolved: false,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, MISSED_DOSE_ALERTS_COLLECTION), alertData);
    return { id: docRef.id, ...alertData };
  } catch (error) {
    console.error('Error creating missed dose alert:', error);
    throw error;
  }
};

export const getMissedDoseAlerts = async (userId) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, MISSED_DOSE_ALERTS_COLLECTION),
      where('userId', '==', userId),
      where('isResolved', '==', false),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting missed dose alerts:', error);
    throw error;
  }
};

export const resolveMissedDoseAlert = async (alertId) => {
  try {
    const db = getFirestore();
    const alertRef = doc(db, MISSED_DOSE_ALERTS_COLLECTION, alertId);
    await updateDoc(alertRef, {
      isResolved: true,
      resolvedAt: serverTimestamp()
    });
    return { id: alertId };
  } catch (error) {
    console.error('Error resolving missed dose alert:', error);
    throw error;
  }
};

// Utility Functions
export const getTodaysMedicines = async (userId) => {
  try {
    const medicines = await getMedicines(userId);
    const today = new Date();
    const todayString = today.toDateString();
    
    return medicines.filter(medicine => {
      const medicineDate = new Date(medicine.scheduledTime);
      return medicineDate.toDateString() === todayString;
    });
  } catch (error) {
    console.error('Error getting today\'s medicines:', error);
    throw error;
  }
};

export const checkMissedDoses = async (userId) => {
  try {
    const medicines = await getMedicines(userId);
    const now = new Date();
    const missedDoses = [];

    for (const medicine of medicines) {
      const scheduledTime = new Date(medicine.scheduledTime);
      const maxDelayTime = new Date(scheduledTime.getTime() + (medicine.maxDelayMinutes * 60000));
      
      if (now > maxDelayTime) {
        // Check if medicine was taken
        const logs = await getMedicineLogs(userId);
        const wasTaken = logs.some(log => 
          log.medicineId === medicine.id && 
          new Date(log.takenAt.toDate()) >= scheduledTime
        );
        
        if (!wasTaken) {
          const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
          missedDoses.push({
            ...medicine,
            delayMinutes,
            scheduledTime: scheduledTime.toISOString()
          });
        }
      }
    }

    return missedDoses;
  } catch (error) {
    console.error('Error checking missed doses:', error);
    throw error;
  }
};
