import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import BaseChart from './BaseChart';
import Tooltip from './Tooltip';
import useTooltip from '../../hooks/useTooltip';

export default function AreaChart({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#2563eb',
  title = '',
  subtitle = '',
  currentValue = null,
  unit = '',
  showGrid = true,
  showDots = true,
  strokeWidth = 2,
  className = '',
  vitalType = '',
  timestamps = [],
  status = 'normal'
}) {
  const { tooltip, highlightedPoint, showTooltip, hideTooltip, updateTooltipPosition, handleMobileTap } = useTooltip();
  // Process data for area chart
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
      return { x, y, value };
    });
    
    return { points, min: yMin, max: yMax, values };
  }, [data, width, height]);

  // Generate path for area fill
  const areaPath = chartData.points.length > 1 
    ? `M ${chartData.points[0].x} ${height - 20} ` +
      chartData.points.map(point => `L ${point.x} ${point.y}`).join(' ') +
      ` L ${chartData.points[chartData.points.length - 1].x} ${height - 20} Z`
    : '';

  // Generate path for line
  const linePath = chartData.points.length > 1 
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
      
      {/* Area fill */}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#gradient-${color.replace('#', '')})`}
          className="transition-all duration-300"
        />
      )}
      
      {/* Line path */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
      )}
      
      {/* Data points with tooltip interactions */}
      {showDots && chartData.points.map((point, index) => {
        const timestamp = timestamps[index] || null;
        const isHighlighted = highlightedPoint && 
          Math.abs(highlightedPoint.x - point.x) < 10 && 
          Math.abs(highlightedPoint.y - point.y) < 10;
        
        return (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={isHighlighted ? "6" : "3"}
            fill={isHighlighted ? "#f59e0b" : color}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={(e) => showTooltip(e, point.value, vitalType, unit, timestamp, status)}
            onMouseMove={(e) => updateTooltipPosition(e)}
            onMouseLeave={hideTooltip}
            onTouchStart={(e) => handleMobileTap(e, point.value, vitalType, unit, timestamp, status)}
            style={{ filter: isHighlighted ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none' }}
          />
        );
      })}
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      
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
