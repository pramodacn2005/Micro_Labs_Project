import React from 'react';

export default function SparklineChart({ 
  data = [], 
  width = 60, 
  height = 20, 
  color = '#0b74ff',
  strokeWidth = 1.5 
}) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400"
        style={{ width, height }}
        aria-label="No data available"
      >
        —
      </div>
    );
  }

  // Normalize data to fit within the chart bounds
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 2);
    const y = height - 2 - ((value - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div 
      className="flex items-center justify-center"
      style={{ width, height }}
      aria-label={`Trend chart showing ${data.length} data points`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}