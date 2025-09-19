import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import BaseChart from './BaseChart';
import Tooltip from './Tooltip';
import useTooltip from '../../hooks/useTooltip';

export default function SpikeChart({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#7c3aed',
  title = '',
  subtitle = '',
  currentValue = null,
  unit = '',
  showGrid = true,
  threshold = 1.5,
  className = '',
  vitalType = '',
  timestamps = [],
  status = 'normal'
}) {
  const { tooltip, highlightedPoint, showTooltip, hideTooltip, updateTooltipPosition, handleMobileTap } = useTooltip();
  // Process data for spike chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: [], min: 0, max: 100 };
    
    const values = data.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (values.length === 0) return { points: [], min: 0, max: 100 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    // Add some padding
    const padding = range * 0.1;
    const yMin = min - padding;
    const yMax = max + padding;
    const yRange = yMax - yMin;
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 40) + 20; // 20px padding
      const y = height - 20 - ((value - yMin) / yRange) * (height - 40); // 20px padding
      const isSpike = value > threshold;
      return { x, y, value, isSpike };
    });
    
    return { points, min: yMin, max: yMax, values };
  }, [data, width, height, threshold]);

  // Generate path for line
  const pathData = chartData.points.length > 1 
    ? chartData.points.map((point, index) => 
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      ).join(' ')
    : '';

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!showGrid || chartData.points.length === 0) return [];
    
    const lines = [];
    const gridCount = 4;
    
    // Horizontal grid lines
    for (let i = 0; i <= gridCount; i++) {
      const y = 20 + (i / gridCount) * (height - 40);
      const value = chartData.max - (i / gridCount) * (chartData.max - chartData.min);
      lines.push({
        type: 'horizontal',
        y,
        value: value.toFixed(1)
      });
    }
    
    return lines;
  }, [showGrid, chartData, height]);

  // Threshold line
  const thresholdY = chartData.points.length > 0 
    ? height - 20 - ((threshold - chartData.min) / (chartData.max - chartData.min)) * (height - 40)
    : height - 20;

  return (
    <>
      <BaseChart
        data={data}
        width={width}
        height={height}
        color={color}
        title={title}
        subtitle={subtitle}
        currentValue={currentValue}
        unit={unit}
        className={className}
      >
      {/* Grid lines */}
      {gridLines.map((line, index) => (
        <g key={index}>
          <line
            x1="20"
            y1={line.y}
            x2={width - 20}
            y2={line.y}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
          <text
            x="10"
            y={line.y + 4}
            fontSize="10"
            fill="#6b7280"
            textAnchor="end"
          >
            {line.value}
          </text>
        </g>
      ))}
      
      {/* Threshold line */}
      <line
        x1="20"
        y1={thresholdY}
        x2={width - 20}
        y2={thresholdY}
        stroke="#f59e0b"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.7"
      />
      <text
        x={width - 10}
        y={thresholdY - 5}
        fontSize="10"
        fill="#f59e0b"
        textAnchor="end"
      >
        Threshold: {threshold}g
      </text>
      
      {/* Line path */}
      {pathData && (
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
      )}
      
      {/* Data points with spike highlighting and tooltip interactions */}
      {chartData.points.map((point, index) => {
        const timestamp = timestamps[index] || null;
        const isHighlighted = highlightedPoint && 
          Math.abs(highlightedPoint.x - point.x) < 10 && 
          Math.abs(highlightedPoint.y - point.y) < 10;
        
        return (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={isHighlighted ? "8" : (point.isSpike ? "5" : "3")}
            fill={isHighlighted ? "#f59e0b" : (point.isSpike ? "#f59e0b" : color)}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={(e) => showTooltip(e, point.value, vitalType, unit, timestamp, status)}
            onMouseMove={(e) => updateTooltipPosition(e)}
            onMouseLeave={hideTooltip}
            onTouchStart={(e) => handleMobileTap(e, point.value, vitalType, unit, timestamp, status)}
            style={{ 
              filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))' : 
                     point.isSpike ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))' : 'none'
            }}
          />
        );
      })}
      
      {/* Axes */}
      <line
        x1="20"
        y1={height - 20}
        x2={width - 20}
        y2={height - 20}
        stroke="#d1d5db"
        strokeWidth="1"
      />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2={height - 20}
        stroke="#d1d5db"
        strokeWidth="1"
      />
      
      </BaseChart>
      
      {/* Tooltip rendered as portal */}
      {tooltip.visible && createPortal(
        <Tooltip
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          data={tooltip.data}
          vitalType={tooltip.vitalType}
          unit={tooltip.unit}
          timestamp={tooltip.timestamp}
          status={tooltip.status}
        />,
        document.body
      )}
    </>
  );
}
