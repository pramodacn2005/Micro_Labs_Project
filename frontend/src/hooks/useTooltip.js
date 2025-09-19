import { useState, useCallback, useRef } from 'react';

export default function useTooltip() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    vitalType: '',
    unit: '',
    timestamp: null,
    status: 'normal'
  });

  const [highlightedPoint, setHighlightedPoint] = useState(null);
  const tooltipRef = useRef(null);

  const showTooltip = useCallback((event, data, vitalType, unit, timestamp, status = 'normal') => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    setTooltip({
      visible: true,
      x,
      y,
      data,
      vitalType,
      unit,
      timestamp,
      status
    });

    setHighlightedPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
    setHighlightedPoint(null);
  }, []);

  const updateTooltipPosition = useCallback((event) => {
    if (!tooltip.visible) return;
    
    const x = event.clientX;
    const y = event.clientY;

    setTooltip(prev => ({ ...prev, x, y }));
    setHighlightedPoint({ x: event.clientX - event.currentTarget.getBoundingClientRect().left, y: event.clientY - event.currentTarget.getBoundingClientRect().top });
  }, [tooltip.visible]);

  // Mobile tap handlers
  const handleMobileTap = useCallback((event, data, vitalType, unit, timestamp, status = 'normal') => {
    event.preventDefault();
    event.stopPropagation();
    
    if (tooltip.visible && tooltip.data === data) {
      hideTooltip();
    } else {
      showTooltip(event, data, vitalType, unit, timestamp, status);
    }
  }, [tooltip.visible, tooltip.data, showTooltip, hideTooltip]);

  return {
    tooltip,
    highlightedPoint,
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
    handleMobileTap,
    tooltipRef
  };
}
