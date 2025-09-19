// backend/controllers/smsAlertSystem.js
import { sendSMS } from "../services/alertService.js";

// Counters to track repeated abnormal readings
let abnormalCounters = {
  heartRate: 0,
  spo2: 0,
  bodyTemp: 0,
  ambientTemp: 0,
  accMagnitude: 0,
  fallDetected: 0,
};

export async function handleAbnormal(key, status, value) {
  if (status === "warning" || status === "critical") {
    abnormalCounters[key]++;
    if (abnormalCounters[key] >= 3) {
      await sendSMS(`🚨 Alert: ${key} abnormal (${status}). Value: ${value}`);
      abnormalCounters[key] = 0;
    }
  } else {
    abnormalCounters[key] = 0;
  }
}

export async function handleFall(fallDetected) {
  if (fallDetected) {
    abnormalCounters.fallDetected++;
    if (abnormalCounters.fallDetected >= 1) {
      await sendSMS("🚨 Emergency! Fall detected!");
      abnormalCounters.fallDetected = 0;
    }
  } else {
    abnormalCounters.fallDetected = 0;
  }
}
