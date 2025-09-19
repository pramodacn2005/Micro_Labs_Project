import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Dashboard from "../components/Dashboard";
import LiveMonitoring from "./LiveMonitoring";
import AlertManagement from "../components/AlertManagement";
import PatientProfile from "../components/PatientProfile";
import Settings from "../components/Settings";
import History from "../components/History";

export default function Home() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [alertsCount] = useState(3);
  const [notificationsCount] = useState(3);
  const [lastUpdated] = useState(Date.now());
  const [isOnline] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (pageId) => {
    if (pageId === 'login') {
      navigate('/login');
      return;
    }
    
    setCurrentPage(pageId);
    // Add navigation logic here
    console.log(`Navigating to: ${pageId}`);
  };

  const handleEmergency = () => {
    console.log("Emergency alert from Home component");
    // Add emergency handling logic here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <Topbar 
        patientName="Pramoda CN"
        lastUpdated={lastUpdated}
        notifications={notificationsCount}
        alertsCount={alertsCount}
        online={isOnline}
      />
      
      {/* Main layout */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          alertsCount={alertsCount}
          expanded={sidebarExpanded}
          currentPage={currentPage}
          onNavigate={handleNavigation}
        />
        
        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <div className="p-6">
            {currentPage === "dashboard" && (
              <Dashboard />
            )}
            {currentPage === "live-monitoring" && (
              <LiveMonitoring />
            )}
            {currentPage === "alerts" && (
              <AlertManagement />
            )}
            {currentPage === "profile" && (
              <PatientProfile />
            )}
            {currentPage === "settings" && (
              <Settings />
            )}
            {currentPage === "history" && (
              <History />
            )}
            {currentPage === "logout" && (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Logout</h2>
                <p className="text-gray-600">Logout functionality coming soon...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


