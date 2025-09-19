import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, query, limitToLast } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { getFirestore as getFirestoreDB, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
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
  accMagnitude: { min: 0, max: 3, unit: "g" }
};

export function evaluateStatus(value, { min, max }) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "unknown";
  if (min !== undefined && value < min) return value < min * 0.9 ? "critical" : "warning";
  if (max !== undefined && value > max) return value > max * 1.1 ? "critical" : "warning";
  return "normal";
}

// Authentication functions
export async function signup(email, password, fullName, phone = null) {
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



