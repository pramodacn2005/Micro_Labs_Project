import React, { useState, useEffect } from 'react';

export default function LiveDataIndicator({ 
  isOnline = true,
  lastUpdate = null,
  updateInterval = 5000,
  className = ""
}) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);
  const [isLive, setIsLive] = useState(true);

  // Update time since last update
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate) {
        const now = Date.now();
        const diff = now - lastUpdate;
        setTimeSinceUpdate(diff);
        
        // Consider data stale if no update for 30 seconds
        setIsLive(diff < 30000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Format time since update
  const formatTimeSinceUpdate = (ms) => {
    if (ms < 1000) return 'Just now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          isOnline && isLive 
            ? 'bg-green-500 animate-pulse' 
            : isOnline 
            ? 'bg-yellow-500' 
            : 'bg-red-500'
        }`}></div>
        <span className={`text-sm font-medium ${
          isOnline && isLive 
            ? 'text-green-700' 
            : isOnline 
            ? 'text-yellow-700' 
            : 'text-red-700'
        }`}>
          {isOnline && isLive ? 'LIVE' : isOnline ? 'STALE' : 'OFFLINE'}
        </span>
      </div>

      {/* Update info */}
      {lastUpdate && (
        <div className="text-xs text-gray-600">
          Last update: {formatTimeSinceUpdate(timeSinceUpdate)}
        </div>
      )}

      {/* Update frequency */}
      <div className="text-xs text-gray-500">
        Updates every {updateInterval / 1000}s
      </div>

      {/* Live data point indicator */}
      {isOnline && isLive && (
        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
          <span>New data point</span>
        </div>
      )}
    </div>
  );
}

