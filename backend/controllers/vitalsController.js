// backend/controllers/vitalsController.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import {
  saveReading,
  getLatestReadings,
  saveAlertRecord,
  getLatestAlertForMetric,
  getRecentAlerts,
  getAlertState,
  setAlertState,
  getLatestAlertForDeviceMetric
} from "../services/firebaseAdminService.js";
import { sendSMS } from "../services/alertService.js";
import { processVitalReading } from "./vitalAlertController.js";

const router = express.Router();

const THRESHOLDS = {
  heartRate: { min: Number(process.env.HR_MIN ?? 60),  max: Number(process.env.HR_MAX ?? 100) },
  spo2:      { min: Number(process.env.SPO2_MIN ?? 95), max: Number(process.env.SPO2_MAX ?? 100) },
  bodyTemp:  { min: Number(process.env.BTEMP_MIN ?? 36.1), max: Number(process.env.BTEMP_MAX ?? 37.2) },
  ambientTemp: { min: Number(process.env.ATEMP_MIN ?? -10), max: Number(process.env.ATEMP_MAX ?? 50) },
  accMagnitude: { min: Number(process.env.ACC_MIN ?? 0), max: Number(process.env.ACC_MAX ?? 3) },
  bloodSugar: { min: Number(process.env.BLOOD_SUGAR_MIN ?? 70), max: Number(process.env.BLOOD_SUGAR_MAX ?? 100) },
  bloodPressureSystolic: { min: Number(process.env.BP_SYSTOLIC_MIN ?? 90), max: Number(process.env.BP_SYSTOLIC_MAX ?? 120) },
  bloodPressureDiastolic: { min: Number(process.env.BP_DIASTOLIC_MIN ?? 60), max: Number(process.env.BP_DIASTOLIC_MAX ?? 80) }
};

const REPEAT_THRESHOLD = Number(process.env.REPEAT_THRESHOLD ?? 3);
const ALERT_COOLDOWN_MIN = Number(process.env.ALERT_COOLDOWN_MIN ?? 30);

function statusFor(value, { min, max }) {
  const num = Number(value);
  if (Number.isNaN(num)) return "unknown";
  if (min !== undefined && num < min) return num < min * 0.9 ? "critical" : "warning";
  if (max !== undefined && num > max) return num > max * 1.1 ? "critical" : "warning";
  return "normal";
}

function formatAlert(key, value, status) {
  switch (key) {
    case "heartRate": return `Heart Rate: ${value} BPM (${status === "warning" ? "Borderline" : "High/Low"})`;
    case "spo2": return `SpO₂: ${value}% (${status === "warning" ? "Borderline" : "Low"})`;
    case "bodyTemp": return `Body Temp: ${value}°C (${status === "warning" ? "Borderline" : "High/Low"})`;
    case "ambientTemp": return `Ambient Temp: ${value}°C (${status === "warning" ? "Borderline" : "Out of Range"})`;
    case "accMagnitude": return `Movement: ${value} (${status === "warning" ? "Borderline" : "Abnormal"})`;
    case "bloodSugar": return `Blood Sugar: ${value} mg/dL (${status === "warning" ? "Borderline" : value < 70 ? "Low (Hypoglycemia)" : "High (Hyperglycemia)"})`;
    case "bloodPressureSystolic": return `Blood Pressure (Systolic): ${value} mmHg (${status === "warning" ? "Borderline" : value < 90 ? "Low (Hypotension)" : "High (Hypertension)"})`;
    case "bloodPressureDiastolic": return `Blood Pressure (Diastolic): ${value} mmHg (${status === "warning" ? "Borderline" : value < 60 ? "Low (Hypotension)" : "High (Hypertension)"})`;
    case "fallDetected": return "🚨 Emergency! Fall detected!";
    default: return `${key}: ${value} (${status})`;
  }
}

// POST /vitals/update
// Body: { deviceId?: string, heartRate, spo2, bodyTemp, ambientTemp, accMagnitude, fallDetected }
router.post("/update", async (req, res) => {
  try {
    const reading = req.body || {};
    // Basic validation: ensure numeric fields exist (you can extend validations)
    // Save reading to DB
    const saved = await saveReading(reading);

    // Process vital readings with new email alert system
    const deviceId = reading.deviceId || "unknown";
    const patientData = {
      patientName: reading.patientName,
      patientId: reading.patientId || deviceId,
      email: reading.patientEmail
    };
    
    // Extract vital readings for email alert system
    const vitalReadings = {
      heartRate: reading.heartRate,
      spo2: reading.spo2,
      bodyTemp: reading.bodyTemp,
      ambientTemp: reading.ambientTemp,
      accMagnitude: reading.accMagnitude
    };
    
    // Process with new email alert system
    try {
      await processVitalReading(deviceId, vitalReadings, patientData);
    } catch (error) {
      console.error("❌ [VITALS] Error processing vital alerts:", error);
    }

    // Immediately handle fall detection (send immediate alert, with cooldown)
    if (reading.fallDetected) {
      const lastFallAlert = await getLatestAlertForMetric("fallDetected");
      const cooldownMs = ALERT_COOLDOWN_MIN * 60 * 1000;
      const now = Date.now();
      const allowFall = !lastFallAlert || (now - (lastFallAlert.ts || 0) > cooldownMs);

      if (allowFall) {
        const msg = "🚨 Emergency! Fall detected!";
        await sendSMS(msg);
        await saveAlertRecord({ metrics: ["fallDetected"], message: msg, readingId: saved.id });
      }
    }

    // Per-device consecutive abnormal logic with duplicate suppression
    const possibleMetrics = ["heartRate", "spo2", "bodyTemp", "ambientTemp", "accMagnitude"];
    const metricsTriggered = [];

    for (const metric of possibleMetrics) {
      const value = reading[metric];
      const status = statusFor(value, THRESHOLDS[metric]);

      // Load state
      const state = (await getAlertState(deviceId, metric)) || { consecutive: 0, lastValue: null, locked: false };

      // Determine if abnormal
      const isAbnormal = status === "warning" || status === "critical";

      if (!isAbnormal) {
        // reset on recovery
        await setAlertState(deviceId, metric, { consecutive: 0, lastValue: value, locked: false });
        continue;
      }

      // If value changed meaningfully, reset consecutive counter
      const changed = state.lastValue === null ? false : Math.abs(Number(value) - Number(state.lastValue)) > 0;
      const consecutive = changed ? 1 : (Number(state.consecutive || 0) + 1);

      // If we previously sent SMS and haven't recovered, remain locked
      let locked = Boolean(state.locked);

      // When counter reaches threshold and not locked, trigger SMS
      if (consecutive >= REPEAT_THRESHOLD && !locked) {
        const smsText = `Alert: Patient ${reading.patientName || deviceId}’s abnormal reading of ${metric}: ${value} has been detected ${REPEAT_THRESHOLD} times consecutively. Immediate attention required.`;
        await sendSMS(smsText);
        await saveAlertRecord({ deviceId, metrics: [metric], message: smsText, readingId: saved.id, value, status });
        locked = true; // prevent duplicates until recovery
        metricsTriggered.push(metric);
      }

      // persist state
      await setAlertState(deviceId, metric, { consecutive, lastValue: value, locked });
    }

    return res.json({ ok: true, savedId: saved.id, alertsSentFor: metricsTriggered });
  } catch (err) {
    console.error("update error", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /vitals/latest?deviceId=...
router.get("/latest", async (req, res) => {
  try {
    const deviceId = req.query.deviceId;
    const items = await getLatestReadings(1, deviceId);
    const last = items[items.length - 1] || null;
    res.json({ latest: last });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vitals/alerts
router.get("/alerts", async (req, res) => {
  try {
    const items = await getRecentAlerts(100);
    // also provide a combined string for UI convenience
    const combined = items.map(a => a.message).join("\n\n");
    res.json({ alerts: items, combined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vitals/history?limit=100&timeframe=1m
router.get("/history", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const timeframe = req.query.timeframe || "1m";
    const deviceId = req.query.deviceId;
    
    const items = await getLatestReadings(limit, deviceId);
    res.json({ items });
  } catch (err) {
    console.error("history error", err);
    // Return empty list with 200 to keep frontend running even if Firestore is down/misconfigured
    res.json({ items: [] });
  }
});

// Simple endpoint to test Twilio SMS delivery
router.post("/send-test-sms", async (req, res) => {
  try {
    const to = process.env.DOCTOR_PHONE_NUMBER;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!to || !from) {
      return res.status(400).json({ success: false, error: "Missing DOCTOR_PHONE_NUMBER or TWILIO_PHONE_NUMBER env vars" });
    }
    await sendSMS("🚨 Test alert from IoT Health Monitoring Dashboard!");
    res.json({ success: true, message: `Test SMS requested to ${to}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint to send doctor SMS from the dashboard when UI triggers it (e.g., after 8 popups)
// Body: { deviceId?, patientName?, metricMessages?: string[], latest?: object, note?: string }
router.post("/notify", async (req, res) => {
  try {
    const { deviceId, patientName, metricMessages = [], latest = {}, note } = req.body || {};
    const idPart = patientName || deviceId || "Unknown Patient";
    const details = metricMessages.length ? `\n${metricMessages.map(m => `• ${m}`).join("\n")}` : "";
    const values = latest && Object.keys(latest).length ? `\nValues: ${JSON.stringify(latest)}` : "";
    const extra = note ? `\nNote: ${note}` : "";
    const text = `Alert: ${idPart} has repeated abnormalities detected by dashboard.${details}${values}${extra}\nTime: ${new Date().toLocaleString()}`;

    await sendSMS(text);
    await saveAlertRecord({ deviceId, metrics: ["ui_trigger"], message: text, readingId: latest?.id, source: "dashboard" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


import { handleAbnormal, handleFall } from "./smsAlertSystem.js";
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

    // 🔹 loop must be INSIDE latest()
    for (const [k, v] of Object.entries(statuses)) {
      if (k === "fallDetected") {
        await handleFall(last.fallDetected);
      } else {
        await handleAbnormal(k, v, last[k]);
      }
    }

    res.json({ latest: last, statuses, thresholds: THRESHOLDS });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default router;
