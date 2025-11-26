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

// Simplified Medicine Management Functions (no complex queries)
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

// Simplified getMedicines - only filter by userId, then sort in JavaScript
export const getMedicines = async (userId) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, MEDICINES_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const medicines = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter and sort in JavaScript
    return medicines
      .filter(medicine => medicine.isActive === true)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
  } catch (error) {
    console.error('Error getting medicines:', error);
    throw error;
  }
};

// Simplified subscribeToMedicines
export const subscribeToMedicines = (userId, callback) => {
  const db = getFirestore();
  const q = query(
    collection(db, MEDICINES_COLLECTION),
    where('userId', '==', userId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const medicines = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter and sort in JavaScript
    const filteredMedicines = medicines
      .filter(medicine => medicine.isActive === true)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
    
    callback(filteredMedicines);
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
      isOnTime: true,
      delayMinutes: 0,
      userId: medicineData.userId,
      confirmationMethod: 'button',
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

// Simplified getMedicineLogs - only filter by userId, then sort in JavaScript
export const getMedicineLogs = async (userId, date = null) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, MEDICINE_LOGS_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    let logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      logs = logs.filter(log => {
        const logDate = log.takenAt?.toDate?.() || new Date(log.takenAt || 0);
        return logDate >= startOfDay && logDate <= endOfDay;
      });
    }

    // Sort by takenAt in descending order
    return logs.sort((a, b) => {
      const aTime = a.takenAt?.toDate?.() || new Date(a.takenAt || 0);
      const bTime = b.takenAt?.toDate?.() || new Date(b.takenAt || 0);
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting medicine logs:', error);
    throw error;
  }
};

// Missed Dose Alert Functions
export const createMissedDoseAlert = async (medicineData, scheduledTime, delayMinutes) => {
  try {
    const db = getFirestore();
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

// Simplified getMissedDoseAlerts
export const getMissedDoseAlerts = async (userId) => {
  try {
    const db = getFirestore();
    const q = query(
      collection(db, MISSED_DOSE_ALERTS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const alerts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter and sort in JavaScript
    return alerts
      .filter(alert => alert.isResolved === false)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
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
          new Date(log.takenAt?.toDate?.() || log.takenAt) >= scheduledTime
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


















