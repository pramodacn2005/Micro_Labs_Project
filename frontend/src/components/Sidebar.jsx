import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/firebaseService";
import { designTokens } from "../config/designTokens";

export default function Sidebar({ 
  alertsCount = 0, 
  expanded = true, 
  currentPage = "dashboard",
  onNavigate 
}) {
  const [isCollapsed, setIsCollapsed] = useState(!expanded);
  const { user, userData, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // The auth state will be updated automatically by the context
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navigationItems = isAuthenticated ? [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "live-monitoring", icon: "📡", label: "Live Monitoring" },
    { id: "alerts", icon: "🔔", label: "Alerts", badge: alertsCount },
    { id: "profile", icon: "👤", label: "Profile" },
    { id: "settings", icon: "⚙️", label: "Settings" },
    { id: "history", icon: "🕓", label: "History" }
  ] : [];

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

      {/* User Profile or Sign In */}
      <div className={`border-t border-gray-200 p-3 ${isCollapsed ? "flex justify-center" : ""}`}>
        {isAuthenticated ? (
          <div className="space-y-2">
            <div className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                {getInitials(userData?.fullName || user?.displayName || user?.email)}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-gray-900">
                    {userData?.fullName || user?.displayName || 'User'}
                  </div>
                  <div className="truncate text-[11px] text-gray-500">
                    {user?.email}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors ${isCollapsed ? "justify-center" : ""}`}
            >
              <span className="text-lg">🚪</span>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        ) : (
          <div className={`${isCollapsed ? "flex justify-center" : ""}`}>
            <button
              onClick={() => onNavigate?.('login')}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}
            >
              <span className="text-lg">🔑</span>
              {!isCollapsed && <span>Sign In</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}


