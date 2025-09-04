import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return admin;

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  console.log("🔍 Firebase init with:");
  console.log("  serviceAccountPath:", serviceAccountPath);
  console.log("  databaseURL:", databaseURL);

  if (!serviceAccountPath || !databaseURL) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_DATABASE_URL env vars");
  }

  // Resolve to absolute path (important for Windows + relative .env paths)
  const absolutePath = path.resolve(serviceAccountPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`❌ Service account file not found at: ${absolutePath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  initialized = true;
  console.log("✅ Firebase initialized successfully!");
  return admin;
}

export async function getLatestReadings(limit = 200) {
  const adm = initFirebaseAdmin();
  const db = adm.database();

  try {
    const snapshot = await db.ref("sensor_data").limitToLast(limit).get();
    const data = snapshot.val() || {};
    const readings = Object.entries(data).map(([id, value]) => ({ id, ...value }));
    readings.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    return readings;
  } catch (err) {
    console.error("❌ Error fetching readings from Firebase:", err);
    throw err;
  }
}
