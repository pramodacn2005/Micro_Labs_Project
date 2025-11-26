import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { convertAgeToYears } from "../services/firebaseService";

export default function PatientProfile() {
  const { userData, user, refreshUserData } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsedCards, setCollapsedCards] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [editableData, setEditableData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [currentPatientData, setCurrentPatientData] = useState(null);
  const [newMedicalCondition, setNewMedicalCondition] = useState("");
  const medicalConditionInputRef = useRef(null);

  // Patient data structure (timeline and other non-personal info)
  const patientData = {
    personalInfo: {
      fullName: "",
      age: "",
      gender: "",
      email: "",
      phone: "",
      weight: "",
      height: "",
      medicalConditions: [],
      healthStatus: "stable",
      lastVitalsCheck: new Date(Date.now() - 15 * 60 * 1000),
      photo: null
    },
    timeline: [
      {
        id: 1,
        date: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: "alert",
        title: "Heart Rate Alert",
        description: "Heart rate exceeded 120 BPM for 5 minutes",
        severity: "high"
      },
      {
        id: 2,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        type: "visit",
        title: "Routine Checkup",
        description: "Monthly checkup with Dr. Sarah Wilson",
        severity: "normal"
      },
      {
        id: 3,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        type: "medication",
        title: "Medication Adjustment",
        description: "Metformin dosage increased to 1000mg",
        severity: "normal"
      }
    ]
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize current patient data and update when userData changes
  useEffect(() => {
    if (!userData && !user) return; // Wait for user data to load
    
    const updatedPatientData = {
      ...patientData,
      personalInfo: {
        fullName: userData?.fullName || user?.displayName || "User",
        age: userData?.age || "",
        gender: userData?.gender || "",
        email: userData?.email || user?.email || "",
        phone: userData?.phone || "",
        weight: userData?.weight || "",
        height: userData?.height || "",
        medicalConditions: userData?.medicalConditions || [],
        healthStatus: userData?.healthStatus || "stable",
        lastVitalsCheck: new Date(Date.now() - 15 * 60 * 1000),
        photo: userData?.photo || null
      }
    };
    setCurrentPatientData(updatedPatientData);
  }, [userData, user]);

  // Initialize editable data when entering edit mode
  useEffect(() => {
    if (isEditMode && currentPatientData) {
      setEditableData({ ...currentPatientData.personalInfo });
      setOriginalData({ ...currentPatientData.personalInfo });
      setValidationErrors({});
      setNewMedicalCondition(""); // Reset new condition input
    }
  }, [isEditMode, currentPatientData]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const getHealthStatusBadge = (status) => {
    const badges = {
      stable: { emoji: "🟢", text: "Stable", color: "bg-green-100 text-green-800" },
      needs_attention: { emoji: "🟠", text: "Needs Attention", color: "bg-orange-100 text-orange-800" },
      critical: { emoji: "🔴", text: "Critical", color: "bg-red-100 text-red-800" }
    };
    return badges[status] || badges.stable;
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Validation functions
  const validateAge = (age) => {
    if (age === null || age === undefined || age === "") {
      return "Age is required";
    }
    const converted = convertAgeToYears(age);
    if (converted === null || isNaN(converted)) {
      return "Enter a valid numeric age";
    }
    if (converted < 0 || converted > 150) {
      return "Age must be between 0 and 150 years";
    }
    return null;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validatePhone = (phone) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      return "Phone number must contain exactly 10 digits";
    }
    return null;
  };

  const validateWeight = (weight) => {
    if (!weight || weight === "") return null; // Optional field
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight < 0 || numWeight > 500) {
      return "Weight must be a valid number between 0 and 500 kg";
    }
    return null;
  };

  const validateHeight = (height) => {
    if (!height || height === "") return null; // Optional field
    const numHeight = parseFloat(height);
    if (isNaN(numHeight) || numHeight < 0 || numHeight > 300) {
      return "Height must be a valid number between 0 and 300 cm";
    }
    return null;
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'age':
        return validateAge(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'weight':
        return validateWeight(value);
      case 'height':
        return validateHeight(value);
      default:
        return null;
    }
  };

  const getAgeParts = (ageValue) => {
    if (!ageValue) {
      return { value: "", unit: "years" };
    }
    const stringValue = String(ageValue).trim();
    const lower = stringValue.toLowerCase();
    if (lower.includes("month")) {
      const match = lower.match(/(\d+(\.\d+)?)/);
      return { value: match ? match[1] : "", unit: "months" };
    }
    return { value: stringValue.replace(/[^\d.]/g, ""), unit: "years" };
  };

  const formatAgeValue = (value, unit) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return unit === "months" ? `${trimmed} months` : trimmed;
  };

  const handleAgeValueChange = (value) => {
    const sanitized = value.replace(/[^\d.]/g, "");
    const currentUnit = getAgeParts(editableData.age).unit;
    const formatted = formatAgeValue(sanitized, currentUnit);
    setEditableData(prev => ({ ...prev, age: formatted }));
    setValidationErrors(prev => ({
      ...prev,
      age: validateAge(formatted)
    }));
  };

  const handleAgeUnitChange = (unit) => {
    const currentValue = getAgeParts(editableData.age).value;
    const formatted = formatAgeValue(currentValue, unit);
    setEditableData(prev => ({ ...prev, age: formatted }));
    setValidationErrors(prev => ({
      ...prev,
      age: validateAge(formatted)
    }));
  };

  // Edit mode handlers
  const handleEditModeToggle = () => {
    if (isEditMode) {
      // Cancel edit mode - revert changes
      setEditableData({ ...originalData });
      setValidationErrors({});
      setNewMedicalCondition(""); // Reset new condition input
    }
    setIsEditMode(!isEditMode);
  };

  const handleFieldChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
    
    // Validate field
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };


  // Handle Enter key press to commit the input
  const handleEnterKey = (field, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value;
      handleFieldChange(field, value);
    }
  };

  // Handle blur event to commit input when user clicks away
  const handleInputBlur = (field, e) => {
    const value = e.target.value;
    handleFieldChange(field, value);
  };

  // Medical conditions management functions
  const handleAddMedicalCondition = (inputRef) => {
    const value = inputRef?.current?.value || '';
    if (value.trim() === "") return;
    
    const currentConditions = editableData.medicalConditions || [];
    
    // Split by comma and clean up each condition
    const newConditions = value
      .split(',')
      .map(condition => condition.trim())
      .filter(condition => condition.length > 0);
    
    // Check for duplicates
    const duplicates = newConditions.filter(condition => currentConditions.includes(condition));
    if (duplicates.length > 0) {
      setToastMessage(`These conditions already exist: ${duplicates.join(', ')}`);
      setShowToast(true);
      return;
    }
    
    // Add all new conditions
    const updatedConditions = [...currentConditions, ...newConditions];
    setEditableData(prev => ({ ...prev, medicalConditions: updatedConditions }));
    if (inputRef?.current) {
      inputRef.current.value = ''; // Clear the input
    }
  };

  const handleRemoveMedicalCondition = (conditionToRemove) => {
    const currentConditions = editableData.medicalConditions || [];
    const updatedConditions = currentConditions.filter(condition => condition !== conditionToRemove);
    setEditableData(prev => ({ ...prev, medicalConditions: updatedConditions }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMedicalCondition();
    }
  };

  // Handle key events for medical conditions
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value;
      if (value.trim() !== '') {
        // Split by comma and clean up each condition
        const newConditions = value
          .split(',')
          .map(condition => condition.trim())
          .filter(condition => condition.length > 0);
        
        if (newConditions.length > 0) {
          const currentConditions = editableData.medicalConditions || [];
          
          // Check for duplicates
          const duplicates = newConditions.filter(condition => currentConditions.includes(condition));
          if (duplicates.length > 0) {
            setToastMessage(`These conditions already exist: ${duplicates.join(', ')}`);
            setShowToast(true);
            return;
          }
          
          // Add all new conditions
          const updatedConditions = [...currentConditions, ...newConditions];
          setEditableData(prev => ({ ...prev, medicalConditions: updatedConditions }));
          e.target.value = ''; // Clear the input
        }
      }
    }
  };


  const handleSave = async () => {
    // Validate all fields
    const errors = {};
    Object.keys(editableData).forEach(field => {
      const error = validateField(field, editableData[field]);
      if (error) {
        errors[field] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    
    try {
      // Import Firebase functions
      const { getFirestore, doc, setDoc } = await import("firebase/firestore");
      
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }
      
      // Save to Firebase Firestore
      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', user.uid);
      
      // Prepare data to save - explicitly include all fields
      const dataToSave = {
        fullName: editableData.fullName || "",
        age: editableData.age || "",
        gender: editableData.gender || "",
        email: editableData.email || "",
        phone: editableData.phone || "",
        weight: editableData.weight || "",
        height: editableData.height || "",
        medicalConditions: editableData.medicalConditions || [],
        healthStatus: editableData.healthStatus || "stable",
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      // Wait a bit for Firestore to update before refreshing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh user data in AuthContext
      await refreshUserData();
      
      // Update the current patient data with the new values
      setCurrentPatientData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...editableData }
      }));
      
      // Log the update for debugging
      console.log('Profile updated in Firebase:', dataToSave);
      
      setOriginalData({ ...editableData });
      setIsEditMode(false);
      setValidationErrors({});
      
      setToastMessage("Profile updated successfully!");
      setShowToast(true);
    } catch (error) {
      console.error('Error saving profile:', error);
      setToastMessage("Failed to update profile. Please try again.");
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentPatientData) return;
    
    const csvData = [];
    
    // Add personal information
    csvData.push(['Field', 'Value']);
    csvData.push(['Full Name', currentPatientData.personalInfo.fullName]);
    csvData.push(['Age', currentPatientData.personalInfo.age]);
    csvData.push(['Gender', currentPatientData.personalInfo.gender]);
    csvData.push(['Email', currentPatientData.personalInfo.email]);
    csvData.push(['Phone', currentPatientData.personalInfo.phone]);
    csvData.push(['Weight (kg)', currentPatientData.personalInfo.weight || 'Not set']);
    csvData.push(['Height (cm)', currentPatientData.personalInfo.height || 'Not set']);
    csvData.push(['Medical Conditions', currentPatientData.personalInfo.medicalConditions.join('; ')]);
    csvData.push(['Health Status', currentPatientData.personalInfo.healthStatus]);
    
    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('download', `patient_profile_${timestamp}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToastMessage("Profile data exported successfully!");
    setShowToast(true);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const toggleCardCollapse = (cardId) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleCall = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleSMS = (phoneNumber) => {
    window.open(`sms:${phoneNumber}`, '_self');
  };

  const handleEmail = (email) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handleExport = () => {
    // In a real app, this would generate and download a PDF/CSV
    alert('Export functionality would generate a PDF/CSV file with patient data');
  };

  const Card = ({ title, subtitle, icon, children, cardId, className = "" }) => {
    const isCollapsed = collapsedCards.has(cardId);
    
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div 
          className="p-6 cursor-pointer"
          onClick={() => isMobile && toggleCardCollapse(cardId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{subtitle}</p>
              </div>
            </div>
            {isMobile && (
              <span className={`transform transition-transform ${isCollapsed ? "rotate-180" : ""}`}>
                ▼
              </span>
            )}
          </div>
        </div>
        {(!isMobile || !isCollapsed) && (
          <div className="px-6 pb-6">
            {children}
          </div>
        )}
      </div>
    );
  };

  const ContactCard = ({ name, role, email, phone, specialty, photo, showActions = true }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          {photo ? (
            <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="text-blue-600 font-semibold text-sm">
              {getInitials(name)}
            </span>
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{name}</h4>
          <p className="text-sm text-gray-600">{role || specialty}</p>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>
      {showActions && (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEmail(email)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Send Email"
          >
            📧
          </button>
          <button
            onClick={() => handleCall(phone)}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Call"
          >
            📞
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
          <p className="text-gray-600">Manage patient information and contacts</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
          >
            <span>⬇️</span>
            <span>Export Profile Data</span>
          </button>
          <button
            onClick={handleEditModeToggle}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              isEditMode 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <span>{isEditMode ? "❌" : "✏️"}</span>
            <span>{isEditMode ? "Cancel" : "Edit Profile"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "overview", label: "Overview" },
            { key: "timeline", label: "Timeline" }
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
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information Card */}
          <Card
            title="Personal Information"
            subtitle="Basic patient details and contact information"
            icon="👤"
            cardId="personal"
          >
            <div className="space-y-4">
              {/* Patient Photo/Avatar */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  {(currentPatientData?.personalInfo.photo || patientData.personalInfo.photo) ? (
                    <img 
                      src={currentPatientData?.personalInfo.photo || patientData.personalInfo.photo} 
                      alt={currentPatientData?.personalInfo.fullName || patientData.personalInfo.fullName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-600 font-bold text-xl">
                      {getInitials(currentPatientData?.personalInfo.fullName || patientData.personalInfo.fullName)}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {currentPatientData?.personalInfo.fullName || patientData.personalInfo.fullName}
                  </h4>
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    getHealthStatusBadge(currentPatientData?.personalInfo.healthStatus || patientData.personalInfo.healthStatus).color
                  }`}>
                    <span>{getHealthStatusBadge(currentPatientData?.personalInfo.healthStatus || patientData.personalInfo.healthStatus).emoji}</span>
                    <span>{getHealthStatusBadge(currentPatientData?.personalInfo.healthStatus || patientData.personalInfo.healthStatus).text}</span>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Age</label>
                    {isEditMode ? (
                      <div>
                        {(() => {
                          const { value: ageInputValue, unit: ageInputUnit } = getAgeParts(editableData.age);
                          return (
                            <>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={ageInputValue}
                                  onChange={(e) => handleAgeValueChange(e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    validationErrors.age ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  placeholder={ageInputUnit === "months" ? "e.g., 6" : "e.g., 25"}
                                />
                                <select
                                  value={ageInputUnit}
                                  onChange={(e) => handleAgeUnitChange(e.target.value)}
                                  className="w-28 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                  <option value="years">Years</option>
                                  <option value="months">Months</option>
                                </select>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {ageInputUnit === "months"
                                  ? "Use months for babies under a year old."
                                  : "Use years for older children and adults."}
                              </p>
                            </>
                          );
                        })()}
                        {validationErrors.age && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.age}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900">{currentPatientData?.personalInfo.age || patientData.personalInfo.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    {isEditMode ? (
                      <select
                        defaultValue={editableData.gender || ''}
                        onChange={(e) => handleInputBlur('gender', e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{currentPatientData?.personalInfo.gender || patientData.personalInfo.gender}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  {isEditMode ? (
                    <div>
                      <input
                        type="email"
                        defaultValue={editableData.email || ''}
                        onKeyDown={(e) => handleEnterKey('email', e)}
                        onBlur={(e) => handleInputBlur('email', e)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter email and press Enter"
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900">{currentPatientData?.personalInfo.email || patientData.personalInfo.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  {isEditMode ? (
                    <div>
                      <input
                        type="tel"
                        defaultValue={editableData.phone || ''}
                        onKeyDown={(e) => handleEnterKey('phone', e)}
                        onBlur={(e) => handleInputBlur('phone', e)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter phone number and press Enter"
                      />
                      {validationErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900">{currentPatientData?.personalInfo.phone || patientData.personalInfo.phone}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={editableData.weight || ''}
                          onKeyDown={(e) => handleEnterKey('weight', e)}
                          onBlur={(e) => handleInputBlur('weight', e)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.weight ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="e.g., 70"
                        />
                        {validationErrors.weight && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.weight}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900">
                        {currentPatientData?.personalInfo.weight || patientData.personalInfo.weight || "Not set"}
                        {currentPatientData?.personalInfo.weight || patientData.personalInfo.weight ? " kg" : ""}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Height (cm)</label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={editableData.height || ''}
                          onKeyDown={(e) => handleEnterKey('height', e)}
                          onBlur={(e) => handleInputBlur('height', e)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.height ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="e.g., 175"
                        />
                        {validationErrors.height && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.height}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900">
                        {currentPatientData?.personalInfo.height || patientData.personalInfo.height || "Not set"}
                        {currentPatientData?.personalInfo.height || patientData.personalInfo.height ? " cm" : ""}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      defaultValue={editableData.fullName || ''}
                      onKeyDown={(e) => handleEnterKey('fullName', e)}
                      onBlur={(e) => handleInputBlur('fullName', e)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name and press Enter"
                    />
                  ) : (
                    <p className="text-gray-900">{currentPatientData?.personalInfo.fullName || patientData.personalInfo.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Medical Conditions</label>
                  {isEditMode ? (
                    <div className="mt-2">
                      {/* Display current conditions with remove buttons */}
                      <div className="mb-3">
                        {(editableData.medicalConditions || []).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {(editableData.medicalConditions || []).map((condition, index) => (
                              <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center space-x-2">
                                <span>{condition}</span>
                                <button
                                  onClick={() => handleRemoveMedicalCondition(condition)}
                                  className="text-red-600 hover:text-red-800 font-bold"
                                  title="Remove condition"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No medical conditions added yet</p>
                        )}
                      </div>
                      
                      {/* Add new condition input */}
                      <div>
                        <div className="flex space-x-2">
                          <input
                            ref={medicalConditionInputRef}
                            type="text"
                            defaultValue=""
                            onKeyPress={handleKeyPress}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Type conditions and press Enter to add them"
                          />
                          <button
                            onClick={() => handleAddMedicalCondition(medicalConditionInputRef)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                          >
                            <span>+</span>
                            <span>Add</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Type conditions separated by commas and press Enter to add them all at once.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {(currentPatientData?.personalInfo.medicalConditions || patientData.personalInfo.medicalConditions).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(currentPatientData?.personalInfo.medicalConditions || patientData.personalInfo.medicalConditions).map((condition, index) => (
                            <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                              {condition}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No medical conditions recorded</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Save/Cancel buttons when in edit mode */}
              {isEditMode && (
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleEditModeToggle}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <span>❌</span>
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || Object.keys(validationErrors).some(key => validationErrors[key])}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isSaving ? "⏳" : "✅"}</span>
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              )}
            </div>
          </Card>

        </div>
      ) : (
        /* Timeline Tab */
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {(currentPatientData?.timeline || patientData.timeline).map((event) => (
                <div key={event.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    event.severity === "high" ? "bg-red-500" :
                    event.severity === "medium" ? "bg-orange-500" :
                    "bg-green-500"
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <span className="text-sm text-gray-500">{formatTimeAgo(event.date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === "alert" ? "bg-red-100 text-red-800" :
                        event.type === "visit" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <span className="text-green-500 text-xl">✅</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
