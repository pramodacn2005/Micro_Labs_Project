import { getLatestReadings } from "../services/firebaseAdminService.js";

const THRESHOLDS = {
  heartRate: { min: Number(process.env.HR_MIN ?? 60), max: Number(process.env.HR_MAX ?? 100) },
  spo2: { min: Number(process.env.SPO2_MIN ?? 95), max: Number(process.env.SPO2_MAX ?? 100) },
  bodyTemp: { min: Number(process.env.BTEMP_MIN ?? 36.1), max: Number(process.env.BTEMP_MAX ?? 37.2) },
  ambientTemp: { min: Number(process.env.ATEMP_MIN ?? -10), max: Number(process.env.ATEMP_MAX ?? 50) },
  accMagnitude: { min: Number(process.env.ACC_MIN ?? 0), max: Number(process.env.ACC_MAX ?? 3) }
};

function statusFor(value, { min, max }) {
  const num = Number(value);
  if (Number.isNaN(num)) return "unknown";
  if (min !== undefined && num < min) return num < min * 0.9 ? "critical" : "warning";
  if (max !== undefined && num > max) return num > max * 1.1 ? "critical" : "warning";
  return "normal";
}

export async function latest(req, res) {
  try {
    const readings = await getLatestReadings(200);
    const last = readings[readings.length - 1];
    if (!last) return res.json({ latest: null });

    const statuses = {
      heartRate: statusFor(last.heartRate, THRESHOLDS.heartRate),
      spo2: statusFor(last.spo2, THRESHOLDS.spo2),
      bodyTemp: statusFor(last.bodyTemp, THRESHOLDS.bodyTemp),
      ambientTemp: statusFor(last.ambientTemp, THRESHOLDS.ambientTemp),
      accMagnitude: statusFor(last.accMagnitude, THRESHOLDS.accMagnitude),
      fallDetected: last.fallDetected ? "critical" : "normal"
    };

    const alerts = [];
    for (const [k, v] of Object.entries(statuses)) {
      if (v === "warning" || v === "critical") alerts.push(`${k} ${v}`);
    }
    if (last.fallDetected) alerts.push("Fall detected");

    res.json({ latest: last, statuses, alerts, thresholds: THRESHOLDS });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function history(req, res) {
  try {
    const limit = Number(req.query.limit ?? 500);
    const readings = await getLatestReadings(limit);
    res.set("Cache-Control", "no-store");
    res.json({ items: readings });
  } catch (e) {
    res.status(500).json({ error: e.message, hint: "Check GOOGLE_APPLICATION_CREDENTIALS path and FIREBASE_DATABASE_URL in backend/.env" });
  }
}

export async function alerts(req, res) {
  try {
    const readings = await getLatestReadings(200);
    const last = readings[readings.length - 1];
    const alerts = [];
    if (last) {
      if (["warning", "critical"].includes(statusFor(last.heartRate, THRESHOLDS.heartRate))) alerts.push("Heart rate abnormal");
      if (["warning", "critical"].includes(statusFor(last.spo2, THRESHOLDS.spo2))) alerts.push("SpO₂ below normal");
      if (["warning", "critical"].includes(statusFor(last.bodyTemp, THRESHOLDS.bodyTemp))) alerts.push("Body temperature abnormal");
      if (["warning", "critical"].includes(statusFor(last.ambientTemp, THRESHOLDS.ambientTemp))) alerts.push("Ambient temperature out of range");
      if (["warning", "critical"].includes(statusFor(last.accMagnitude, THRESHOLDS.accMagnitude))) alerts.push("Abnormal acceleration magnitude");
      if (last.fallDetected) alerts.push("Fall detected");
    }
    res.json({ alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}



