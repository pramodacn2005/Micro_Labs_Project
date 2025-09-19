import React, { useRef, useEffect } from "react";

export default function LiveDataTable({ 
  data = [], 
  maxEntries = 20,
  className = ""
}) {
  const tableRef = useRef(null);

  // Auto-scroll to bottom when new data arrives
  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [data]);

  // Get recent entries (limit to maxEntries)
  const recentData = data.slice(-maxEntries).reverse();

  // Check if value is abnormal
  const isAbnormal = (value, type) => {
    if (value === null || value === undefined || isNaN(value)) return false;
    
    const thresholds = {
      heartRate: { min: 60, max: 100 },
      spo2: { min: 95, max: 100 },
      bodyTemp: { min: 36.1, max: 37.2 },
      ambientTemp: { min: 15, max: 35 },
      accMagnitude: { min: 0.5, max: 2.0 }
    };
    
    const threshold = thresholds[type];
    if (!threshold) return false;
    
    return value < threshold.min || value > threshold.max;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format value
  const formatValue = (value, type) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    
    if (type === 'fallDetected' || type === 'alerted') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      return value.toFixed(value % 1 === 0 ? 0 : 1);
    }
    
    return value;
  };

  // Get unit for each type
  const getUnit = (type) => {
    const units = {
      heartRate: 'BPM',
      spo2: '%',
      bodyTemp: '°C',
      ambientTemp: '°C',
      accMagnitude: 'g',
      fallDetected: '',
      alerted: ''
    };
    return units[type] || '';
  };

  return (
    <section className={`bg-white rounded-card p-6 shadow-card border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">📊</span>
        <h2 className="text-lg font-semibold text-gray-900">Live Data Feed</h2>
      </div>
      
      <p className="mb-4 text-sm text-gray-600">
        Real-time data log for advanced monitoring
      </p>

      {/* Table */}
      <div 
        ref={tableRef}
        className="overflow-x-auto border border-gray-200 rounded-lg"
        style={{ maxHeight: '400px', overflowY: 'auto' }}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Heart Rate</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">SpO₂</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Body Temp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Ambient Temp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Acceleration</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Fall</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Alert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {recentData.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              recentData.map((reading, index) => (
                <tr 
                  key={`${reading.timestamp}-${index}`}
                  className={`hover:bg-gray-50 ${
                    reading.fallDetected || reading.alerted 
                      ? 'bg-red-50' 
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {formatTimestamp(reading.timestamp)}
                  </td>
                  <td className={`px-4 py-3 ${
                    isAbnormal(reading.heartRate, 'heartRate') 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.heartRate, 'heartRate')} {getUnit('heartRate')}
                  </td>
                  <td className={`px-4 py-3 ${
                    isAbnormal(reading.spo2, 'spo2') 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.spo2, 'spo2')} {getUnit('spo2')}
                  </td>
                  <td className={`px-4 py-3 ${
                    isAbnormal(reading.bodyTemp, 'bodyTemp') 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.bodyTemp, 'bodyTemp')} {getUnit('bodyTemp')}
                  </td>
                  <td className={`px-4 py-3 ${
                    isAbnormal(reading.ambientTemp, 'ambientTemp') 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.ambientTemp, 'ambientTemp')} {getUnit('ambientTemp')}
                  </td>
                  <td className={`px-4 py-3 ${
                    isAbnormal(reading.accMagnitude, 'accMagnitude') 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.accMagnitude, 'accMagnitude')} {getUnit('accMagnitude')}
                  </td>
                  <td className={`px-4 py-3 ${
                    reading.fallDetected 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.fallDetected, 'fallDetected')}
                  </td>
                  <td className={`px-4 py-3 ${
                    reading.alerted 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-900'
                  }`}>
                    {formatValue(reading.alerted, 'alerted')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {data.length > 0 ? `Showing last ${Math.min(maxEntries, recentData.length)} of ${data.length} readings` : 'No readings'}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>
    </section>
  );
}

