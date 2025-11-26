import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Dashboard from "../components/Dashboard";
import LiveMonitoring from "./LiveMonitoring";
import MedicineReminder from "../components/MedicineReminder";
import AlertManagement from "../components/AlertManagement";
import PatientProfile from "../components/PatientProfile";
import Settings from "../components/Settings";
import History from "../components/History";
import FeverAnalysis from "../components/FeverAnalysis";
import AIAssistant from "../components/AIAssistant";
import DoctorList from "../components/DoctorList";
import BookAppointment from "../components/BookAppointment";
import PatientAppointments from "../components/PatientAppointments";
import PatientPrescriptions from "../components/PatientPrescriptions";
import DoctorDashboard from "../components/DoctorDashboard";
import AdminDashboard from "../components/AdminDashboard";
import RoleSelector from "../components/RoleSelector";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { userData, user, refreshUserData } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [alertsCount] = useState(3);
  const [notificationsCount] = useState(3);
  const [lastUpdated] = useState(Date.now());
  const [isOnline] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the real user name from Firebase
  const patientName = userData?.fullName || user?.displayName || "User";
  const userRole = userData?.role || 'patient';

  // Check if user needs to select a role (only show if user is loaded and has no role)
  React.useEffect(() => {
    if (user && userData && userData.email && !userData.role) {
      setShowRoleSelector(true);
    }
  }, [user, userData]);

  // Auto-navigate to role-specific dashboard on login (only once)
  React.useEffect(() => {
    if (user && userData && userData.role) {
      // Only auto-navigate if we're on the default dashboard
      if (currentPage === "dashboard") {
        if (userRole === 'admin') {
          setCurrentPage("admin-dashboard");
        } else if (userRole === 'doctor') {
          setCurrentPage("doctor-dashboard");
        }
      }
    }
  }, [user, userData?.role]); // Only depend on role, not currentPage to avoid loops

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

  // Listen for navigation events from child components
  React.useEffect(() => {
    const handleNavigate = (event) => {
      if (event.detail && event.detail.page) {
        handleNavigation(event.detail.page);
        // Store doctorId for book-appointment page if provided
        if (event.detail.doctorId) {
          sessionStorage.setItem('selectedDoctorId', event.detail.doctorId);
        }
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  const handleRoleSelected = () => {
    setShowRoleSelector(false);
    refreshUserData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Selector Modal */}
      {showRoleSelector && (
        <RoleSelector onRoleSelected={handleRoleSelected} />
      )}

      {/* Topbar */}
      <Topbar 
        patientName={patientName}
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
            {currentPage === "medicine-reminder" && (
              <MedicineReminder />
            )}
            {/* Temporarily removed: Alerts section */}
            {/* {currentPage === "alerts" && (
              <AlertManagement />
            )} */}
            {currentPage === "profile" && (
              <PatientProfile />
            )}
            {/* Temporarily removed: Settings section */}
            {/* {currentPage === "settings" && (
              <Settings />
            )} */}
            {currentPage === "fever-checker" && (
              <FeverAnalysis />
            )}
            {currentPage === "ai-assistant" && (
              <AIAssistant />
            )}
            {currentPage === "history" && (
              <History />
            )}
            {currentPage === "doctor-list" && (
              <DoctorList />
            )}
            {currentPage === "book-appointment" && (
              <BookAppointment />
            )}
            {currentPage === "my-appointments" && (
              <PatientAppointments />
            )}
            {currentPage === "my-prescriptions" && (
              <PatientPrescriptions />
            )}
            {currentPage === "doctor-dashboard" && (
              <DoctorDashboard />
            )}
            {currentPage === "admin-dashboard" && (
              <AdminDashboard />
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


