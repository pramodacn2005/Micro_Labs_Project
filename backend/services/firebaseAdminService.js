// 

// backend/services/firebaseAdminService.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to get service account path from env or use default location
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                               path.join(process.cwd(), "config", "serviceAccountKey.json");
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`[Firebase Admin] Service account file not found at: ${serviceAccountPath}`);
      throw new Error(`Service account file not found. Please set GOOGLE_APPLICATION_CREDENTIALS in .env`);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    
    // Determine storage bucket name (project-id.appspot.com format)
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: serviceAccount.project_id,
      storageBucket: storageBucket
    });
    
    console.log(`[Firebase Admin] ✅ Initialized successfully for project: ${serviceAccount.project_id}`);
    console.log(`[Firebase Admin] ✅ Storage bucket: ${storageBucket}`);
    
    // Verify Firestore connection (async, but we'll handle it separately)
    const verifyConnection = async () => {
    try {
        const db = admin.firestore();
      const testRef = db.collection('_test_connection').doc('_test');
      await testRef.set({ test: true, timestamp: admin.firestore.FieldValue.serverTimestamp() });
      await testRef.delete();
      console.log('[Firebase Admin] ✅ Firestore connection verified');
    } catch (verifyError) {
      console.error('[Firebase Admin] ⚠️ Firestore connection test failed:', verifyError.message);
      if (verifyError.code === 16 || verifyError.message.includes('UNAUTHENTICATED')) {
        console.error('[Firebase Admin] ❌ Authentication failed. Please check:');
        console.error('  1. Service account credentials are valid');
        console.error('  2. Service account has Firestore permissions');
        console.error('  3. Service account is not disabled in Google Cloud Console');
        console.error('  4. GOOGLE_APPLICATION_CREDENTIALS path is correct');
      }
      // Don't throw here - let it fail on actual use for better error messages
    }
    };
    
    // Run verification in background (don't await to avoid blocking initialization)
    verifyConnection().catch(() => {});
  } catch (error) {
    console.error("[Firebase Admin] ❌ Initialization failed:", error.message);
    if (error.code === 16 || error.message.includes('UNAUTHENTICATED')) {
      console.error('[Firebase Admin] Authentication error. Please verify:');
      console.error('  1. Service account file exists and is valid JSON');
      console.error('  2. Service account has proper IAM roles in Google Cloud Console');
      console.error('  3. Service account is enabled');
      console.error('  4. Firestore API is enabled for the project');
    }
    throw error;
  }
} else {
  console.log("[Firebase Admin] ✅ Already initialized");
}

const db = admin.firestore();

// Export db and admin for use in other services
export { db, admin };

// Save a reading (includes numeric timestamp 'ts' for immediate ordering)
export async function saveReading(reading) {
  const wrapped = { ...reading, ts: Date.now(), createdAt: admin.firestore.FieldValue.serverTimestamp() };
  const docRef = await db.collection("readings").add(wrapped);
  return { id: docRef.id, ...wrapped };
}

// Get latest readings (limit, optional deviceId filter). Returns ordered oldest->newest.
export async function getLatestReadings(limit = 200, deviceId) {
  let q = db.collection("readings");
  if (deviceId) q = q.where("deviceId", "==", deviceId);
  const snap = await q.orderBy("ts", "desc").limit(limit).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
  return items;
}

// Save alert record
export async function saveAlertRecord(alert) {
  const wrapped = { ...alert, ts: Date.now(), createdAt: admin.firestore.FieldValue.serverTimestamp() };
  const docRef = await db.collection("alerts").add(wrapped);
  return { id: docRef.id, ...wrapped };
}

// Get latest alert for a specific metric (returns object or null)
export async function getLatestAlertForMetric(metric) {
  const snap = await db.collection("alerts")
    .where("metrics", "array-contains", metric)
    .orderBy("ts", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

// Get recent alerts (for UI)
export async function getRecentAlerts(limit = 50) {
  const snap = await db.collection("alerts").orderBy("ts", "desc").limit(limit).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ===== Per-device alert state (to track consecutive abnormal readings) =====

// Keyed as `${deviceId}_${metric}`
export async function getAlertState(deviceId, metric) {
  if (!deviceId) return null;
  const id = `${deviceId}_${metric}`;
  const ref = db.collection("alert_state").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id, ...snap.data() };
}

export async function setAlertState(deviceId, metric, state) {
  if (!deviceId) return null;
  const id = `${deviceId}_${metric}`;
  const ref = db.collection("alert_state").doc(id);
  const payload = { ...state, deviceId, metric, ts: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.set(payload, { merge: true });
  return { id, ...payload };
}

// Latest alert for a specific device+metric (for cooldown/dup prevention)
export async function getLatestAlertForDeviceMetric(deviceId, metric) {
  const snap = await db.collection("alerts")
    .where("deviceId", "==", deviceId)
    .where("metrics", "array-contains", metric)
    .orderBy("ts", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}
