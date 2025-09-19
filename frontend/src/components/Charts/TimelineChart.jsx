import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import BaseChart from './BaseChart';
import Tooltip from './Tooltip';
import useTooltip from '../../hooks/useTooltip';

export default function TimelineChart({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#f59e0b',
  title = '',
  subtitle = '',
  currentValue = null,
  unit = '',
  showGrid = true,
  className = '',
  trueLabel = 'Yes',
  falseLabel = 'No',
  vitalType = '',
  timestamps = [],
  status = 'normal'
}) {
  const { tooltip, highlightedPoint, showTooltip, hideTooltip, updateTooltipPosition, handleMobileTap } = useTooltip();
  // Process data for timeline chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: [], events: [] };
    
    const values = data.filter(v => v !== null && v !== undefined);
    if (values.length === 0) return { points: [], events: [] };
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 40) + 20; // 20px padding
      const y = value ? height - 40 : height - 20; // True at top, false at bottom
      return { x, y, value, index };
    });
    
    // Find events (transitions from false to true)
    const events = [];
    for (let i = 1; i < values.length; i++) {
      if (!values[i - 1] && values[i]) {
        const x = (i / (values.length - 1)) * (width - 40) + 20;
        events.push({ x, y: height - 30, index: i });
      }
    }
    
    return { points, events, values };
  }, [data, width, height]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    
    const lines = [];
    
    // Horizontal grid lines for true/false
    lines.push({
      y: height - 40,
      label: trueLabel,
      color: '#10b981'
    });
    lines.push({
      y: height - 20,
      label: falseLabel,
      color: '#6b7280'
    });
    
    return lines;
  }, [showGrid, height, trueLabel, falseLabel]);

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
            fill={line.color}
            textAnchor="end"
          >
            {line.label}
          </text>
        </g>
      ))}
      
      {/* Timeline line */}
      {chartData.points.length > 1 && (
        <path
          d={chartData.points.map((point, index) => 
            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
          ).join(' ')}
          fill="none"
          stroke="#d1d5db"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* Data points with tooltip interactions */}
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
            r={isHighlighted ? "6" : "4"}
            fill={isHighlighted ? "#f59e0b" : (point.value ? '#10b981' : '#6b7280')}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={(e) => showTooltip(e, point.value, vitalType, unit, timestamp, status)}
            onMouseMove={(e) => updateTooltipPosition(e)}
            onMouseLeave={hideTooltip}
            onTouchStart={(e) => handleMobileTap(e, point.value, vitalType, unit, timestamp, status)}
            style={{ 
              filter: isHighlighted ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none'
            }}
          />
        );
      })}
      
      {/* Event markers */}
      {chartData.events.map((event, index) => (
        <g key={index}>
          <circle
            cx={event.x}
            cy={event.y}
            r="6"
            fill="#f59e0b"
            className="animate-pulse"
          />
          <text
            x={event.x}
            y={event.y - 10}
            fontSize="8"
            fill="#f59e0b"
            textAnchor="middle"
            fontWeight="bold"
          >
            !
          </text>
        </g>
      ))}
      
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
