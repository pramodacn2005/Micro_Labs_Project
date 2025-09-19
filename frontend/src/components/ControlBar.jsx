import React, { useState } from "react";

export default function ControlBar({ 
  onSimulateOffline,
  onExportData,
  onFullScreen,
  isOnline = true
}) {
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);

  const handleSimulateOffline = () => {
    const newState = !isOfflineSimulated;
    setIsOfflineSimulated(newState);
    onSimulateOffline?.(newState);
  };

  const handleExportData = () => {
    onExportData?.();
  };

  const handleFullScreen = () => {
    onFullScreen?.();
  };

  return (
    <div className="flex items-center justify-between bg-white border-t border-gray-200 px-6 py-4">
      {/* Left side - Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSimulateOffline}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isOfflineSimulated
              ? 'bg-danger-100 text-danger-700 border border-danger-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={isOfflineSimulated ? 'Restore online status' : 'Simulate offline status'}
        >
          {isOfflineSimulated ? 'Restore Online' : 'Simulate Offline'}
        </button>
        
        <button
          onClick={handleExportData}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label="Export data"
        >
          Export Data
        </button>
      </div>

      {/* Right side - Full screen and branding */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleFullScreen}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          aria-label="Enter full screen view"
        >
          Full Screen View
        </button>
        
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Made with</span>
          <span className="text-primary-500 font-medium">Blink</span>
          <span className="text-lg" aria-hidden="true">🧠</span>
        </div>
      </div>
    </div>
  );
}