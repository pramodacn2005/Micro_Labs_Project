import React, { useEffect, useRef, useState, useCallback } from 'react';

const RealtimeGraph = ({ 
  data = [], 
  dataKey = 'heartRate', 
  title = 'Heart Rate', 
  unit = 'BPM',
  color = '#ef4444',
  height = 300,
  showTooltip = true 
}) => {
  const canvasRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Process data for graphing with live scrolling behavior
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const processed = data
      .map(reading => ({
        x: reading.timestamp,
        y: reading[dataKey] || 0,
        original: reading
      }))
      .filter(point => point.y > 0) // Filter out invalid values
      .sort((a, b) => a.x - b.x); // Sort by timestamp

    // For live mode, keep only the last 50 points to enable scrolling effect
    const maxPoints = 50;
    if (processed.length > maxPoints) {
      return processed.slice(-maxPoints);
    }
    
    return processed;
  }, [data, dataKey]);

  // Draw the graph
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || processedData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = height + 'px';

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    if (processedData.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', rect.width / 2, height / 2);
      return;
    }

    // Calculate bounds with some padding for better visualization
    const minX = Math.min(...processedData.map(d => d.x));
    const maxX = Math.max(...processedData.map(d => d.x));
    const minY = Math.min(...processedData.map(d => d.y));
    const maxY = Math.max(...processedData.map(d => d.y));

    // Add padding
    const padding = 40;
    const graphWidth = rect.width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Add some padding to Y range for better visualization
    const yRange = maxY - minY;
    const yPadding = yRange * 0.1; // 10% padding
    const adjustedMinY = Math.max(0, minY - yPadding);
    const adjustedMaxY = maxY + yPadding;

    // Scale functions
    const scaleX = (x) => padding + ((x - minX) / (maxX - minX)) * graphWidth;
    const scaleY = (y) => padding + graphHeight - ((y - adjustedMinY) / (adjustedMaxY - adjustedMinY)) * graphHeight;

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines (values)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // Draw line
    if (processedData.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      processedData.forEach((point, index) => {
        const x = scaleX(point.x);
        const y = scaleY(point.y);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }

    // Draw points
    ctx.fillStyle = color;
    processedData.forEach(point => {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw axes labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = adjustedMinY + (i / 5) * (adjustedMaxY - adjustedMinY);
      const y = padding + (i / 5) * graphHeight;
      ctx.fillText(value.toFixed(1), padding - 10, y + 4);
    }

    // X-axis labels (time)
    for (let i = 0; i <= 5; i++) {
      const time = minX + (i / 5) * (maxX - minX);
      const x = padding + (i / 5) * graphWidth;
      const date = new Date(time);
      ctx.fillText(date.toLocaleTimeString(), x, height - padding + 20);
    }

    // Draw title
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, padding, 25);

  }, [processedData, color, height, title]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || processedData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Find closest point
    const minX = Math.min(...processedData.map(d => d.x));
    const maxX = Math.max(...processedData.map(d => d.x));
    const padding = 40;
    const graphWidth = rect.width - (padding * 2);
    
    const scaleX = (timestamp) => padding + ((timestamp - minX) / (maxX - minX)) * graphWidth;
    
    let closestPoint = null;
    let minDistance = Infinity;

    processedData.forEach(point => {
      const pointX = scaleX(point.x);
      const distance = Math.abs(x - pointX);
      
      if (distance < minDistance && distance < 20) { // 20px tolerance
        minDistance = distance;
        closestPoint = point;
      }
    });

    setHoveredPoint(closestPoint);
  }, [processedData]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // Redraw when data changes
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Add mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-200 rounded-lg"
        style={{ height: `${height}px` }}
      />
      
      {/* Tooltip */}
      {showTooltip && hoveredPoint && (
        <div
          className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none z-10"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold">{title}</div>
          <div>Value: {hoveredPoint.y} {unit}</div>
          <div>Timestamp: {new Date(hoveredPoint.x).toLocaleString()}</div>
          <div className="text-xs text-gray-300">
            {new Date(hoveredPoint.x).toISOString()}
          </div>
          {hoveredPoint.original.fallDetected && (
            <div className="text-red-400">🚨 Fall Detected</div>
          )}
        </div>
      )}

      {/* Data summary */}
      {processedData.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Latest:</span> {processedData[processedData.length - 1].y} {unit} • 
          <span className="font-medium ml-2">Range:</span> {Math.min(...processedData.map(d => d.y)).toFixed(1)} - {Math.max(...processedData.map(d => d.y)).toFixed(1)} {unit} • 
          <span className="font-medium ml-2">Points:</span> {processedData.length}
        </div>
      )}
    </div>
  );
};

export default RealtimeGraph;

