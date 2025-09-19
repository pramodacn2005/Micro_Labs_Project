import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, query, limitToLast } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let appInstance;
let dbInstance;
let storageInstance;

export function getFirebaseDb() {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
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

export function subscribeToSensorData(callback, options = { last: 200 }) {
  const db = getFirebaseDb();
  const sensorRef = query(ref(db, "sensor_data"), limitToLast(options.last ?? 200));
  const unsubscribe = onValue(sensorRef, (snapshot) => {
    const val = snapshot.val() || {};
    const readings = Object.entries(val).map(([key, value]) => ({ id: key, ...value }));
    readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    callback(readings);
  }, (error) => {
    console.error("Firebase subscription error:", error);
    // If Firebase fails, we'll fall back to backend polling
  });
  return unsubscribe;
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


