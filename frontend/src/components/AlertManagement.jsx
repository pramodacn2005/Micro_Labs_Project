import React, { useState, useEffect } from "react";
import { designTokens } from "../config/designTokens";

export default function AlertManagement() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  const [hoveredAlert, setHoveredAlert] = useState(null);
  const [isRealTime, setIsRealTime] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Mock data - in real app, this would come from API
  const mockAlerts = [
    {
      id: 1,
      patientName: "John Smith",
      patientId: "P001",
      alertType: "Heart Rate",
      severity: "critical",
      status: "new",
      timeTriggered: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      currentValue: "135 BPM",
      deviceId: "HRM-001",
      location: "Room 101",
      lastReadings: ["132 BPM", "128 BPM", "125 BPM"],
      trend: "increasing"
    },
    {
      id: 2,
      patientName: "Mary Johnson",
      patientId: "P002",
      alertType: "Temperature",
      severity: "high",
      status: "acknowledged",
      timeTriggered: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      currentValue: "38.5°C",
      deviceId: "TEMP-002",
      location: "Room 102",
      lastReadings: ["38.2°C", "38.0°C", "37.8°C"],
      trend: "stable"
    },
    {
      id: 3,
      patientName: "Linda Wilson",
      patientId: "P003",
      alertType: "Device Offline",
      severity: "medium",
      status: "new",
      timeTriggered: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      currentValue: "45 minutes",
      deviceId: "MON-003",
      location: "Room 103",
      lastReadings: ["Online", "Online", "Online"],
      trend: "decreasing"
    },
    {
      id: 4,
      patientName: "Robert Brown",
      patientId: "P004",
      alertType: "Blood Pressure",
      severity: "critical",
      status: "resolved",
      timeTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      currentValue: "180/95 mmHg",
      deviceId: "BP-004",
      location: "Room 104",
      lastReadings: ["175/90 mmHg", "170/85 mmHg", "165/80 mmHg"],
      trend: "decreasing"
    }
  ];

  // Mock summary data with trends
  const summaryData = {
    active: { count: 3, trend: "up", change: "+1" },
    critical: { count: 1, trend: "down", change: "-1" },
    acknowledged: { count: 1, trend: "stable", change: "0" },
    resolved: { count: 1, trend: "up", change: "+1" }
  };

  useEffect(() => {
    setAlerts(mockAlerts);
    setFilteredAlerts(mockAlerts);
    
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.patientId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by severity
    if (severityFilter !== "all") {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Filter by time
    const now = new Date();
    if (timeFilter === "24h") {
      filtered = filtered.filter(alert => 
        now - alert.timeTriggered <= 24 * 60 * 60 * 1000
      );
    } else if (timeFilter === "7d") {
      filtered = filtered.filter(alert => 
        now - alert.timeTriggered <= 7 * 24 * 60 * 60 * 1000
      );
    }

    // Filter by status/tab
    if (activeTab === "active") {
      filtered = filtered.filter(alert => alert.status === "new" || alert.status === "acknowledged");
    } else if (activeTab === "acknowledged") {
      filtered = filtered.filter(alert => alert.status === "acknowledged");
    } else if (activeTab === "resolved") {
      filtered = filtered.filter(alert => alert.status === "resolved");
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, severityFilter, timeFilter, activeTab]);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-blue-500 text-white",
      low: "bg-yellow-500 text-black",
      normal: "bg-green-500 text-white"
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: "bg-red-100 text-red-800 border-red-200",
      acknowledged: "bg-yellow-100 text-yellow-800 border-yellow-200",
      resolved: "bg-green-100 text-green-800 border-green-200"
    };
    return colors[status] || colors.new;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up": return "↗️";
      case "down": return "↘️";
      case "stable": return "→";
      default: return "→";
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleAcknowledge = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: "acknowledged" }
        : alert
    ));
  };

  const handleResolve = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: "resolved" }
        : alert
    ));
  };

  const toggleAlertExpansion = (alertId) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const getAlertIcon = (alertType) => {
    const icons = {
      "Heart Rate": "❤️",
      "Temperature": "🌡️",
      "Device Offline": "📱",
      "Blood Pressure": "🩸",
      "Oxygen": "🫁",
      "Fall Detection": "⚠️"
    };
    return icons[alertType] || "⚠️";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
          <p className="text-gray-600">Monitor and respond to patient alerts</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
          </select>
          
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
          </select>

          {/* Real-time toggle */}
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              isRealTime 
                ? "bg-green-100 border-green-300 text-green-700" 
                : "bg-gray-100 border-gray-300 text-gray-700"
            }`}
          >
            <span className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isRealTime ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
              <span className="text-sm font-medium">
                {isRealTime ? "Live" : "Paused"}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(summaryData).map(([key, data]) => (
          <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 capitalize">{key}</p>
                <p className="text-3xl font-bold text-gray-900">{data.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.trend === "up" && "↗️"}
                  {data.trend === "down" && "↘️"}
                  {data.trend === "stable" && "→"}
                  {data.change !== "0" && ` ${data.change} from last hour`}
                  {data.change === "0" && " No change"}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                key === "active" ? "bg-red-100" :
                key === "critical" ? "bg-red-100" :
                key === "acknowledged" ? "bg-yellow-100" :
                "bg-green-100"
              }`}>
                <span className="text-2xl">
                  {key === "active" ? "⚠️" :
                   key === "critical" ? "🚨" :
                   key === "acknowledged" ? "✅" :
                   "✅"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert History Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert History (Last 24 Hours)</h3>
        <div className="h-32 flex items-end space-x-2">
          {Array.from({ length: 24 }, (_, i) => {
            const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).getHours();
            const alertCount = Math.floor(Math.random() * 5); // Mock data
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(alertCount / 5) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">{hour}:00</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "active", label: "Active", count: alerts.filter(a => a.status === "new" || a.status === "acknowledged").length },
            { key: "acknowledged", label: "Acknowledged", count: alerts.filter(a => a.status === "acknowledged").length },
            { key: "resolved", label: "Resolved", count: alerts.filter(a => a.status === "resolved").length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === "active" ? "Active Alerts" : 
             activeTab === "acknowledged" ? "Acknowledged Alerts" : 
             "Resolved Alerts"}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const isExpanded = expandedAlerts.has(alert.id);
              
              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-lg border-l-4 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md ${
                    alert.severity === "critical" ? "border-l-red-500" :
                    alert.severity === "high" ? "border-l-orange-500" :
                    "border-l-blue-500"
                  }`}
                  onMouseEnter={() => setHoveredAlert(alert.id)}
                  onMouseLeave={() => setHoveredAlert(null)}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-xl">{getAlertIcon(alert.alertType)}</span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {alert.alertType}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(alert.status)}`}>
                                {alert.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>👤</span>
                              <span>{alert.patientName} ({alert.patientId})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>🕐</span>
                              <span>{formatTimeAgo(alert.timeTriggered)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>📊</span>
                              <span>{alert.currentValue}</span>
                            </div>
                          </div>

                          {/* Mobile expand/collapse button */}
                          {isMobile && (
                            <button
                              onClick={() => toggleAlertExpansion(alert.id)}
                              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
                            >
                              <span>{isExpanded ? "Show less" : "Show more"}</span>
                              <span className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                ▼
                              </span>
                            </button>
                          )}

                          {/* Tooltip content for desktop or expanded mobile */}
                          {((hoveredAlert === alert.id && !isMobile) || (isMobile && isExpanded)) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Device ID:</span>
                                  <span className="ml-2 text-gray-600">{alert.deviceId}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Location:</span>
                                  <span className="ml-2 text-gray-600">{alert.location}</span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="font-medium text-gray-700">Last 3 readings:</span>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {alert.lastReadings.map((reading, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-white rounded border text-xs">
                                        {reading}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-4">
                        {alert.status === "new" && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-3 sm:px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs sm:text-sm font-medium"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== "resolved" && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm font-medium"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
