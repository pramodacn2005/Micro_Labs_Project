import React, { useEffect, useMemo, useState, useRef } from "react";
import VitalsCard from "./VitalsCard";
import ChartComponent from "./ChartComponent";
import AlertPopup from "./AlertPopup";
import {
  subscribeToSensorData,
  DEFAULT_THRESHOLDS,
  evaluateStatus,
} from "../services/firebaseService";

const TIMEFRAMES = [
  { key: "15m", label: "15 min", ms: 15 * 60 * 1000 },
  { key: "24h", label: "24 h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

export default function Dashboard() {
  const [readings, setReadings] = useState([]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0].key);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessages, setAlertMessages] = useState([]);
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const pollingRef = useRef(null);

  // Fetch sensor data (Firebase first, fallback to backend polling)
  useEffect(() => {
    let unsub = null;
    try {
      unsub = subscribeToSensorData(
        (items) => {
          const normalized = items.map((r) => {
            const ts = Number(r.timestamp);
            const tsMs = ts && ts < 10 ** 12 ? ts * 1000 : ts; // normalize timestamp
            return { ...r, timestamp: tsMs };
          });
          setReadings(normalized);
        },
        { last: 500 }
      );
    } catch (e) {
      console.warn("⚠️ Firebase not available, using backend polling...");
    }

    // Poll backend if Firebase unavailable
    if (!pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${backendUrl}/api/vitals/history?limit=500`);
          if (!res.ok) return;
          const json = await res.json();
          const items = json.items || [];
          const normalized = items.map((r) => {
            const ts = Number(r.timestamp);
            const tsMs = ts && ts < 10 ** 12 ? ts * 1000 : ts;
            return { ...r, timestamp: tsMs };
          });
          setReadings(normalized);
        } catch (err) {
          console.error("Backend fetch failed:", err);
        }
      }, 5000);
    }

    return () => {
      if (unsub) unsub();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Filter visible data based on timeframe
  const now = Date.now();
  const selectedWindowMs =
    TIMEFRAMES.find((t) => t.key === timeframe)?.ms ?? TIMEFRAMES[0].ms;

  const visibleData = useMemo(() => {
    const minTs = now - selectedWindowMs;
    return readings.filter((r) => (r.timestamp ?? 0) >= minTs);
  }, [readings, now, selectedWindowMs]);

  const latest = visibleData[visibleData.length - 1];

  // Alert popup logic
  useEffect(() => {
    if (!latest) return;
    const messages = [];
    const hrStatus = evaluateStatus(
      Number(latest.heartRate),
      DEFAULT_THRESHOLDS.heartRate
    );
    const spo2Status = evaluateStatus(
      Number(latest.spo2),
      DEFAULT_THRESHOLDS.spo2
    );
    const btStatus = evaluateStatus(
      Number(latest.bodyTemp),
      DEFAULT_THRESHOLDS.bodyTemp
    );
    const atStatus = evaluateStatus(
      Number(latest.ambientTemp),
      DEFAULT_THRESHOLDS.ambientTemp
    );
    const accStatus = evaluateStatus(
      Number(latest.accMagnitude),
      DEFAULT_THRESHOLDS.accMagnitude
    );

    if (hrStatus !== "normal") messages.push("Heart rate abnormal");
    if (spo2Status !== "normal") messages.push("SpO₂ below normal");
    if (btStatus !== "normal") messages.push("Body temperature abnormal");
    if (atStatus !== "normal")
      messages.push("Ambient temperature out of range");
    if (accStatus !== "normal")
      messages.push("Abnormal acceleration magnitude");
    if (latest.fallDetected) messages.push("Fall detected");

    setAlertMessages(messages);
    setAlertOpen(messages.length > 0);
  }, [latest]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">IoT Health Dashboard</h1>
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={`rounded px-3 py-1 text-sm ${
                timeframe === t.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vitals Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <VitalsCard
          label="Heart Rate"
          value={latest?.heartRate}
          unit="bpm"
          status={evaluateStatus(
            Number(latest?.heartRate),
            DEFAULT_THRESHOLDS.heartRate
          )}
          timestamp={latest?.timestamp}
        />
        <VitalsCard
          label="SpO₂"
          value={latest?.spo2}
          unit="%"
          status={evaluateStatus(
            Number(latest?.spo2),
            DEFAULT_THRESHOLDS.spo2
          )}
          timestamp={latest?.timestamp}
        />
        <VitalsCard
          label="Body Temp"
          value={latest?.bodyTemp}
          unit="°C"
          status={evaluateStatus(
            Number(latest?.bodyTemp),
            DEFAULT_THRESHOLDS.bodyTemp
          )}
          timestamp={latest?.timestamp}
        />
        <VitalsCard
          label="Ambient Temp"
          value={latest?.ambientTemp}
          unit="°C"
          status={evaluateStatus(
            Number(latest?.ambientTemp),
            DEFAULT_THRESHOLDS.ambientTemp
          )}
          timestamp={latest?.timestamp}
        />
        <VitalsCard
          label="Acceleration Magnitude"
          value={latest?.accMagnitude}
          unit="g"
          status={evaluateStatus(
            Number(latest?.accMagnitude),
            DEFAULT_THRESHOLDS.accMagnitude
          )}
          timestamp={latest?.timestamp}
        />
        <VitalsCard
          label="Fall Detected"
          value={latest?.fallDetected ? "Yes" : "No"}
          unit=""
          status={latest?.fallDetected ? "critical" : "normal"}
          timestamp={latest?.timestamp}
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <ChartComponent
          data={visibleData}
          lines={[
            { key: "heartRate", label: "Heart Rate", color: "#2563eb" },
            { key: "spo2", label: "SpO₂", color: "#16a34a" },
          ]}
        />
        <ChartComponent
          data={visibleData}
          lines={[
            { key: "bodyTemp", label: "Body Temp", color: "#dc2626" },
            { key: "ambientTemp", label: "Ambient Temp", color: "#ea580c" },
          ]}
        />
        <ChartComponent
          data={visibleData}
          lines={[
            {
              key: "accMagnitude",
              label: "Acceleration Magnitude",
              color: "#7c3aed",
            },
          ]}
        />
      </div>

      {/* Alerts */}
      <AlertPopup
        visible={alertOpen}
        messages={alertMessages}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}
