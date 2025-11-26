import React, { useEffect, useMemo, useState, useRef } from "react";
import VitalsCard from "./VitalsCard";
import QuickActions from "./QuickActions";
import SummaryCard from "./SummaryCard";
import RealtimeGraph from "./RealtimeGraph";
import { useAuth } from "../contexts/AuthContext";
import {
  getFirebaseDb,
  DEFAULT_THRESHOLDS,
  evaluateStatus,
  getLimitForTimeframe,
  checkEmergencyThresholds,
  generateEmergencySMS,
  CAREGIVER_CONTACT,
  getAgeAdjustedThresholds,
  getAgeGroupInfo,
  convertAgeToYears,
} from "../services/firebaseService";
import { designTokens } from "../config/designTokens";
import { runAllTests } from "../utils/firebaseTest";
import { runAllFirebaseTests } from "../utils/testFirebaseConnection";
import { ref, get, query, orderByKey, limitToLast } from "firebase/database";

const TIMEFRAMES = [
  { key: "1m", label: "1 min", ms: 1 * 60 * 1000 },
  { key: "15m", label: "15 min", ms: 15 * 60 * 1000 },
  { key: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { key: "4h", label: "4 hours", ms: 4 * 60 * 60 * 1000 },
  { key: "24h", label: "24 h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

// Generate sample data for testing when no real data is available
function generateSampleData(count) {
  const now = Date.now();
  const data = [];
  
  // Base values for more stable readings
  let baseHeartRate = 75;
  let baseSpo2 = 98;
  let baseBodyTemp = 36.5;
  let baseAmbientTemp = 25;
  let baseAccMagnitude = 1.0;
  let baseBloodSugar = 85; // Normal fasting glucose
  let baseBPSystolic = 115; // Normal systolic BP
  let baseBPDiastolic = 75; // Normal diastolic BP
  
  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 1000; // 1 second intervals
    
    // Add small variations to base values for more realistic data
    const hrVariation = (Math.random() - 0.5) * 10; // ±5 bpm variation
    const spo2Variation = (Math.random() - 0.5) * 2; // ±1% variation
    const tempVariation = (Math.random() - 0.5) * 0.3; // ±0.15°C variation
    const ambientVariation = (Math.random() - 0.5) * 5; // ±2.5°C variation
    const accVariation = (Math.random() - 0.5) * 0.5; // ±0.25g variation
    const bloodSugarVariation = (Math.random() - 0.5) * 10; // ±5 mg/dL variation
    const bpSystolicVariation = (Math.random() - 0.5) * 8; // ±4 mmHg variation
    const bpDiastolicVariation = (Math.random() - 0.5) * 6; // ±3 mmHg variation
    
    data.push({
      id: `sample_${i}`,
      timestamp: timestamp,
      heartRate: Math.round(baseHeartRate + hrVariation),
      spo2: Math.round(baseSpo2 + spo2Variation),
      bodyTemp: Number((baseBodyTemp + tempVariation).toFixed(1)),
      ambientTemp: Number((baseAmbientTemp + ambientVariation).toFixed(1)),
      accMagnitude: Number((baseAccMagnitude + accVariation).toFixed(2)),
      fallDetected: Math.random() < 0.02, // 2% chance of fall (reduced)
      bloodSugar: Math.round(baseBloodSugar + bloodSugarVariation),
      bloodPressureSystolic: Math.round(baseBPSystolic + bpSystolicVariation),
      bloodPressureDiastolic: Math.round(baseBPDiastolic + bpDiastolicVariation)
    });
    
    // Gradually adjust base values for more realistic trends
    baseHeartRate += (Math.random() - 0.5) * 0.5;
    baseSpo2 += (Math.random() - 0.5) * 0.1;
    baseBodyTemp += (Math.random() - 0.5) * 0.05;
    baseAmbientTemp += (Math.random() - 0.5) * 0.2;
    baseAccMagnitude += (Math.random() - 0.5) * 0.1;
    baseBloodSugar += (Math.random() - 0.5) * 1;
    baseBPSystolic += (Math.random() - 0.5) * 0.5;
    baseBPDiastolic += (Math.random() - 0.5) * 0.3;
    
    // Keep values within reasonable bounds
    baseHeartRate = Math.max(60, Math.min(100, baseHeartRate));
    baseSpo2 = Math.max(95, Math.min(100, baseSpo2));
    baseBodyTemp = Math.max(36.0, Math.min(37.5, baseBodyTemp));
    baseAmbientTemp = Math.max(15, Math.min(35, baseAmbientTemp));
    baseAccMagnitude = Math.max(0.5, Math.min(2.0, baseAccMagnitude));
    baseBloodSugar = Math.max(70, Math.min(100, baseBloodSugar));
    baseBPSystolic = Math.max(90, Math.min(120, baseBPSystolic));
    baseBPDiastolic = Math.max(60, Math.min(80, baseBPDiastolic));
  }
  
  return data;
}

export default function Dashboard() {
  const { user, isAuthenticated, userData } = useAuth();
  const [readings, setReadings] = useState([]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0].key);
  const [liveFast, setLiveFast] = useState(false); // false => 10s, true => 1s
  const [isStale, setIsStale] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false); // Live mode state
  const [emergencyAlert, setEmergencyAlert] = useState(null); // Emergency alert state
  const [smsSent, setSmsSent] = useState(false); // SMS sent status
  const ageInYears = useMemo(() => convertAgeToYears(userData?.age), [userData?.age]);
  const ageGroupInfo = useMemo(() => getAgeGroupInfo(ageInYears), [ageInYears]);
  const ageAdjustedThresholds = useMemo(
    () => getAgeAdjustedThresholds(ageInYears),
    [ageInYears]
  );
  const profileAgeLabel = useMemo(() => {
    if (userData?.age) return userData.age;
    if (ageInYears !== null && ageInYears !== undefined) {
      return `${Number(ageInYears.toFixed(1))} yrs`;
    }
    return null;
  }, [userData?.age, ageInYears]);
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const pollingRef = useRef(null);
  const lastFirebaseDataRef = useRef(null);
  const firebaseIntervalRef = useRef(null);
  const smoothedReadingsRef = useRef([]);
  const lastDataAtRef = useRef(0);
  const staleCheckIntervalRef = useRef(null);
  const firebaseAvailableRef = useRef(false);
  const livePollingRef = useRef(null); // For 5-second live polling
  const lastEmergencyAlertRef = useRef(0); // Track last emergency alert time

  const updateMs = liveFast ? 1000 : 10000;
  const STALE_AFTER_MS = 15000; // consider data stale if no updates for 15s
  const EMERGENCY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for emergency alerts

  // Function to send emergency SMS
  const sendEmergencySMS = async (alert) => {
    try {
      const patientName = userData?.fullName || user?.displayName || "Patient";
      const message = generateEmergencySMS(alert, patientName);
      
      console.log("🚨 [EMERGENCY] Sending SMS to caregiver:", CAREGIVER_CONTACT.phone);
      console.log("📱 [EMERGENCY] SMS Message:", message);
      
      const response = await fetch(`${backendUrl}/api/vitals/send-emergency-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: CAREGIVER_CONTACT.phone,
          message: message,
          alert: alert,
          patientName: patientName
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ [EMERGENCY] SMS sent successfully:", result);
        setSmsSent(true);
        return true;
      } else {
        console.error("❌ [EMERGENCY] SMS failed:", response.status);
        return false;
      }
    } catch (error) {
      console.error("❌ [EMERGENCY] SMS error:", error);
      return false;
    }
  };

  // Function to check for emergency alerts
  const checkForEmergencyAlerts = (reading) => {
    if (!reading) return;
    
    const now = Date.now();
    const timeSinceLastEmergency = now - lastEmergencyAlertRef.current;
    
    // Check if enough time has passed since last emergency alert
    if (timeSinceLastEmergency < EMERGENCY_COOLDOWN_MS) {
      console.log("⏰ [EMERGENCY] Cooldown active, skipping emergency check");
      return;
    }
    
    const emergencyAlerts = checkEmergencyThresholds(reading, ageInYears);
    
    if (emergencyAlerts.length > 0) {
      console.log("🚨 [EMERGENCY] Emergency threshold breached:", emergencyAlerts);
      
      // Set emergency alert state
      const alert = {
        ...emergencyAlerts[0], // Take the first critical alert
        timestamp: reading.timestamp,
        reading: reading
      };
      
      setEmergencyAlert(alert);
      lastEmergencyAlertRef.current = now;
      
      // Send SMS automatically
      sendEmergencySMS(alert);
    }
  };

  // Function to fetch latest data from Firebase
  const fetchLatestData = async () => {
    try {
      const db = getFirebaseDb();
      if (!db) {
        console.warn("Firebase database not available");
        return;
      }

      console.log("🔄 [LIVE MODE] Fetching latest data from Firebase /sensor_data (10s polling)");
      const sensorRef = ref(db, "sensor_data");
      const sensorQuery = query(sensorRef, orderByKey(), limitToLast(1));
      const snapshot = await get(sensorQuery);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const readings = Object.entries(data).map(([key, value]) => ({ 
          id: key, 
          ...value 
        }));
        
        if (readings.length > 0) {
          const latestReading = readings[0];
          const timestamp = new Date(latestReading.timestamp);
          console.log("✅ [LIVE MODE] Latest data fetched:", {
            dataPath: "/sensor_data",
            timestamp: timestamp.toLocaleString(),
            timestampValue: latestReading.timestamp,
            heartRate: latestReading.heartRate,
            spo2: latestReading.spo2,
            bodyTemp: latestReading.bodyTemp,
            ambientTemp: latestReading.ambientTemp,
            accMagnitude: latestReading.accMagnitude,
            fallDetected: latestReading.fallDetected,
            bloodSugar: latestReading.bloodSugar,
            bloodPressureSystolic: latestReading.bloodPressureSystolic,
            bloodPressureDiastolic: latestReading.bloodPressureDiastolic
          });
          
          // Update readings with latest data
          setReadings(prev => {
            const normalized = normalizeRecord(latestReading);
            const smoothed = smoothReadings([normalized]);
            const newReadings = [...prev.slice(-99), ...smoothed]; // Keep last 100 readings
            console.log(`📊 [LIVE MODE] Updated readings count: ${newReadings.length}`);
            
            // Check for emergency alerts with the latest reading
            checkForEmergencyAlerts(normalized);
            
            return newReadings;
          });
          
          lastDataAtRef.current = Date.now();
          setIsStale(false);
        }
      } else {
        console.log("⚠️ [LIVE MODE] No data available in Firebase /sensor_data");
      }
    } catch (error) {
      console.error("❌ [LIVE MODE] Error fetching latest data:", error);
    }
  };

  // Data smoothing function to reduce fluctuations
  function smoothReadings(newReadings) {
    if (newReadings.length === 0) return newReadings;
    
    const smoothed = [...newReadings];
    const windowSize = Math.min(3, newReadings.length); // Use last 3 readings for smoothing
    
    for (let i = newReadings.length - 1; i >= Math.max(0, newReadings.length - windowSize); i--) {
      const current = newReadings[i];
      const prev = newReadings[i - 1];
      
      if (prev) {
        // Smooth heart rate (prevent sudden jumps > 20 bpm)
        if (current.heartRate && prev.heartRate) {
          const hrDiff = Math.abs(current.heartRate - prev.heartRate);
          if (hrDiff > 20) {
            smoothed[i].heartRate = prev.heartRate + (current.heartRate - prev.heartRate) * 0.3;
          }
        }
        
        // Smooth SpO2 (prevent sudden drops > 5%)
        if (current.spo2 && prev.spo2) {
          const spo2Diff = Math.abs(current.spo2 - prev.spo2);
          if (spo2Diff > 5) {
            smoothed[i].spo2 = prev.spo2 + (current.spo2 - prev.spo2) * 0.2;
          }
        }
        
        // Smooth body temperature (prevent sudden changes > 0.5°C)
        if (current.bodyTemp && prev.bodyTemp) {
          const tempDiff = Math.abs(current.bodyTemp - prev.bodyTemp);
          if (tempDiff > 0.5) {
            smoothed[i].bodyTemp = prev.bodyTemp + (current.bodyTemp - prev.bodyTemp) * 0.3;
          }
        }
        
        // Smooth blood sugar (prevent sudden changes > 20 mg/dL)
        if (current.bloodSugar && prev.bloodSugar) {
          const sugarDiff = Math.abs(current.bloodSugar - prev.bloodSugar);
          if (sugarDiff > 20) {
            smoothed[i].bloodSugar = prev.bloodSugar + (current.bloodSugar - prev.bloodSugar) * 0.3;
          }
        }
        
        // Smooth blood pressure (prevent sudden changes > 15 mmHg)
        if (current.bloodPressureSystolic && prev.bloodPressureSystolic) {
          const bpDiff = Math.abs(current.bloodPressureSystolic - prev.bloodPressureSystolic);
          if (bpDiff > 15) {
            smoothed[i].bloodPressureSystolic = prev.bloodPressureSystolic + (current.bloodPressureSystolic - prev.bloodPressureSystolic) * 0.3;
          }
        }
        if (current.bloodPressureDiastolic && prev.bloodPressureDiastolic) {
          const bpDiff = Math.abs(current.bloodPressureDiastolic - prev.bloodPressureDiastolic);
          if (bpDiff > 10) {
            smoothed[i].bloodPressureDiastolic = prev.bloodPressureDiastolic + (current.bloodPressureDiastolic - prev.bloodPressureDiastolic) * 0.3;
          }
        }
      }
    }
    
    return smoothed;
  }

  function normalizeRecord(r) {
    const tsNum = Number(r.timestamp);
    let tsMs = isNaN(tsNum) || tsNum === 0 ? Date.now() : (tsNum < 10 ** 12 ? tsNum * 1000 : tsNum);
    const nowMs = Date.now();
    const minReasonableMs = 946684800000; // 2000-01-01
    const maxReasonableMs = nowMs + 24 * 60 * 60 * 1000; // now + 1 day
    
    // Check if timestamp is in seconds (Unix timestamp) and convert to milliseconds
    if (tsMs < minReasonableMs && tsMs > 0) {
      // If it's a reasonable Unix timestamp in seconds, convert to milliseconds
      if (tsMs > 1000000000 && tsMs < 2000000000) { // Between 2001 and 2033
        tsMs = tsMs * 1000;
        console.log("🕒 [TIMESTAMP] Converted Unix timestamp from seconds to milliseconds:", r.timestamp, "->", tsMs);
      } else {
        console.warn("Unrealistic timestamp detected, using current time:", r.timestamp);
        tsMs = nowMs;
      }
    } else if (tsMs > maxReasonableMs) {
      console.warn("Future timestamp detected, using current time:", r.timestamp);
      tsMs = nowMs;
    }

    const pickFirst = (...keys) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== "") return r[k];
      }
      return null;
    };

    let heartRateRaw = pickFirst(
      "heartRate","HeartRate","hr","heart_rate","pulse","bpm","heart"
    );
    let spo2Raw = pickFirst(
      "spo2","SpO2","SPO2","SpO₂","oxygen","oxygenSaturation","o2","oximeter"
    );
    let bodyTempRaw = pickFirst(
      "bodyTemp","BodyTemp","body_temperature","body_temperature_c","temperature","Temperature","temp","temp_c"
    );
    let bloodSugarRaw = pickFirst(
      "bloodSugar","BloodSugar","blood_sugar","glucose","Glucose","bloodGlucose","bg","sugar"
    );
    let bloodPressureSystolicRaw = pickFirst(
      "bloodPressureSystolic","BloodPressureSystolic","bp_systolic","systolic","systolicBP","bpSystolic","systolic_pressure"
    );
    let bloodPressureDiastolicRaw = pickFirst(
      "bloodPressureDiastolic","BloodPressureDiastolic","bp_diastolic","diastolic","diastolicBP","bpDiastolic","diastolic_pressure"
    );

    // Coerce numbers
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    let heartRate = toNum(heartRateRaw);
    let spo2 = toNum(spo2Raw);
    let bodyTemp = toNum(bodyTempRaw);
    let bloodSugar = toNum(bloodSugarRaw);
    let bloodPressureSystolic = toNum(bloodPressureSystolicRaw);
    let bloodPressureDiastolic = toNum(bloodPressureDiastolicRaw);

    // If body temperature seems to be in Fahrenheit, convert to Celsius
    if (bodyTemp !== null && bodyTemp > 45 && bodyTemp < 120) {
      bodyTemp = Number(((bodyTemp - 32) * 5 / 9).toFixed(1));
    }

    // Handle BP if provided as "120/80" format
    if (!bloodPressureSystolic && !bloodPressureDiastolic) {
      const bpRaw = pickFirst("bloodPressure","BloodPressure","bp","BP","pressure");
      if (bpRaw && typeof bpRaw === 'string' && bpRaw.includes('/')) {
        const parts = bpRaw.split('/').map(p => toNum(p.trim()));
        if (parts.length === 2 && parts[0] && parts[1]) {
          bloodPressureSystolic = parts[0];
          bloodPressureDiastolic = parts[1];
        }
      }
    }

    const normalized = {
      ...r,
      timestamp: tsMs,
      heartRate,
      spo2,
      bodyTemp,
      bloodSugar,
      bloodPressureSystolic,
      bloodPressureDiastolic,
    };

    return normalized;
  }

  // Live mode toggle effect
  useEffect(() => {
    if (isLiveMode) {
      console.log("🟢 Live mode started");
      console.log("📡 [LIVE MODE] Data source: Firebase /sensor_data");
      console.log("⏱️ [LIVE MODE] Polling interval: 10000ms (10 seconds)");
      // Start 10-second polling
      livePollingRef.current = setInterval(fetchLatestData, 10000);
      // Initial fetch
      fetchLatestData();
    } else {
      console.log("⏸️ Live mode stopped");
      console.log("🛑 [LIVE MODE] Polling interval cleared");
      // Stop polling
      if (livePollingRef.current) {
        clearInterval(livePollingRef.current);
        livePollingRef.current = null;
      }
    }

    return () => {
      if (livePollingRef.current) {
        console.log("🧹 [LIVE MODE] Cleanup - clearing polling interval");
        clearInterval(livePollingRef.current);
        livePollingRef.current = null;
      }
    };
  }, [isLiveMode]);

  // Fetch sensor data (Firebase first, fallback to backend polling) - only when not in live mode
  useEffect(() => {
    if (isLiveMode) return; // Skip this effect when in live mode

    // Debug: Log vitals data fetching info
    console.log("🔍 Dashboard Vitals Debug Info:");
    console.log("- User authenticated:", isAuthenticated);
    console.log("- User UID:", user?.uid || 'Not logged in');
    console.log("- User email:", user?.email || 'Not logged in');
    console.log("- Vitals data path: sensor_data (global, no auth required)");
    console.log("- Timeframe:", timeframe);
    
    // Run Firebase connection tests
    console.log("🧪 Running Firebase connection tests...");
    runAllTests();
    
    // Run comprehensive Firebase tests
    runAllFirebaseTests().then(success => {
      if (success) {
        console.log("🎉 All Firebase tests passed!");
      } else {
        console.log("⚠️ Some Firebase tests failed - check console for details");
      }
    });

    let unsub = null;
    
    const fetchData = async () => {
      try {
        const limit = getLimitForTimeframe(timeframe);
        console.log(`🌡️ Fetching global vitals data, timeframe: ${timeframe}, limit: ${limit}`);
        const res = await fetch(`${backendUrl}/api/vitals/history?limit=${limit}&timeframe=${timeframe}`);
        if (!res.ok) {
          console.error(`❌ Backend fetch failed with status: ${res.status}`);
          return;
        }
        const json = await res.json();
        const items = json.items || [];
        console.log(`✅ Received ${items.length} vitals items from backend (global data)`);
        
        if (items.length === 0) {
          console.warn("No data received from backend");
          // Do not generate sample data; mark as possibly stale
          return;
        }
        
        const normalized = items.map((r) => {
          const n = normalizeRecord(r);
          if (items.length > 0 && items.indexOf(r) < 3) {
            console.log(`Original timestamp: ${r.timestamp}, Converted: ${n.timestamp}, Current time: ${Date.now()}`);
            console.log(`Full record:`, r);
          }
          return n;
        });
        const smoothed = smoothReadings(normalized);
        setReadings(smoothed);
        lastDataAtRef.current = Date.now();
        setIsStale(false);
      } catch (err) {
        console.error("Backend fetch failed:", err);
        // Do not generate sample data
      }
    };

    // Try Firebase first
    try {
      const limit = getLimitForTimeframe(timeframe);
      console.log(`🌡️ Setting up Firebase subscription for global vitals, timeframe: ${timeframe}, limit: ${limit}`);
      unsub = subscribeToSensorData(
        (items) => {
          console.log(`✅ Received ${items.length} vitals items from Firebase (global sensor_data)`);
          firebaseAvailableRef.current = true;
          if (items.length > 0) {
            const normalized = items.map((r) => normalizeRecord(r));
            const smoothed = smoothReadings(normalized);
            lastFirebaseDataRef.current = smoothed;
            lastDataAtRef.current = Date.now();
            setIsStale(false);
          }

          // Throttle UI updates to selected cadence
          if (!firebaseIntervalRef.current) {
            firebaseIntervalRef.current = setInterval(() => {
              if (lastFirebaseDataRef.current) {
                setReadings(lastFirebaseDataRef.current);
              }
            }, updateMs);
          }
        },
        { last: limit }
      );
    } catch (e) {
      console.warn("⚠️ Firebase not available, using backend polling...");
      firebaseAvailableRef.current = false;
    }

    // Poll backend only if Firebase is unavailable - respects cadence
    if (!firebaseAvailableRef.current && !pollingRef.current) {
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, updateMs);
    }

    // Start staleness checker
    if (!staleCheckIntervalRef.current) {
      staleCheckIntervalRef.current = setInterval(() => {
        if (!lastDataAtRef.current) return;
        const age = Date.now() - lastDataAtRef.current;
        if (age > STALE_AFTER_MS) {
          setIsStale(true);
        }
      }, 1000);
    }

    return () => {
      if (unsub) unsub();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (firebaseIntervalRef.current) {
        clearInterval(firebaseIntervalRef.current);
        firebaseIntervalRef.current = null;
      }
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
        staleCheckIntervalRef.current = null;
      }
    };
  }, [timeframe, updateMs, isLiveMode]); // reconfigure when cadence changes (vitals are global, no auth required)

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log("🧹 [CLEANUP] Dashboard component unmounting - cleaning up all intervals");
      if (livePollingRef.current) {
        clearInterval(livePollingRef.current);
        livePollingRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (firebaseIntervalRef.current) {
        clearInterval(firebaseIntervalRef.current);
        firebaseIntervalRef.current = null;
      }
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
        staleCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Filter visible data based on timeframe
  const now = Date.now();
  const selectedWindowMs =
    TIMEFRAMES.find((t) => t.key === timeframe)?.ms ?? TIMEFRAMES[0].ms;

  const visibleData = useMemo(() => {
    const minTs = now - selectedWindowMs;
    
    // First, filter out readings with invalid timestamps
    const validReadings = readings.filter((r) => {
      const ts = Number(r.timestamp);
      return !isNaN(ts) && ts > 0;
    });
    
    // Then apply timeframe filtering
    const filtered = validReadings.filter((r) => {
      const ts = Number(r.timestamp);
      return ts >= minTs;
    });
    
    // Debug logging
    console.log(`Timeframe: ${timeframe}, Total readings: ${readings.length}, Valid readings: ${validReadings.length}, Filtered: ${filtered.length}`);
    console.log(`Time window: ${selectedWindowMs}ms, Min timestamp: ${minTs}, Now: ${now}`);
    if (validReadings.length > 0) {
      const latestTs = validReadings[validReadings.length - 1]?.timestamp;
      const oldestTs = validReadings[0]?.timestamp;
      const latestAge = now - latestTs;
      const oldestAge = now - oldestTs;
      
      console.log(`Latest reading timestamp: ${latestTs} (${Math.round(latestAge / 1000 / 60)} minutes ago)`);
      console.log(`Oldest reading timestamp: ${oldestTs} (${Math.round(oldestAge / 1000 / 60)} minutes ago)`);
      console.log(`Data spans: ${Math.round((latestTs - oldestTs) / 1000 / 60)} minutes`);
    }
    
    return filtered;
  }, [readings, now, selectedWindowMs, timeframe]);

  const latest = visibleData[visibleData.length - 1];

  // Calculate summary data
  const summaryData = useMemo(() => {
    if (visibleData.length === 0) {
      return {
        totalReadings: 0,
        avgHeartRate: null,
        avgSpo2: null,
        lastFallTime: null
      };
    }

    const validHeartRates = visibleData
      .map(r => r.heartRate)
      .filter(hr => hr !== null && hr !== undefined && !isNaN(hr));
    
    const validSpo2 = visibleData
      .map(r => r.spo2)
      .filter(spo2 => spo2 !== null && spo2 !== undefined && !isNaN(spo2));

    const fallEvents = visibleData
      .filter(r => r.fallDetected)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalReadings: visibleData.length,
      avgHeartRate: validHeartRates.length > 0 
        ? Math.round(validHeartRates.reduce((sum, hr) => sum + hr, 0) / validHeartRates.length)
        : null,
      avgSpo2: validSpo2.length > 0 
        ? Math.round(validSpo2.reduce((sum, spo2) => sum + spo2, 0) / validSpo2.length)
        : null,
      lastFallTime: fallEvents.length > 0 ? fallEvents[0].timestamp : null
    };
  }, [visibleData]);

  // Generate trend data for sparklines (last 8 readings)
  const getTrendData = (key) => {
    return visibleData.slice(-8).map(r => r[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
  };


  // Event handlers
  const handleEmergency = () => {
    console.log("🚨 [EMERGENCY] Manual emergency alert triggered");
    // Add emergency logic here
  };

  const handleCallCaregiver = () => {
    console.log("📞 [CARE] Call caregiver button clicked");
    console.log("📞 [CARE] Initiating call to:", CAREGIVER_CONTACT.phone);
    // Open phone dialer with caregiver number
    window.open(`tel:${CAREGIVER_CONTACT.phone}`, '_self');
  };

  const handleSendAlertSMS = async () => {
    if (emergencyAlert) {
      console.log("📱 [EMERGENCY] Manual SMS send requested");
      await sendEmergencySMS(emergencyAlert);
    }
  };

  const handleDismissEmergency = () => {
    console.log("❌ [EMERGENCY] Emergency alert dismissed");
    setEmergencyAlert(null);
    setSmsSent(false);
  };

  const handleViewMedications = () => {
    console.log("View medications triggered");
    // Add view medications logic here
  };

  const handleViewHistory = () => {
    console.log("View detailed history triggered");
    // Add view history logic here
  };

  // Helper functions for age-aware UI
  const getRangeLabel = (key, fallback) => {
    const threshold = ageAdjustedThresholds?.[key];
    if (
      threshold &&
      threshold.min !== undefined &&
      threshold.max !== undefined
    ) {
      const unit = threshold.unit ? ` ${threshold.unit}` : "";
      return `Normal range: ${threshold.min}-${threshold.max}${unit}`;
    }
    return fallback;
  };

  const getBloodPressureRangeLabel = () => {
    const systolic = ageAdjustedThresholds?.bloodPressureSystolic;
    const diastolic = ageAdjustedThresholds?.bloodPressureDiastolic;
    if (
      systolic?.min !== undefined &&
      systolic?.max !== undefined &&
      diastolic?.min !== undefined &&
      diastolic?.max !== undefined
    ) {
      return `Normal range: ${systolic.min}-${systolic.max}/${diastolic.min}-${diastolic.max} ${systolic.unit || "mmHg"}`;
    }
    return "Normal: <120/80 mmHg";
  };

  // Live mode toggle button
  const LiveModeToggle = () => (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-sm font-medium text-gray-700">Live Monitoring:</span>
      <button
        onClick={() => {
          setIsLiveMode(!isLiveMode);
          console.log(`🔄 Live mode ${!isLiveMode ? 'started' : 'stopped'}`);
        }}
        className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
          isLiveMode
            ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isLiveMode ? '🟢 Live (Stop)' : '▶️ Live (Start)'}
      </button>
      {isLiveMode && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-medium">LIVE</span>
          <span>• Polling every 10 seconds</span>
        </div>
      )}
    </div>
  );

  // Render main dashboard
  return (
    <div className="space-y-6">
      {/* Stale data warning */}
      {isStale && (
        <div className="flex items-center gap-2 rounded-lg bg-warning-100 text-warning-800 px-4 py-3 text-sm">
          <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
          No live data received recently. Displaying last known values.
        </div>
      )}

      {/* Age-based threshold banner */}
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          ageGroupInfo
            ? "bg-sky-50 border-sky-200 text-sky-900"
            : "bg-gray-50 border-gray-200 text-gray-700"
        }`}
      >
        {ageGroupInfo ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Using age-based thresholds for{" "}
              <span className="font-semibold">{ageGroupInfo.label}</span>
              {profileAgeLabel ? ` (profile age: ${profileAgeLabel})` : ""}.
            </span>
            <span className="text-xs text-sky-700">
              Update the Patient Profile age to refresh these ranges.
            </span>
          </div>
        ) : (
          <span>
            Add your age in the Patient Profile to personalize dashboard thresholds.
          </span>
        )}
      </div>

      {/* Live mode toggle */}
      <LiveModeToggle />

      {/* Emergency Alert Section */}
      {emergencyAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                🚨 Emergency Alert Detected
              </h3>
              <div className="text-red-700 mb-4">
                <p className="font-medium">
                  {emergencyAlert.parameter}: {emergencyAlert.value}{emergencyAlert.unit}
                </p>
                <p className="text-sm">
                  Threshold: {emergencyAlert.threshold} | 
                  Time: {new Date(emergencyAlert.timestamp).toLocaleString()}
                </p>
                {smsSent && (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ SMS sent to caregiver
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSendAlertSMS}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  📱 Send Alert SMS
                </button>
                <button
                  onClick={handleCallCaregiver}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  📞 Call Caregiver
                </button>
                <button
                  onClick={handleDismissEmergency}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  ❌ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeframe controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
        </div>
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                timeframe === t.key
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1">
            <span className="text-xs text-gray-600">Live</span>
            <button
              onClick={() => setLiveFast((v) => !v)}
              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                liveFast ? "bg-success-500 text-white" : "bg-gray-100 text-gray-700"
              }`}
              title={liveFast ? "Updating every 1s" : "Updating every 10s"}
            >
              {liveFast ? "1s" : "10s"}
            </button>
          </div>
          {/* Debug Button */}
          <button
            onClick={() => runAllFirebaseTests()}
            className="ml-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            🧪 Test Firebase
          </button>
        </div>
      </div>

      {/* Vitals Cards Grid - 2 rows x 4 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VitalsCard
          label="Heart Rate"
          value={latest?.heartRate}
          unit="BPM"
          status={evaluateStatus(
            Number(latest?.heartRate),
            ageAdjustedThresholds.heartRate
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel("heartRate", "Normal range: 60-100 BPM")}
          trendData={getTrendData('heartRate')}
        />
        <VitalsCard
          label="Blood Oxygen"
          value={latest?.spo2}
          unit="%"
          status={evaluateStatus(
            Number(latest?.spo2),
            ageAdjustedThresholds.spo2
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel("spo2", "Normal range: 95-100%")}
          trendData={getTrendData('spo2')}
        />
        <VitalsCard
          label="Temperature"
          value={latest?.bodyTemp}
          unit="°C"
          status={evaluateStatus(
            Number(latest?.bodyTemp),
            ageAdjustedThresholds.bodyTemp
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel("bodyTemp", "Normal range: 36.1-37.2°C")}
          trendData={getTrendData('bodyTemp')}
        />
        <VitalsCard
          label="Ambient Temp"
          value={latest?.ambientTemp}
          unit="°C"
          status={evaluateStatus(
            Number(latest?.ambientTemp),
            ageAdjustedThresholds.ambientTemp
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel("ambientTemp", "Environment sensor")}
          trendData={getTrendData('ambientTemp')}
        />
        <VitalsCard
          label="Acceleration Magnitude"
          value={latest?.accMagnitude}
          unit="g"
          status={evaluateStatus(
            Number(latest?.accMagnitude),
            ageAdjustedThresholds.accMagnitude
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel("accMagnitude", "Movement detection")}
          trendData={getTrendData('accMagnitude')}
        />
        <VitalsCard
          label="Fall Detected"
          value={latest?.fallDetected ? "Yes" : "No"}
          unit=""
          status={latest?.fallDetected ? "critical" : "normal"}
          timestamp={latest?.timestamp}
          normalRange="Fall detection system"
          fallDetected={latest?.fallDetected}
          lastFallTime={summaryData.lastFallTime}
        />
        <VitalsCard
          label="Blood Sugar"
          value={latest?.bloodSugar}
          unit="mg/dL"
          status={evaluateStatus(
            Number(latest?.bloodSugar),
            ageAdjustedThresholds.bloodSugar
          )}
          timestamp={latest?.timestamp}
          normalRange={getRangeLabel(
            "bloodSugar",
            "Normal range: 70-100 mg/dL (fasting)"
          )}
          trendData={getTrendData('bloodSugar')}
        />
        <VitalsCard
          label="Blood Pressure"
          value={
            latest?.bloodPressureSystolic && latest?.bloodPressureDiastolic
              ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}`
              : latest?.bloodPressureSystolic || latest?.bloodPressureDiastolic
              ? `${latest.bloodPressureSystolic || '--'}/${latest.bloodPressureDiastolic || '--'}`
              : null
          }
          unit="mmHg"
          status={
            latest?.bloodPressureSystolic && latest?.bloodPressureDiastolic
              ? evaluateStatus(
                  Number(latest.bloodPressureSystolic),
                  ageAdjustedThresholds.bloodPressureSystolic
                ) === 'critical' || evaluateStatus(
                  Number(latest.bloodPressureDiastolic),
                  ageAdjustedThresholds.bloodPressureDiastolic
                ) === 'critical'
                ? 'critical'
                : evaluateStatus(
                    Number(latest.bloodPressureSystolic),
                    ageAdjustedThresholds.bloodPressureSystolic
                  ) === 'warning' || evaluateStatus(
                    Number(latest.bloodPressureDiastolic),
                    ageAdjustedThresholds.bloodPressureDiastolic
                  ) === 'warning'
                  ? 'warning'
                  : 'normal'
              : 'unknown'
          }
          timestamp={latest?.timestamp}
          normalRange={getBloodPressureRangeLabel()}
          trendData={getTrendData('bloodPressureSystolic')}
        />
      </div>


      {/* Quick Actions and Summary Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickActions
            onEmergency={handleEmergency}
            onCallCaregiver={handleCallCaregiver}
            onViewMedications={handleViewMedications}
          />
        </div>
        <div>
          <SummaryCard
            total={summaryData.totalReadings}
            avgHeartRate={summaryData.avgHeartRate}
            avgSpo2={summaryData.avgSpo2}
            lastFallTime={summaryData.lastFallTime}
            onViewHistory={handleViewHistory}
          />
        </div>
      </div>


    </div>
  );
}
