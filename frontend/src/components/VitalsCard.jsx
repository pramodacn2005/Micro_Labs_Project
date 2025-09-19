import React from "react";
import SparklineChart from "./Charts/SparklineChart";
import { getStatusColors, designTokens } from "../config/designTokens";

export default function VitalsCard({ 
  label, 
  value, 
  unit, 
  status, 
  timestamp, 
  icon,
  normalRange,
  trendData = [],
  isAlerted = false,
  fallDetected = false,
  lastFallTime = null
}) {
  const statusColors = getStatusColors(status);
  const isDisabled = value === null || value === undefined || isNaN(value);
  
  // Get appropriate icon based on label or provided icon
  const getIcon = () => {
    if (icon) return icon;
    const iconMap = {
      'Heart Rate': '❤️',
      'SpO₂': '🫁', 
      'Blood Oxygen': '🫁',
      'Body Temp': '🌡️',
      'Temperature': '🌡️',
      'Ambient Temp': '🌡️',
      'Acceleration Magnitude': '📊',
      'Fall Detected': '⚠️'
    };
    return iconMap[label] || '📊';
  };

  // Get status text based on special conditions
  const getStatusText = () => {
    if (fallDetected) return 'Fall Detected';
    if (isAlerted) return 'Alerted';
    if (isDisabled) return 'No Data';
    return status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical';
  };

  // Format value display
  const formatValue = () => {
    if (isDisabled) return '—';
    if (typeof value === 'number') {
      return value.toFixed(value % 1 === 0 ? 0 : 1);
    }
    return value;
  };

  // Get card styling based on status
  const getCardClasses = () => {
    const baseClasses = "bg-white rounded-card p-4 shadow-card border transition-all duration-200";
    const statusClasses = {
      normal: "border-gray-200",
      warning: "border-warning-300",
      critical: "border-danger-300 shadow-glow",
      unknown: "border-gray-300"
    };
    return `${baseClasses} ${statusClasses[status] || statusClasses.unknown}`;
  };

  return (
    <div className={getCardClasses()}>
      {/* Header with label, icon, and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {getIcon()}
          </span>
          <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {trendData.length > 0 && (
            <SparklineChart 
              data={trendData} 
              width={40} 
              height={16} 
              color={status === 'normal' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444'}
            />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors.pill}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Main value display */}
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-3xl font-bold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {formatValue()}
        </span>
        {unit && (
          <span className="text-sm text-gray-600 mb-1">{unit}</span>
        )}
      </div>

      {/* Footer with normal range and timestamp */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {normalRange || (isDisabled ? 'No data available' : '')}
        </span>
        <span>
          {timestamp ? new Date(timestamp).toLocaleTimeString() : '--:--'}
        </span>
      </div>

      {/* Special indicators */}
      {fallDetected && lastFallTime && (
        <div className="mt-2 text-xs text-danger-600 font-medium">
          Last fall: {new Date(lastFallTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}


