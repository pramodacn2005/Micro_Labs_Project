import React, { useState, useEffect, useRef } from 'react';
import { getStatusColors } from '../../config/designTokens';

export default function Tooltip({ 
  visible = false,
  x = 0,
  y = 0,
  data = null,
  vitalType = '',
  unit = '',
  timestamp = null,
  status = 'normal',
  className = ''
}) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ x, y });
  const [isVisible, setIsVisible] = useState(visible);

  // Update position when props change
  useEffect(() => {
    setPosition({ x, y });
  }, [x, y]);

  // Handle visibility with animation
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!isVisible || !data) return null;

  // Format the value based on vital type
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

  // Get vital name and icon
  const getVitalInfo = (type) => {
    const vitals = {
      heartRate: { name: 'Heart Rate', icon: '❤️' },
      spo2: { name: 'Blood Oxygen', icon: '🫁' },
      bodyTemp: { name: 'Body Temperature', icon: '🌡️' },
      ambientTemp: { name: 'Ambient Temperature', icon: '🌡️' },
      accMagnitude: { name: 'Acceleration Magnitude', icon: '📊' },
      fallDetected: { name: 'Fall Detection', icon: '⚠️' },
      alerted: { name: 'Alert Status', icon: '🚨' },
      bloodSugar: { name: 'Blood Sugar', icon: '🩸' },
      bloodPressure: { name: 'Blood Pressure', icon: '🩺' },
      bloodPressureSystolic: { name: 'Blood Pressure (Systolic)', icon: '🩺' },
      bloodPressureDiastolic: { name: 'Blood Pressure (Diastolic)', icon: '🩺' }
    };
    return vitals[type] || { name: 'Vital Sign', icon: '📊' };
  };

  // Format timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString();
  };

  // Get status colors
  const statusColors = getStatusColors(status);
  const vitalInfo = getVitalInfo(vitalType);
  const formattedValue = formatValue(data, vitalType);

  return (
    <div
      ref={tooltipRef}
      className={`fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } ${className}`}
      style={{
        left: position.x,
        top: position.y - 10,
      }}
    >
      <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-lg border border-gray-700 min-w-[200px]">
        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        
        {/* Content */}
        <div className="space-y-1">
          {/* Vital name with icon */}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{vitalInfo.icon}</span>
            <span>{vitalInfo.name}</span>
          </div>
          
          {/* Value with unit */}
          <div className="text-lg font-bold">
            {formattedValue}
            {unit && <span className="text-sm text-gray-300 ml-1">{unit}</span>}
          </div>
          
          {/* Timestamp */}
          <div className="text-xs text-gray-300 font-mono">
            {formatTimestamp(timestamp)}
          </div>
          
          {/* Status */}
          {status && status !== 'unknown' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors.pill}`}>
                {status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
