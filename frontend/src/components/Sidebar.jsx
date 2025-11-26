import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { designTokens } from "../config/designTokens";

export default function Sidebar({ 
  alertsCount = 0, 
  expanded = true, 
  currentPage = "dashboard",
  onNavigate 
}) {
  const [isCollapsed, setIsCollapsed] = useState(!expanded);
  const { isAuthenticated, userData } = useAuth();

  // Get user role
  const userRole = userData?.role || 'patient';

  // Base navigation items for all users
  const baseItems = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "profile", icon: "👤", label: "Profile" }
    // Temporarily removed: { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  // Patient-specific items
  const patientItems = [
    { id: "live-monitoring", icon: "📡", label: "Live Monitoring" },
    { id: "medicine-reminder", icon: "💊", label: "Medicine Reminder" },
    // Temporarily removed: { id: "alerts", icon: "🔔", label: "Alerts", badge: alertsCount },
    { id: "fever-checker", icon: "🌡️", label: "Fever Analysis" },
    { id: "ai-assistant", icon: "🤖", label: "Medibot" },
    { id: "doctor-list", icon: "🩺", label: "Find Doctors" },
    { id: "my-appointments", icon: "📅", label: "My Appointments" },
    { id: "my-prescriptions", icon: "📋", label: "My Prescriptions" },
    { id: "history", icon: "🕓", label: "History" }
  ];

  // Doctor-specific items
  const doctorItems = [
    { id: "doctor-dashboard", icon: "👨‍⚕️", label: "Doctor Dashboard" },
    { id: "live-monitoring", icon: "📡", label: "Live Monitoring" }
  ];

  // Admin-specific items
  const adminItems = [
    { id: "admin-dashboard", icon: "👨‍💼", label: "Admin Dashboard" }
  ];

  // Build navigation items based on role
  let navigationItems = [];
  if (isAuthenticated) {
    navigationItems = [...baseItems];
    
    if (userRole === 'admin') {
      navigationItems.push(...adminItems);
    } else if (userRole === 'doctor') {
      navigationItems.push(...doctorItems);
    } else {
      // Patient or default
      navigationItems.push(...patientItems);
    }
  }

  const Item = ({ item, active }) => (
    <button
      onClick={() => onNavigate?.(item.id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
        active 
          ? "bg-primary-500 text-white shadow-sm" 
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      }`}
      aria-current={active ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      <span className="text-lg flex-shrink-0" aria-hidden="true">
        {item.icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left font-medium">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="ml-auto rounded-full bg-danger-500 px-2 py-0.5 text-xs font-medium text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <aside
      className={`hidden h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 md:flex ${
        isCollapsed ? "w-16" : "w-60"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white" aria-hidden="true">
            ♥
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-semibold text-gray-900">HealthMonitor</div>
              <div className="text-xs text-gray-500">Patient Portal</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="text-sm">
            {isCollapsed ? "→" : "←"}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navigationItems.map((item) => (
          <Item
            key={item.id}
            item={item}
            active={currentPage === item.id}
          />
        ))}
      </nav>

    </aside>
  );
}


