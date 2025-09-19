import React from 'react';

export default function MiniChart({ 
  data = [], 
  width = 60, 
  height = 32, 
  color = '#0b74ff',
  type = 'line',
  strokeWidth = 2
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
  
  if (type === 'bar') {
    // Bar chart implementation
    const barWidth = width / data.length;
    const maxBarHeight = height - 4; // Leave some padding
    
    return (
      <div 
        className="flex items-end justify-between"
        style={{ width, height }}
        aria-label={`Bar chart showing ${data.length} data points`}
      >
        {data.map((value, index) => {
          const barHeight = (value - min) / range * maxBarHeight;
          return (
            <div
              key={index}
              className="flex-shrink-0"
              style={{
                width: `${barWidth - 1}px`,
                height: `${barHeight}px`,
                backgroundColor: color,
                borderRadius: '1px'
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
    );
  }

  // Line chart implementation (default)
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 2);
    const y = height - 2 - ((value - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div 
      className="flex items-center justify-center"
      style={{ width, height }}
      aria-label={`Line chart showing ${data.length} data points`}
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

