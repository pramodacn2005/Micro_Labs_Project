import React, { useState, useEffect } from "react";

export default function PatientProfile() {
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

  // Mock patient data
  const patientData = {
    personalInfo: {
      fullName: "Pramoda CN",
      age: 65,
      gender: "Male",
      email: "cnpramoda@gmail.com",
      phone: "+1 (555) 123-4567",
      medicalConditions: ["Hypertension", "Type 2 Diabetes"],
      healthStatus: "stable", // stable, needs_attention, critical
      lastVitalsCheck: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      photo: null // null means no photo, will show initials
    },
    deviceInfo: {
      deviceId: "HM-001-A7B2C3",
      lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      batteryLevel: 87,
      signalStrength: "Strong",
      status: "online"
    },
    emergencyContact: {
      name: "Jane Smith",
      phone: "+1 (555) 987-6543",
      relationship: "Spouse",
      email: "jane.smith@email.com"
    },
    caregivers: [
      {
        id: 1,
        name: "Dr. Sarah Wilson",
        role: "Primary Caregiver",
        email: "sarah.wilson@hospital.com",
        phone: "+1 (555) 234-5678",
        specialty: "Internal Medicine",
        photo: null
      }
    ],
    doctors: [
      {
        id: 1,
        name: "Dr. Michael Chen",
        specialty: "Cardiology",
        email: "michael.chen@cardiology.com",
        phone: "+1 (555) 345-6789",
        photo: null
      },
      {
        id: 2,
        name: "Dr. Lisa Rodriguez",
        specialty: "Endocrinology",
        email: "lisa.rodriguez@endocrine.com",
        phone: "+1 (555) 456-7890",
        photo: null
      }
    ],
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

  // Initialize current patient data
  useEffect(() => {
    setCurrentPatientData(patientData);
  }, []);

  // Initialize editable data when entering edit mode
  useEffect(() => {
    if (isEditMode && currentPatientData) {
      setEditableData({ ...currentPatientData.personalInfo });
      setOriginalData({ ...currentPatientData.personalInfo });
      setValidationErrors({});
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
    const numAge = parseInt(age);
    if (isNaN(numAge) || numAge < 0 || numAge > 150) {
      return "Age must be a valid number between 0 and 150";
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

  const validateField = (field, value) => {
    switch (field) {
      case 'age':
        return validateAge(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      default:
        return null;
    }
  };

  // Edit mode handlers
  const handleEditModeToggle = () => {
    if (isEditMode) {
      // Cancel edit mode - revert changes
      setEditableData({ ...originalData });
      setValidationErrors({});
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
      // In a real app, this would save to Firebase/backend
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the current patient data with the new values
      setCurrentPatientData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...editableData }
      }));
      
      // Log the update for debugging
      console.log('Profile updated:', editableData);
      
      setOriginalData({ ...editableData });
      setIsEditMode(false);
      setValidationErrors({});
      
      setToastMessage("Profile updated successfully!");
      setShowToast(true);
    } catch (error) {
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
    csvData.push(['Medical Conditions', currentPatientData.personalInfo.medicalConditions.join('; ')]);
    csvData.push(['Health Status', currentPatientData.personalInfo.healthStatus]);
    
    // Add device information
    csvData.push(['', '']);
    csvData.push(['Device Information', '']);
    csvData.push(['Device ID', currentPatientData.deviceInfo.deviceId]);
    csvData.push(['Last Sync', currentPatientData.deviceInfo.lastSync.toISOString()]);
    csvData.push(['Battery Level', `${currentPatientData.deviceInfo.batteryLevel}%`]);
    csvData.push(['Signal Strength', currentPatientData.deviceInfo.signalStrength]);
    
    // Add emergency contact
    csvData.push(['', '']);
    csvData.push(['Emergency Contact', '']);
    csvData.push(['Contact Name', currentPatientData.emergencyContact.name]);
    csvData.push(['Contact Phone', currentPatientData.emergencyContact.phone]);
    csvData.push(['Relationship', currentPatientData.emergencyContact.relationship]);
    
    // Add caregivers
    csvData.push(['', '']);
    csvData.push(['Assigned Caregivers', '']);
    currentPatientData.caregivers.forEach((caregiver, index) => {
      csvData.push([`Caregiver ${index + 1}`, caregiver.name]);
      csvData.push([`Role ${index + 1}`, caregiver.role]);
      csvData.push([`Email ${index + 1}`, caregiver.email]);
      csvData.push([`Phone ${index + 1}`, caregiver.phone]);
    });
    
    // Add doctors
    csvData.push(['', '']);
    csvData.push(['Attending Doctors', '']);
    currentPatientData.doctors.forEach((doctor, index) => {
      csvData.push([`Doctor ${index + 1}`, doctor.name]);
      csvData.push([`Specialty ${index + 1}`, doctor.specialty]);
      csvData.push([`Email ${index + 1}`, doctor.email]);
      csvData.push([`Phone ${index + 1}`, doctor.phone]);
    });
    
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
                        <input
                          type="number"
                          value={editableData.age || ''}
                          onChange={(e) => handleFieldChange('age', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.age ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter age"
                        />
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
                        value={editableData.gender || ''}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
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
                        value={editableData.email || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter email"
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
                        value={editableData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter phone number"
                      />
                      {validationErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900">{currentPatientData?.personalInfo.phone || patientData.personalInfo.phone}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editableData.fullName || ''}
                      onChange={(e) => handleFieldChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  ) : (
                    <p className="text-gray-900">{currentPatientData?.personalInfo.fullName || patientData.personalInfo.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Medical Conditions</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(currentPatientData?.personalInfo.medicalConditions || patientData.personalInfo.medicalConditions).map((condition, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        {condition}
                      </span>
                    ))}
                  </div>
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

          {/* Device Information Card */}
          <Card
            title="Device Information"
            subtitle="Connected monitoring device details"
            icon="📱"
            cardId="device"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Online
                </span>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Device ID</label>
                <p className="text-gray-900 font-mono text-sm">{currentPatientData?.deviceInfo.deviceId || patientData.deviceInfo.deviceId}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Last Active</label>
                <p className="text-gray-900">{formatTimeAgo(currentPatientData?.deviceInfo.lastSync || patientData.deviceInfo.lastSync)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <span>🔋</span>
                    <span>Battery Level</span>
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${currentPatientData?.deviceInfo.batteryLevel || patientData.deviceInfo.batteryLevel}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{currentPatientData?.deviceInfo.batteryLevel || patientData.deviceInfo.batteryLevel}%</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <span>📶</span>
                    <span>Signal Strength</span>
                  </label>
                  <p className="text-gray-900 mt-1">{currentPatientData?.deviceInfo.signalStrength || patientData.deviceInfo.signalStrength}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Emergency Contact Card */}
          <Card
            title="Emergency Contact"
            subtitle="Primary contact for emergencies"
            icon="🚨"
            cardId="emergency"
            className="lg:col-span-2"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg">
                      {getInitials(patientData.emergencyContact.name)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {currentPatientData?.emergencyContact.name || patientData.emergencyContact.name}
                    </h4>
                    <p className="text-sm text-gray-600">{currentPatientData?.emergencyContact.relationship || patientData.emergencyContact.relationship}</p>
                    <p className="text-sm text-gray-900">{currentPatientData?.emergencyContact.phone || patientData.emergencyContact.phone}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCall(currentPatientData?.emergencyContact.phone || patientData.emergencyContact.phone)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                  >
                    <span>📞</span>
                    <span>Call</span>
                  </button>
                  <button
                    onClick={() => handleSMS(currentPatientData?.emergencyContact.phone || patientData.emergencyContact.phone)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <span>💬</span>
                    <span>SMS</span>
                  </button>
                  <button
                    onClick={() => handleEmail(currentPatientData?.emergencyContact.email || patientData.emergencyContact.email)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                  >
                    <span>📧</span>
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Assigned Caregivers Card */}
          <Card
            title="Assigned Caregivers"
            subtitle="Healthcare professionals monitoring your care"
            icon="👩‍⚕️"
            cardId="caregivers"
          >
            <div className="space-y-3">
              {(currentPatientData?.caregivers || patientData.caregivers).map((caregiver) => (
                <ContactCard
                  key={caregiver.id}
                  name={caregiver.name}
                  role={caregiver.role}
                  email={caregiver.email}
                  phone={caregiver.phone}
                  photo={caregiver.photo}
                />
              ))}
            </div>
          </Card>

          {/* Attending Doctors Card */}
          <Card
            title="Attending Doctors"
            subtitle="Medical doctors overseeing your treatment"
            icon="👨‍⚕️"
            cardId="doctors"
          >
            <div className="space-y-3">
              {(currentPatientData?.doctors || patientData.doctors).map((doctor) => (
                <ContactCard
                  key={doctor.id}
                  name={doctor.name}
                  role={doctor.specialty}
                  email={doctor.email}
                  phone={doctor.phone}
                  photo={doctor.photo}
                />
              ))}
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
