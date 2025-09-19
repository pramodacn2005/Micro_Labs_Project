import React, { useEffect, useMemo, useState, useRef } from "react";
import VitalChart from "../components/VitalChart";
import LiveDataTable from "../components/LiveDataTable";
import LiveDataIndicator from "../components/LiveDataIndicator";
import ControlBar from "../components/ControlBar";
import TimeFilterDropdown from "../components/TimeFilterDropdown";
import {
  subscribeToSensorData,
  DEFAULT_THRESHOLDS,
  evaluateStatus,
  getLimitForTimeframe,
} from "../services/firebaseService";

const TIMEFRAME_OPTIONS = [
  { value: "5m", label: "5 min", ms: 5 * 60 * 1000 },
  { value: "15m", label: "15 min", ms: 15 * 60 * 1000 },
  { value: "30m", label: "30 min", ms: 30 * 60 * 1000 },
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "2h", label: "2 hours", ms: 2 * 60 * 60 * 1000 },
  { value: "4h", label: "4 hours", ms: 4 * 60 * 60 * 1000 },
];

export default function LiveMonitoring() {
  const [readings, setReadings] = useState([]);
  const [timeframe, setTimeframe] = useState("15m");
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(5000); // 5 seconds
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const pollingRef = useRef(null);
  const lastFirebaseDataRef = useRef(null);
  const firebaseIntervalRef = useRef(null);
  const firebaseAvailableRef = useRef(false);

  // Get timeframe configuration
  const selectedTimeframe = TIMEFRAME_OPTIONS.find(t => t.value === timeframe) || TIMEFRAME_OPTIONS[1];

  // Data smoothing function
  function smoothReadings(newReadings) {
    if (newReadings.length === 0) return newReadings;
    
    const smoothed = [...newReadings];
    const windowSize = Math.min(3, newReadings.length);
    
    for (let i = newReadings.length - 1; i >= Math.max(0, newReadings.length - windowSize); i--) {
      const current = newReadings[i];
      const prev = newReadings[i - 1];
      
      if (prev) {
        // Smooth heart rate
        if (current.heartRate && prev.heartRate) {
          const hrDiff = Math.abs(current.heartRate - prev.heartRate);
          if (hrDiff > 20) {
            smoothed[i].heartRate = prev.heartRate + (current.heartRate - prev.heartRate) * 0.3;
          }
        }
        
        // Smooth SpO2
        if (current.spo2 && prev.spo2) {
          const spo2Diff = Math.abs(current.spo2 - prev.spo2);
          if (spo2Diff > 5) {
            smoothed[i].spo2 = prev.spo2 + (current.spo2 - prev.spo2) * 0.2;
          }
        }
        
        // Smooth body temperature
        if (current.bodyTemp && prev.bodyTemp) {
          const tempDiff = Math.abs(current.bodyTemp - prev.bodyTemp);
          if (tempDiff > 0.5) {
            smoothed[i].bodyTemp = prev.bodyTemp + (current.bodyTemp - prev.bodyTemp) * 0.3;
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
    if (tsMs < minReasonableMs || tsMs > maxReasonableMs) {
      tsMs = nowMs;
    }

    const pickFirst = (...keys) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== "") return r[k];
      }
      return null;
    };

    let heartRateRaw = pickFirst("heartRate", "HeartRate", "hr", "heart_rate", "pulse", "bpm", "heart");
    let spo2Raw = pickFirst("spo2", "SpO2", "SPO2", "SpO₂", "oxygen", "oxygenSaturation", "o2", "oximeter");
    let bodyTempRaw = pickFirst("bodyTemp", "BodyTemp", "body_temperature", "body_temperature_c", "temperature", "Temperature", "temp", "temp_c");
    let ambientTempRaw = pickFirst("ambientTemp", "AmbientTemp", "ambient_temperature", "ambient_temperature_c");
    let accMagnitudeRaw = pickFirst("accMagnitude", "AccMagnitude", "acceleration_magnitude", "acc_magnitude");
    let fallDetectedRaw = pickFirst("fallDetected", "FallDetected", "fall_detected");
    let alertedRaw = pickFirst("alerted", "Alerted", "alert_active");

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const toBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
      return Boolean(v);
    };

    let heartRate = toNum(heartRateRaw);
    let spo2 = toNum(spo2Raw);
    let bodyTemp = toNum(bodyTempRaw);
    let ambientTemp = toNum(ambientTempRaw);
    let accMagnitude = toNum(accMagnitudeRaw);
    let fallDetected = toBool(fallDetectedRaw);
    let alerted = toBool(alertedRaw);

    // Convert Fahrenheit to Celsius if needed
    if (bodyTemp !== null && bodyTemp > 45 && bodyTemp < 120) {
      bodyTemp = Number(((bodyTemp - 32) * 5 / 9).toFixed(1));
    }

    return {
      ...r,
      timestamp: tsMs,
      heartRate,
      spo2,
      bodyTemp,
      ambientTemp,
      accMagnitude,
      fallDetected,
      alerted,
    };
  }

  // Fetch sensor data
  useEffect(() => {
    let unsub = null;
    
    const fetchData = async () => {
      try {
        const limit = getLimitForTimeframe(timeframe);
        const res = await fetch(`${backendUrl}/api/vitals/history?limit=${limit}&timeframe=${timeframe}`);
        if (!res.ok) return;
        
        const json = await res.json();
        const items = json.items || [];
        
        if (items.length === 0) return;
        
        const normalized = items.map(normalizeRecord);
        const smoothed = smoothReadings(normalized);
        setReadings(smoothed);
      } catch (err) {
        console.error("Backend fetch failed:", err);
      }
    };

    // Try Firebase first
    try {
      const limit = getLimitForTimeframe(timeframe);
      unsub = subscribeToSensorData(
        (items) => {
          firebaseAvailableRef.current = true;
          if (items.length > 0) {
            const normalized = items.map(normalizeRecord);
            const smoothed = smoothReadings(normalized);
            lastFirebaseDataRef.current = smoothed;
          }

          if (!firebaseIntervalRef.current) {
            firebaseIntervalRef.current = setInterval(() => {
              if (lastFirebaseDataRef.current) {
                setReadings(lastFirebaseDataRef.current);
              }
            }, updateInterval);
          }
        },
        { last: limit }
      );
    } catch (e) {
      console.warn("Firebase not available, using backend polling...");
      firebaseAvailableRef.current = false;
    }

    // Poll backend if Firebase is unavailable
    if (!firebaseAvailableRef.current && !pollingRef.current) {
      fetchData();
      pollingRef.current = setInterval(fetchData, updateInterval);
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
    };
  }, [timeframe, updateInterval, backendUrl]);

  // Filter visible data based on timeframe
  const now = Date.now();
  const selectedWindowMs = selectedTimeframe.ms;

  const visibleData = useMemo(() => {
    const minTs = now - selectedWindowMs;
    
    const validReadings = readings.filter((r) => {
      const ts = Number(r.timestamp);
      return !isNaN(ts) && ts > 0;
    });
    
    const filtered = validReadings.filter((r) => {
      const ts = Number(r.timestamp);
      return ts >= minTs;
    });
    
    return filtered;
  }, [readings, now, selectedWindowMs]);

  const latest = visibleData[visibleData.length - 1];

  // Generate chart data for each vital (last 20 readings for better visualization)
  const getChartData = (key) => {
    return visibleData.slice(-20).map(r => r[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
  };

  // Generate timestamps for chart data
  const getChartTimestamps = () => {
    return visibleData.slice(-20).map(r => r.timestamp);
  };

  // Get status for a specific vital
  const getVitalStatus = (key) => {
    if (!latest) return 'unknown';
    return evaluateStatus(Number(latest[key]), DEFAULT_THRESHOLDS[key] || { min: 0, max: 100 });
  };

  // Event handlers
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  const handleSimulateOffline = (simulated) => {
    setIsOfflineSimulated(simulated);
    setIsOnline(!simulated);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(visibleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitals-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFullScreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Monitoring</h1>
          <p className="text-lg text-gray-600">Real-time trends of vital signs</p>
          </div>

          <div className="flex items-center gap-4">
          <TimeFilterDropdown
            value={timeframe}
            onChange={handleTimeframeChange}
            options={TIMEFRAME_OPTIONS}
          />
          
          {/* Live Data Indicator */}
          <LiveDataIndicator
            isOnline={isOnline}
            lastUpdate={latest?.timestamp}
            updateInterval={updateInterval}
          />
          
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <span className="text-lg">🔔</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
        </div>
        </div>

      {/* Charts Grid - 2 charts per row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Row 1: Heart Rate & Blood Oxygen */}
        <VitalChart
            type="heartRate"
          data={getChartData('heartRate')}
          currentValue={latest?.heartRate}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={getVitalStatus('heartRate')}
        />
        
        <VitalChart
            type="spo2"
          data={getChartData('spo2')}
          currentValue={latest?.spo2}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={getVitalStatus('spo2')}
        />
        
        {/* Row 2: Body Temperature & Ambient Temperature */}
        <VitalChart
            type="bodyTemp"
          data={getChartData('bodyTemp')}
          currentValue={latest?.bodyTemp}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={getVitalStatus('bodyTemp')}
        />
        
        <VitalChart
            type="ambientTemp"
          data={getChartData('ambientTemp')}
          currentValue={latest?.ambientTemp}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={getVitalStatus('ambientTemp')}
        />
        
        {/* Row 3: Acceleration Magnitude & Fall Detection */}
        <VitalChart
            type="accMagnitude"
          data={getChartData('accMagnitude')}
          currentValue={latest?.accMagnitude}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={getVitalStatus('accMagnitude')}
        />
        
        <VitalChart
            type="fallDetected"
          data={getChartData('fallDetected')}
          currentValue={latest?.fallDetected}
          width={600}
          height={300}
          timestamps={getChartTimestamps()}
          status={latest?.fallDetected ? 'critical' : 'normal'}
        />
        
        {/* Row 4: Alert Status (centered) */}
        <div className="xl:col-span-2 flex justify-center">
          <div className="w-full max-w-2xl">
            <VitalChart
              type="alerted"
              data={getChartData('alerted')}
              currentValue={latest?.alerted}
              width={800}
              height={300}
              timestamps={getChartTimestamps()}
              status={latest?.alerted ? 'critical' : 'normal'}
            />
          </div>
        </div>
      </div>

      {/* Live Data Status Bar */}
      <div className="bg-white rounded-card p-4 shadow-card border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LiveDataIndicator
              isOnline={isOnline}
              lastUpdate={latest?.timestamp}
              updateInterval={updateInterval}
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Total readings: {visibleData.length}</span>
            <span>•</span>
            <span>Time range: {selectedTimeframe.label}</span>
            <span>•</span>
            <span>Update frequency: {updateInterval / 1000}s</span>
          </div>
        </div>
        </div>

      {/* Live Data Table */}
      <LiveDataTable
        data={visibleData}
        maxEntries={20}
      />

        {/* Control Bar */}
        <ControlBar
        onSimulateOffline={handleSimulateOffline}
        onExportData={handleExportData}
        onFullScreen={handleFullScreen}
        isOnline={isOnline}
        />
      </div>
  );
}