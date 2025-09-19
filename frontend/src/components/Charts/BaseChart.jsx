import React, { useRef, useEffect } from 'react';

export default function BaseChart({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#0b74ff',
  title = '',
  subtitle = '',
  currentValue = null,
  unit = '',
  className = '',
  children
}) {
  const svgRef = useRef(null);

  // Format current value display
  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    if (typeof value === 'number') {
      return value.toFixed(value % 1 === 0 ? 0 : 1);
    }
    return value;
  };

  return (
    <div className={`bg-white rounded-card p-6 shadow-card border border-gray-200 ${className}`}>
      {/* Chart Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
          {currentValue !== null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(currentValue)}
                {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
              </div>
              <div className="text-xs text-gray-500">Current</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          {children}
        </svg>
      </div>
    </div>
  );
}

