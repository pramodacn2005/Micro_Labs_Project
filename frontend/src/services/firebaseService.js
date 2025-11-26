import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, query, limitToLast } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { getFirestore as getFirestoreDB, doc, setDoc, getDoc } from "firebase/firestore";

// Get storage bucket name and fix if it's in wrong format
let storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
if (storageBucket && storageBucket.includes('firebasestorage.app')) {
  // Convert from firebasestorage.app format to appspot.com format
  const projectId = storageBucket.split('.firebasestorage.app')[0];
  storageBucket = `${projectId}.appspot.com`;
  console.warn('⚠️ Fixed storage bucket name from firebasestorage.app to appspot.com format');
  console.warn(`   Old: ${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}`);
  console.warn(`   New: ${storageBucket}`);
  console.warn('💡 Update your .env file: VITE_FIREBASE_STORAGE_BUCKET=' + storageBucket);
} else if (!storageBucket && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  // Default to appspot.com format if not set
  storageBucket = `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`;
  console.warn('⚠️ Storage bucket not set, using default:', storageBucket);
  console.warn('💡 Add to your .env file: VITE_FIREBASE_STORAGE_BUCKET=' + storageBucket);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug Firebase configuration
console.log('Firebase Config Check:', {
  apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
  authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
  projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
  appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing'
});

// Check for missing required fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Missing Firebase configuration fields:', missingFields);
  console.error('Please check your .env.local file and ensure all Firebase config values are set.');
}

let appInstance;
let dbInstance;
let storageInstance;
let authInstance;
let firestoreInstance;

export function getFirebaseDb() {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!dbInstance) {
    dbInstance = getDatabase(appInstance);
  }
  return dbInstance;
}

export function getFirebaseStorage() {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!storageInstance) {
    storageInstance = getStorage(appInstance);
  }
  return storageInstance;
}

export function getFirebaseAuth() {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }
  return authInstance;
}

export function getFirestore() {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!firestoreInstance) {
    firestoreInstance = getFirestoreDB(appInstance);
  }
  return firestoreInstance;
}

export function subscribeToSensorData(callback, options = { last: 200 }) {
  try {
    const db = getFirebaseDb();
    
    if (!db) {
      console.error("❌ Firebase database not initialized");
      throw new Error("Firebase database not initialized");
    }
    
    // Always use global sensor_data path for vitals readings
    const dataPath = "sensor_data";
    console.log(`🌡️ Subscribing to global vitals data from: ${dataPath}`);
    console.log(`📊 Fetching last ${options.last ?? 200} readings`);
    
    const sensorRef = query(ref(db, dataPath), limitToLast(options.last ?? 200));
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val() || {};
      const readings = Object.entries(val).map(([key, value]) => ({ id: key, ...value }));
      readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
      console.log(`✅ Firebase vitals data received: ${readings.length} readings from ${dataPath}`);
      console.log(`📈 Sample reading:`, readings[0] || 'No data');
      callback(readings);
    }, (error) => {
      console.error("❌ Firebase subscription error:", error);
      console.error("🔍 Error details:", {
        path: dataPath,
        errorCode: error.code,
        errorMessage: error.message
      });
      // If Firebase fails, we'll fall back to backend polling
    });
    return unsubscribe;
  } catch (error) {
    console.error("❌ Failed to create Firebase subscription:", error);
    throw error;
  }
}

// Helper function to get appropriate limit for timeframe
export function getLimitForTimeframe(timeframe) {
  switch (timeframe) {
    case "1m": return 100;   // 1 minute - very recent data
    case "15m": return 1000;
    case "1h": return 1200;
    case "4h": return 1500;
    case "24h": return 2000;
    case "7d": return 5000;
    default: return 500;
  }
}

export const DEFAULT_THRESHOLDS = {
  heartRate: { min: 60, max: 100, unit: "bpm" },
  spo2: { min: 95, max: 100, unit: "%" },
  bodyTemp: { min: 36.1, max: 37.2, unit: "°C" },
  ambientTemp: { min: -10, max: 50, unit: "°C" },
  accMagnitude: { min: 0, max: 3, unit: "g" },
  bloodSugar: { min: 70, max: 100, unit: "mg/dL" }, // Fasting glucose normal range
  bloodPressureSystolic: { min: 90, max: 120, unit: "mmHg" },
  bloodPressureDiastolic: { min: 60, max: 80, unit: "mmHg" }
};

export function convertAgeToYears(rawAge) {
  if (rawAge === null || rawAge === undefined) return null;
  if (typeof rawAge === "number" && Number.isFinite(rawAge)) return rawAge;
  if (typeof rawAge === "string") {
    const trimmed = rawAge.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const monthsMatch = lower.match(/(\d+(\.\d+)?)\s*(month|months|mo)\b/);
    if (monthsMatch) {
      return Number(monthsMatch[1]) / 12;
    }
    const yearsMatch = lower.match(/(\d+(\.\d+)?)/);
    if (yearsMatch) {
      return Number(yearsMatch[1]);
    }
  }
  return null;
}

export const AGE_GROUP_THRESHOLDS = [
  {
    label: "Infant (0-1 yr)",
    minAge: 0,
    maxAge: 1,
    thresholds: {
      heartRate: { min: 100, max: 160, unit: "bpm" },
      spo2: { min: 94, max: 100, unit: "%" },
      bodyTemp: { min: 36.5, max: 37.5, unit: "°C" },
      bloodSugar: { min: 70, max: 150, unit: "mg/dL" },
      bloodPressureSystolic: { min: 70, max: 100, unit: "mmHg" },
      bloodPressureDiastolic: { min: 50, max: 65, unit: "mmHg" }
    }
  },
  {
    label: "Toddler (1-5 yrs)",
    minAge: 1,
    maxAge: 6,
    thresholds: {
      heartRate: { min: 80, max: 130, unit: "bpm" },
      spo2: { min: 95, max: 100, unit: "%" },
      bodyTemp: { min: 36.4, max: 37.4, unit: "°C" },
      bloodSugar: { min: 70, max: 140, unit: "mg/dL" },
      bloodPressureSystolic: { min: 80, max: 110, unit: "mmHg" },
      bloodPressureDiastolic: { min: 55, max: 75, unit: "mmHg" }
    }
  },
  {
    label: "Child (6-12 yrs)",
    minAge: 6,
    maxAge: 13,
    thresholds: {
      heartRate: { min: 70, max: 110, unit: "bpm" },
      spo2: { min: 95, max: 100, unit: "%" },
      bodyTemp: { min: 36.3, max: 37.3, unit: "°C" },
      bloodSugar: { min: 70, max: 130, unit: "mg/dL" },
      bloodPressureSystolic: { min: 90, max: 115, unit: "mmHg" },
      bloodPressureDiastolic: { min: 60, max: 75, unit: "mmHg" }
    }
  },
  {
    label: "Teen (13-17 yrs)",
    minAge: 13,
    maxAge: 18,
    thresholds: {
      heartRate: { min: 60, max: 105, unit: "bpm" },
      spo2: { min: 95, max: 100, unit: "%" },
      bodyTemp: { min: 36.1, max: 37.3, unit: "°C" },
      bloodSugar: { min: 70, max: 120, unit: "mg/dL" },
      bloodPressureSystolic: { min: 100, max: 125, unit: "mmHg" },
      bloodPressureDiastolic: { min: 65, max: 80, unit: "mmHg" }
    }
  },
  {
    label: "Adult (18-64 yrs)",
    minAge: 18,
    maxAge: 65,
    thresholds: {
      ...DEFAULT_THRESHOLDS
    }
  },
  {
    label: "Senior (65+ yrs)",
    minAge: 65,
    maxAge: null,
    thresholds: {
      heartRate: { min: 55, max: 95, unit: "bpm" },
      spo2: { min: 94, max: 100, unit: "%" },
      bodyTemp: { min: 36.0, max: 37.2, unit: "°C" },
      bloodSugar: { min: 75, max: 130, unit: "mg/dL" },
      bloodPressureSystolic: { min: 110, max: 140, unit: "mmHg" },
      bloodPressureDiastolic: { min: 70, max: 90, unit: "mmHg" }
    }
  }
];

const findAgeGroup = (age) => {
  if (!Number.isFinite(age) || age < 0) return null;
  return AGE_GROUP_THRESHOLDS.find(group => {
    const withinLowerBound = age >= group.minAge;
    const withinUpperBound = group.maxAge === null ? true : age < group.maxAge;
    return withinLowerBound && withinUpperBound;
  }) || null;
};

export function getAgeGroupInfo(age) {
  return findAgeGroup(age);
}

export function getAgeAdjustedThresholds(age) {
  const group = findAgeGroup(age);
  if (!group) {
    return { ...DEFAULT_THRESHOLDS };
  }
  return {
    ...DEFAULT_THRESHOLDS,
    ...group.thresholds
  };
}

// Emergency Alert Thresholds - More strict for emergency alerts
export const EMERGENCY_THRESHOLDS = {
  heartRate: { min: 50, max: 120, unit: "bpm" },
  spo2: { min: 90, max: 100, unit: "%" },
  bodyTemp: { min: 35, max: 38, unit: "°C" },
  bloodSugar: { min: 70, max: 250, unit: "mg/dL" }, // Critical: <70 (hypoglycemia) or >250 (severe hyperglycemia)
  bloodPressureSystolic: { min: 90, max: 140, unit: "mmHg" }, // Critical: <90 (hypotension) or >140 (hypertension)
  bloodPressureDiastolic: { min: 60, max: 90, unit: "mmHg" }, // Critical: <60 (hypotension) or >90 (hypertension)
  fallDetected: { critical: true, unit: "boolean" }
};

// Caregiver contact information
export const CAREGIVER_CONTACT = {
  phone: "+917019220796",
  name: "Primary Caregiver"
};

export function evaluateStatus(value, { min, max }) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "unknown";
  if (min !== undefined && value < min) return value < min * 0.9 ? "critical" : "warning";
  if (max !== undefined && value > max) return value > max * 1.1 ? "critical" : "warning";
  return "normal";
}

// Emergency alert checking functions
export function checkEmergencyThresholds(reading, ageYears = null) {
  const alerts = [];
  const adjusted = getAgeAdjustedThresholds(ageYears);
  const getRange = (key) => {
    const base = adjusted?.[key] || DEFAULT_THRESHOLDS[key];
    if (!base) return null;
    const adultBase = DEFAULT_THRESHOLDS[key];
    const emergency = EMERGENCY_THRESHOLDS[key];
    const marginPercent = 0.15;
    
    const computeMin = () => {
      if (base.min === undefined) return undefined;
      if (adultBase?.min !== undefined && emergency?.min !== undefined) {
        const margin = adultBase.min - emergency.min;
        return Math.max(0, Number((base.min - margin).toFixed(1)));
      }
      return Math.max(0, Number((base.min * (1 - marginPercent)).toFixed(1)));
    };
    
    const computeMax = () => {
      if (base.max === undefined) return undefined;
      if (adultBase?.max !== undefined && emergency?.max !== undefined) {
        const margin = emergency.max - adultBase.max;
        return Number((base.max + margin).toFixed(1));
      }
      return Number((base.max * (1 + marginPercent)).toFixed(1));
    };
    
    return {
      min: computeMin(),
      max: computeMax(),
      unit: base.unit || emergency?.unit || ""
    };
  };
  
  const pushAlert = (parameter, value, threshold, unit = "", severity = "critical") => {
    alerts.push({
      parameter,
      value,
      threshold,
      unit,
      severity
    });
  };
  
  const evaluateRange = (value, key, label) => {
    const range = getRange(key);
    if (!range || value === null || value === undefined) return;
    if (range.min !== undefined && value < range.min) {
      pushAlert(label, value, `<${range.min}`, range.unit);
    } else if (range.max !== undefined && value > range.max) {
      pushAlert(label, value, `>${range.max}`, range.unit);
    }
  };
  
  evaluateRange(reading.heartRate, "heartRate", "Heart Rate");
  evaluateRange(reading.spo2, "spo2", "SpO2");
  evaluateRange(reading.bodyTemp, "bodyTemp", "Body Temperature");
  evaluateRange(reading.bloodSugar, "bloodSugar", "Blood Sugar");
  evaluateRange(reading.ambientTemp, "ambientTemp", "Ambient Temperature");
  evaluateRange(reading.accMagnitude, "accMagnitude", "Acceleration");
  evaluateRange(reading.bloodPressureSystolic, "bloodPressureSystolic", "Blood Pressure (Systolic)");
  evaluateRange(reading.bloodPressureDiastolic, "bloodPressureDiastolic", "Blood Pressure (Diastolic)");
  
  // Fall Detected: true
  if (reading.fallDetected === true) {
    pushAlert("Fall Detection", "Detected", "true", "", "critical");
  }
  
  return alerts;
}

// Generate emergency SMS message
export function generateEmergencySMS(alert, patientName = "Patient") {
  const timestamp = new Date(alert.timestamp || Date.now()).toLocaleString();
  return `🚨 Emergency Alert
Patient: ${patientName}
Issue: ${alert.parameter} crossed threshold (value: ${alert.value}${alert.unit})
Time: ${timestamp}`;
}

// Authentication functions
export async function signup(email, password, fullName, phone = null, role = 'patient') {
  try {
    const auth = getFirebaseAuth();
    const firestore = getFirestore();
    
    console.log('Attempting to create user with email:', email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('User created successfully:', user.uid);
    
    // Save user metadata to Firestore
    const userData = {
      fullName,
      email,
      phone,
      role: role || 'patient', // Default to patient if not provided
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    console.log('Saving user data to Firestore:', userData);
    await setDoc(doc(firestore, 'users', user.uid), userData);
    console.log('User data saved to Firestore successfully');
    
    // Send email verification
    await sendEmailVerification(user);
    console.log('Email verification sent');
    
    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email address is already registered. Please try logging in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters long.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password authentication is not enabled. Please contact support.';
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function login(email, password) {
  const auth = getFirebaseAuth();
  const firestore = getFirestore();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login time
    await setDoc(doc(firestore, 'users', user.uid), {
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logout() {
  const auth = getFirebaseAuth();
  
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendPasswordReset(email) {
  const auth = getFirebaseAuth();
  
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUserData(uid) {
  const firestore = getFirestore();
  
  try {
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User data not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}



