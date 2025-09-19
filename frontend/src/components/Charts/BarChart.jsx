import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import BaseChart from './BaseChart';
import Tooltip from './Tooltip';
import useTooltip from '../../hooks/useTooltip';

export default function BarChart({ 
  data = [], 
  width = 400, 
  height = 200, 
  color = '#ea580c',
  title = '',
  subtitle = '',
  currentValue = null,
  unit = '',
  showGrid = true,
  className = '',
  vitalType = '',
  timestamps = [],
  status = 'normal'
}) {
  const { tooltip, highlightedPoint, showTooltip, hideTooltip, updateTooltipPosition, handleMobileTap } = useTooltip();
  // Process data for bar chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { bars: [], min: 0, max: 100 };
    
    const values = data.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (values.length === 0) return { bars: [], min: 0, max: 100 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    // Add some padding
    const padding = range * 0.1;
    const yMin = min - padding;
    const yMax = max + padding;
    const yRange = yMax - yMin;
    
    const barWidth = (width - 40) / values.length * 0.8; // 80% of available width
    const barSpacing = (width - 40) / values.length;
    
    const bars = values.map((value, index) => {
      const x = 20 + index * barSpacing + (barSpacing - barWidth) / 2;
      const barHeight = ((value - yMin) / yRange) * (height - 40);
      const y = height - 20 - barHeight;
      return { x, y, width: barWidth, height: barHeight, value };
    });
    
    return { bars, min: yMin, max: yMax, values };
  }, [data, width, height]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!showGrid || chartData.bars.length === 0) return [];
    
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
      
      {/* Bars with tooltip interactions */}
      {chartData.bars.map((bar, index) => {
        const timestamp = timestamps[index] || null;
        const isHighlighted = highlightedPoint && 
          Math.abs(highlightedPoint.x - (bar.x + bar.width / 2)) < bar.width / 2 && 
          Math.abs(highlightedPoint.y - (bar.y + bar.height / 2)) < bar.height / 2;
        
        return (
          <rect
            key={index}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={isHighlighted ? "#f59e0b" : color}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={(e) => showTooltip(e, bar.value, vitalType, unit, timestamp, status)}
            onMouseMove={(e) => updateTooltipPosition(e)}
            onMouseLeave={hideTooltip}
            onTouchStart={(e) => handleMobileTap(e, bar.value, vitalType, unit, timestamp, status)}
            style={{ 
              filter: isHighlighted ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none',
              opacity: isHighlighted ? 0.9 : 1
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
