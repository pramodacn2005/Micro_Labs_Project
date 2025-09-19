// 

// backend/services/firebaseAdminService.js
import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  throw new Error("Please set GOOGLE_APPLICATION_CREDENTIALS in .env (path to service account JSON)");
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();

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
