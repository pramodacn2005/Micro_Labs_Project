import React from "react";

export default function SummaryCard({ 
  total = 0, 
  avgHeartRate = null, 
  avgSpo2 = null, 
  lastFallTime = null,
  onViewHistory 
}) {
  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return `${value}${unit}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString();
  };

  return (
    <section className="bg-white rounded-card p-6 shadow-card border border-gray-200">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">📈</span>
        <h2 className="text-lg font-semibold text-gray-900">Today's Summary</h2>
      </div>
      
      <p className="mb-6 text-sm text-gray-600">
        Your health metrics for today
      </p>

      {/* Metrics */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Readings today</span>
          <span className="text-sm font-semibold text-gray-900">{total}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Avg Heart Rate</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatValue(avgHeartRate, ' BPM')}
          </span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Avg SpO₂</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatValue(avgSpo2, '%')}
          </span>
        </div>
        
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-gray-700">Last fall time</span>
          <span className={`text-sm font-semibold ${
            lastFallTime ? 'text-danger-600' : 'text-gray-900'
          }`}>
            {formatTime(lastFallTime)}
          </span>
        </div>
      </div>

      {/* Action button */}
      <button 
        onClick={onViewHistory}
        className="w-full rounded-lg border border-gray-300 py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-colors duration-200"
      >
        View Detailed History
      </button>
    </section>
  );
}


