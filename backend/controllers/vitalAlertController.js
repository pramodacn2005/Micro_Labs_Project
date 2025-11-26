// backend/controllers/vitalAlertController.js
import { sendAbnormalVitalsEmail } from "../services/emailAlertService.js";
import { saveAlertRecord } from "../services/firebaseAdminService.js";

// Define clear threshold values for abnormal vitals
const VITAL_THRESHOLDS = {
  heartRate: { 
    min: 60, 
    max: 100, 
    criticalMin: 50, 
    criticalMax: 120,
    name: "Heart Rate",
    unit: "BPM"
  },
  spo2: { 
    min: 95, 
    max: 100, 
    criticalMin: 90, 
    criticalMax: 100,
    name: "Blood Oxygen (SpO₂)",
    unit: "%"
  },
  bodyTemp: { 
    min: 36.1, 
    max: 37.2, 
    criticalMin: 35.0, 
    criticalMax: 38.0,
    name: "Body Temperature",
    unit: "°C"
  },
  ambientTemp: { 
    min: 15, 
    max: 30, 
    criticalMin: 5, 
    criticalMax: 40,
    name: "Ambient Temperature",
    unit: "°C"
  },
  accMagnitude: { 
    min: 0.5, 
    max: 2.0, 
    criticalMin: 0, 
    criticalMax: 5.0,
    name: "Acceleration Magnitude",
    unit: "g"
  },
  bloodSugar: { 
    min: 70, 
    max: 100, 
    criticalMin: 50, 
    criticalMax: 250,
    name: "Blood Sugar (Glucose)",
    unit: "mg/dL"
  },
  bloodPressureSystolic: { 
    min: 90, 
    max: 120, 
    criticalMin: 80, 
    criticalMax: 140,
    name: "Blood Pressure (Systolic)",
    unit: "mmHg"
  },
  bloodPressureDiastolic: { 
    min: 60, 
    max: 80, 
    criticalMin: 50, 
    criticalMax: 90,
    name: "Blood Pressure (Diastolic)",
    unit: "mmHg"
  }
};

// Consecutive counters for each vital per device
const consecutiveCounters = new Map(); // deviceId -> { vital -> count }
const alertCooldowns = new Map(); // deviceId -> { vital -> lastAlertTime }
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown between alerts for same vital
const CONSECUTIVE_THRESHOLD = 3; // Number of consecutive abnormal readings to trigger alert

/**
 * Check if a vital reading is abnormal
 */
function isAbnormalVital(vital, value, thresholds) {
  const numValue = Number(value);
  if (isNaN(numValue)) return { isAbnormal: false, status: 'invalid' };
  
  if (numValue < thresholds.criticalMin || numValue > thresholds.criticalMax) {
    return { isAbnormal: true, status: 'critical' };
  }
  
  if (numValue < thresholds.min || numValue > thresholds.max) {
    return { isAbnormal: true, status: 'warning' };
  }
  
  return { isAbnormal: false, status: 'normal' };
}

/**
 * Get threshold string for display
 */
function getThresholdString(thresholds) {
  return `${thresholds.min}-${thresholds.max}${thresholds.unit} (Critical: ${thresholds.criticalMin}-${thresholds.criticalMax}${thresholds.unit})`;
}

/**
 * Process vital reading and check for consecutive abnormal readings
 */
export async function processVitalReading(deviceId, vitalReadings, patientData = {}) {
  const timestamp = Date.now();
  const abnormalVitals = [];
  
  console.log(`🔍 [VITAL ALERT] Processing vitals for device ${deviceId} at ${new Date(timestamp).toISOString()}`);
  
  // Initialize counters for this device if not exists
  if (!consecutiveCounters.has(deviceId)) {
    consecutiveCounters.set(deviceId, {});
  }
  if (!alertCooldowns.has(deviceId)) {
    alertCooldowns.set(deviceId, {});
  }
  
  const deviceCounters = consecutiveCounters.get(deviceId);
  const deviceCooldowns = alertCooldowns.get(deviceId);
  
  // Check each vital
  for (const [vital, value] of Object.entries(vitalReadings)) {
    if (!VITAL_THRESHOLDS[vital] || value === null || value === undefined) {
      continue;
    }
    
    const thresholds = VITAL_THRESHOLDS[vital];
    const { isAbnormal, status } = isAbnormalVital(vital, value, thresholds);
    
    console.log(`📊 [VITAL ALERT] ${vital}: ${value}${thresholds.unit} - Status: ${status}`);
    
    if (isAbnormal) {
      // Increment consecutive counter
      deviceCounters[vital] = (deviceCounters[vital] || 0) + 1;
      console.log(`⚠️ [VITAL ALERT] ${vital} abnormal (${status}) - Consecutive count: ${deviceCounters[vital]}`);
      
      // Check if we should send alert
      const shouldSendAlert = deviceCounters[vital] >= CONSECUTIVE_THRESHOLD;
      const cooldownKey = vital; // Use just the vital name for cooldown, not status
      const lastAlertTime = deviceCooldowns[cooldownKey] || 0;
      const timeSinceLastAlert = timestamp - lastAlertTime;
      const isInCooldown = timeSinceLastAlert < COOLDOWN_MS;
      
      if (shouldSendAlert && !isInCooldown) {
        console.log(`🚨 [VITAL ALERT] Triggering alert for ${vital} - ${deviceCounters[vital]} consecutive abnormal readings`);
      } else if (shouldSendAlert && isInCooldown) {
        const minutesRemaining = Math.ceil((COOLDOWN_MS - timeSinceLastAlert) / 60000);
        console.log(`⏰ [VITAL ALERT] ${vital} alert blocked by cooldown - ${minutesRemaining} minutes remaining`);
      }
      
      if (shouldSendAlert && !isInCooldown) {
        
        abnormalVitals.push({
          metric: vital,
          value: value,
          status: status,
          threshold: getThresholdString(thresholds),
          consecutiveCount: deviceCounters[vital]
        });
        
        // Set cooldown
        deviceCooldowns[cooldownKey] = timestamp;
        
        // Reset counter after alert
        deviceCounters[vital] = 0;
      }
    } else {
      // Reset counter on normal reading
      if (deviceCounters[vital] > 0) {
        console.log(`✅ [VITAL ALERT] ${vital} returned to normal - resetting counter from ${deviceCounters[vital]} to 0`);
        deviceCounters[vital] = 0;
      }
    }
  }
  
  // Send email alert if there are abnormal vitals
  if (abnormalVitals.length > 0) {
    console.log(`\n🚨 [VITAL ALERT] ==========================================`);
    console.log(`📧 [VITAL ALERT] Sending email alert for ${abnormalVitals.length} abnormal vitals`);
    console.log(`👤 [VITAL ALERT] Patient: ${patientData.patientName || 'Unknown'}`);
    console.log(`📊 [VITAL ALERT] Abnormal Vitals: ${abnormalVitals.map(v => `${v.metric}=${v.value}`).join(', ')}`);
    console.log(`⏰ [VITAL ALERT] Timestamp: ${new Date(timestamp).toLocaleString()}`);
    console.log(`🚨 [VITAL ALERT] ==========================================\n`);
    
    try {
      const emailResult = await sendAbnormalVitalsEmail(patientData, abnormalVitals, timestamp);
      
      if (emailResult.success) {
        console.log(`\n🎉 [VITAL ALERT] ==========================================`);
        console.log(`✅ [VITAL ALERT] ALERT EMAIL SENT SUCCESSFULLY!`);
        console.log(`📧 [VITAL ALERT] Message ID: ${emailResult.messageId}`);
        console.log(`📧 [VITAL ALERT] Status: ${emailResult.status}`);
        console.log(`📧 [VITAL ALERT] To: ${process.env.DOCTOR_EMAIL || 'doctor@example.com'}`);
        console.log(`📧 [VITAL ALERT] Subject: "🚨 Abnormal Health Vitals Alert for ${patientData.patientName || 'Patient'}"`);
        console.log(`⏰ [VITAL ALERT] Sent at: ${new Date().toLocaleString()}`);
        console.log(`🎉 [VITAL ALERT] ==========================================\n`);
        
        // Simple confirmation message
        console.log(`✅ ALERT MAIL SENT SUCCESSFULLY!`);
        
        // Save alert record to database (optional - don't fail if database is unavailable)
        try {
          await saveAlertRecord({
            deviceId: deviceId,
            metrics: abnormalVitals.map(v => v.metric),
            message: `Abnormal vitals detected: ${abnormalVitals.map(v => `${v.metric}=${v.value}`).join(', ')}`,
            readingId: `vital_alert_${timestamp}`,
            value: abnormalVitals[0].value,
            status: 'critical',
            emailSent: true,
            emailMessageId: emailResult.messageId
          });
          console.log(`💾 [VITAL ALERT] Alert record saved to database`);
        } catch (dbError) {
          console.warn(`⚠️ [VITAL ALERT] Could not save to database (email still sent):`, dbError.message);
        }
      } else {
        console.log(`\n❌ [VITAL ALERT] ==========================================`);
        console.log(`❌ [VITAL ALERT] FAILED TO SEND EMAIL ALERT!`);
        console.log(`❌ [VITAL ALERT] Error: ${emailResult.error}`);
        console.log(`❌ [VITAL ALERT] ==========================================\n`);
      }
    } catch (error) {
      console.log(`\n❌ [VITAL ALERT] ==========================================`);
      console.log(`❌ [VITAL ALERT] ERROR SENDING EMAIL ALERT!`);
      console.log(`❌ [VITAL ALERT] Error: ${error.message}`);
      console.log(`❌ [VITAL ALERT] ==========================================\n`);
    }
  }
  
  return {
    processed: true,
    abnormalVitals: abnormalVitals,
    timestamp: timestamp
  };
}

/**
 * Get current status of all vitals for a device
 */
export function getVitalStatus(deviceId) {
  const deviceCounters = consecutiveCounters.get(deviceId) || {};
  const deviceCooldowns = alertCooldowns.get(deviceId) || {};
  
  return {
    deviceId: deviceId,
    consecutiveCounters: { ...deviceCounters },
    cooldowns: Object.keys(deviceCooldowns).reduce((acc, key) => {
      const lastAlert = deviceCooldowns[key];
      const timeSince = Date.now() - lastAlert;
      acc[key] = {
        lastAlertTime: lastAlert,
        timeSinceLastAlert: timeSince,
        isInCooldown: timeSince < COOLDOWN_MS
      };
      return acc;
    }, {}),
    thresholds: VITAL_THRESHOLDS
  };
}

/**
 * Reset counters for a specific device and vital
 */
export function resetVitalCounter(deviceId, vital) {
  if (consecutiveCounters.has(deviceId)) {
    const deviceCounters = consecutiveCounters.get(deviceId);
    if (vital) {
      deviceCounters[vital] = 0;
      console.log(`🔄 [VITAL ALERT] Reset counter for ${deviceId}:${vital}`);
    } else {
      Object.keys(deviceCounters).forEach(v => deviceCounters[v] = 0);
      console.log(`🔄 [VITAL ALERT] Reset all counters for device ${deviceId}`);
    }
  }
}

/**
 * Get all vital thresholds
 */
export function getVitalThresholds() {
  return VITAL_THRESHOLDS;
}

/**
 * Update vital thresholds (for configuration)
 */
export function updateVitalThresholds(newThresholds) {
  Object.assign(VITAL_THRESHOLDS, newThresholds);
  console.log(`⚙️ [VITAL ALERT] Updated vital thresholds:`, VITAL_THRESHOLDS);
}
