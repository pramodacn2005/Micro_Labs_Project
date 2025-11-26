import React from "react";
import MiniChart from "./Charts/MiniChart";
import { getStatusColors, designTokens } from "../config/designTokens";

export default function LiveVitalsCard({ 
  label, 
  value, 
  unit, 
  status, 
  timestamp, 
  icon,
  chartData = [],
  chartColor = "#0b74ff",
  chartType = "line",
  isAlerted = false,
  fallDetected = false,
  lastFallTime = null,
  isBoolean = false
}) {
  const statusColors = getStatusColors(status);
  const isDisabled = value === null || value === undefined || isNaN(value);
  
  // Get appropriate icon based on label or provided icon
  const getIcon = () => {
    if (icon) return icon;
    const iconMap = {
      'Heart Rate': '❤️',
      'Blood Oxygen': '🫁', 
      'SpO₂': '🫁',
      'Body Temperature': '🌡️',
      'Temperature': '🌡️',
      'Ambient Temperature': '🌡️',
      'Acceleration Magnitude': '📊',
      'Fall Detected': '⚠️',
      'Alerted': '🚨',
      'Blood Sugar': '🩸',
      'Blood Glucose': '🩸',
      'Blood Pressure': '🩺',
      'BP': '🩺'
    };
    return iconMap[label] || '📊';
  };

  // Get status text based on special conditions
  const getStatusText = () => {
    if (fallDetected) return 'Fall Detected';
    if (isAlerted) return 'Alert Active';
    if (isDisabled) return 'No Data';
    return status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical';
  };

  // Format value display
  const formatValue = () => {
    if (isDisabled) return '—';
    if (isBoolean) {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toFixed(value % 1 === 0 ? 0 : 1);
    }
    return value;
  };

  // Get card styling based on status and special conditions
  const getCardClasses = () => {
    const baseClasses = "bg-white rounded-card p-4 shadow-card border transition-all duration-200";
    const statusClasses = {
      normal: "border-gray-200",
      warning: "border-warning-300",
      critical: "border-danger-300 shadow-glow",
      unknown: "border-gray-300"
    };
    
    // Special styling for fall detection
    if (fallDetected) {
      return `${baseClasses} border-danger-300 shadow-glow bg-red-50`;
    }
    
    return `${baseClasses} ${statusClasses[status] || statusClasses.unknown}`;
  };

  // Get accent color for chart
  const getChartColor = () => {
    if (fallDetected || isAlerted) return '#ef4444';
    return chartColor;
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
          {chartData.length > 0 && (
            <div className="w-16 h-8">
              <MiniChart 
                data={chartData} 
                color={getChartColor()}
                type={chartType}
                height={32}
              />
            </div>
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

      {/* Footer with timestamp */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Last updated: {timestamp ? new Date(timestamp).toLocaleTimeString() : '--:--'}</span>
        {fallDetected && lastFallTime && (
          <span className="text-danger-600 font-medium">
            Last fall: {new Date(lastFallTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Alert indicator overlay */}
      {isAlerted && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-danger-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}