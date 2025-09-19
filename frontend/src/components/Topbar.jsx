import React from "react";

export default function Topbar({ 
  patientName = "Pramoda CN", 
  lastUpdated, 
  notifications = 0, 
  online = true,
  alertsCount = 0 
}) {
  const formatLastUpdated = () => {
    if (!lastUpdated) return "--:--";
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return updated.toLocaleDateString();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Welcome message */}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, {patientName}
          </h1>
          <p className="text-sm text-gray-600">
            Your health dashboard • Last updated {formatLastUpdated()}
          </p>
        </div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Device status */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span 
                className={`h-2 w-2 rounded-full ${
                  online ? "bg-success-500" : "bg-gray-400"
                }`} 
                aria-hidden="true"
              />
              <span className={`font-medium ${
                online ? "text-success-700" : "text-gray-500"
              }`}>
                {online ? "Device Online" : "Offline"}
              </span>
            </div>
          </div>

          {/* Notifications */}
          <button 
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label={`${notifications} notifications`}
          >
            <span className="text-lg" aria-hidden="true">🔔</span>
            {notifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-xs font-medium text-white">
                {notifications > 9 ? "9+" : notifications}
              </span>
            )}
          </button>

          {/* Alerts indicator (if different from notifications) */}
          {alertsCount > 0 && alertsCount !== notifications && (
            <div className="flex items-center gap-1 text-sm text-danger-600">
              <span className="text-lg" aria-hidden="true">⚠️</span>
              <span className="font-medium">{alertsCount} Alert{alertsCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


