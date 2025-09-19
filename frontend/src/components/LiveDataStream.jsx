import React, { useEffect, useRef } from "react";

export default function LiveDataStream({ 
  data = [], 
  maxEntries = 50,
  updateInterval = 5000 
}) {
  const streamRef = useRef(null);

  // Auto-scroll to bottom when new data arrives
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [data]);

  // Format individual reading
  const formatReading = (reading) => {
    const timestamp = new Date(reading.timestamp).toLocaleTimeString();
    const heartRate = reading.heartRate ? `♡ ${reading.heartRate} BPM` : '♡ -- BPM';
    const spo2 = reading.spo2 ? `≈ ${reading.spo2}%` : '≈ --%';
    const bodyTemp = reading.bodyTemp ? `🌡️ ${reading.bodyTemp}°C` : '🌡️ --°C';
    const ambientTemp = reading.ambientTemp ? `🌡️ ${reading.ambientTemp}°C` : '';
    const accMagnitude = reading.accMagnitude ? `📊 ${reading.accMagnitude}g` : '';
    
    // Add alert indicators
    const alerts = [];
    if (reading.fallDetected) alerts.push('⚠️ FALL');
    if (reading.alerted) alerts.push('🚨 ALERT');
    
    return {
      timestamp,
      vitals: [heartRate, spo2, bodyTemp, ambientTemp, accMagnitude].filter(Boolean).join(' '),
      alerts: alerts.join(' ')
    };
  };

  // Get recent entries (limit to maxEntries)
  const recentData = data.slice(-maxEntries).reverse();

  return (
    <section className="bg-white rounded-card p-6 shadow-card border border-gray-200">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">📡</span>
        <h2 className="text-lg font-semibold text-gray-900">Live Data Stream</h2>
      </div>
      
      <p className="mb-4 text-sm text-gray-600">
        Real-time vital signs feed - Updates every {updateInterval / 1000} seconds
      </p>

      {/* Stream container */}
      <div 
        ref={streamRef}
        className="h-64 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-3 font-mono text-sm"
        aria-label="Live data stream"
      >
        {recentData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No data available
          </div>
        ) : (
          <div className="space-y-1">
            {recentData.map((reading, index) => {
              const formatted = formatReading(reading);
              return (
                <div 
                  key={`${reading.timestamp}-${index}`}
                  className={`flex items-center justify-between py-1 px-2 rounded ${
                    reading.fallDetected || reading.alerted 
                      ? 'bg-red-50 border-l-4 border-red-400' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-medium">
                      {formatted.timestamp}
                    </span>
                    <span className="text-gray-800">
                      {formatted.vitals}
                    </span>
                  </div>
                  {formatted.alerts && (
                    <span className="text-danger-600 font-semibold text-xs">
                      {formatted.alerts}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stream status indicator */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {data.length > 0 ? `${data.length} total readings` : 'No readings'}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>
    </section>
  );
}