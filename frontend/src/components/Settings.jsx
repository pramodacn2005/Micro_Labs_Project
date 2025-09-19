import React, { useState, useEffect } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("vital-thresholds");
  const [settings, setSettings] = useState({
    vitalThresholds: {
      heartRate: { min: 60, max: 100 },
      bloodOxygen: { min: 95 },
      bodyTemperature: { min: 36.1, max: 37.2 },
      bloodPressure: { systolic: { min: 90, max: 140 }, diastolic: { min: 60, max: 90 } }
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true,
      alertFrequency: "immediate", // immediate, hourly, daily
      quietHours: { enabled: false, start: "22:00", end: "08:00" }
    },
    deviceStatus: {
      autoSync: true,
      syncInterval: 30, // seconds
      batteryAlert: true,
      batteryThreshold: 20, // percentage
      signalAlert: true,
      signalThreshold: 30 // percentage
    }
  });
  
  const [originalSettings, setOriginalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setOriginalSettings(JSON.parse(JSON.stringify(settings)));
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(hasChanges);
  }, [settings, originalSettings]);

  const validateVitalThresholds = (vitals) => {
    const errors = {};
    
    // Heart Rate validation
    if (vitals.heartRate.min >= vitals.heartRate.max) {
      errors.heartRate = "Minimum must be less than maximum";
    }
    if (vitals.heartRate.min < 30 || vitals.heartRate.max > 200) {
      errors.heartRate = "Heart rate must be between 30-200 BPM";
    }
    
    // Blood Oxygen validation
    if (vitals.bloodOxygen.min < 70 || vitals.bloodOxygen.min > 100) {
      errors.bloodOxygen = "Blood oxygen must be between 70-100%";
    }
    
    // Body Temperature validation
    if (vitals.bodyTemperature.min >= vitals.bodyTemperature.max) {
      errors.bodyTemperature = "Minimum must be less than maximum";
    }
    if (vitals.bodyTemperature.min < 30 || vitals.bodyTemperature.max > 45) {
      errors.bodyTemperature = "Temperature must be between 30-45°C";
    }
    
    // Blood Pressure validation
    if (vitals.bloodPressure.systolic.min >= vitals.bloodPressure.systolic.max) {
      errors.bloodPressureSystolic = "Systolic minimum must be less than maximum";
    }
    if (vitals.bloodPressure.diastolic.min >= vitals.bloodPressure.diastolic.max) {
      errors.bloodPressureDiastolic = "Diastolic minimum must be less than maximum";
    }
    if (vitals.bloodPressure.systolic.min < 60 || vitals.bloodPressure.systolic.max > 250) {
      errors.bloodPressureSystolic = "Systolic pressure must be between 60-250 mmHg";
    }
    if (vitals.bloodPressure.diastolic.min < 30 || vitals.bloodPressure.diastolic.max > 150) {
      errors.bloodPressureDiastolic = "Diastolic pressure must be between 30-150 mmHg";
    }
    
    return errors;
  };

  const handleVitalChange = (vital, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setSettings(prev => ({
      ...prev,
      vitalThresholds: {
        ...prev.vitalThresholds,
        [vital]: {
          ...prev.vitalThresholds[vital],
          [field]: numValue
        }
      }
    }));
    
    // Clear validation errors for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[vital];
      delete newErrors[`${vital}${field.charAt(0).toUpperCase() + field.slice(1)}`];
      return newErrors;
    });
  };

  const handleBloodPressureChange = (type, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setSettings(prev => ({
      ...prev,
      vitalThresholds: {
        ...prev.vitalThresholds,
        bloodPressure: {
          ...prev.vitalThresholds.bloodPressure,
          [type]: {
            ...prev.vitalThresholds.bloodPressure[type],
            [field]: numValue
          }
        }
      }
    }));
    
    // Clear validation errors
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`bloodPressure${type.charAt(0).toUpperCase() + type.slice(1)}`];
      return newErrors;
    });
  };

  const handleNotificationChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const handleDeviceChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      deviceStatus: {
        ...prev.deviceStatus,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Validate vital thresholds
    const vitalErrors = validateVitalThresholds(settings.vitalThresholds);
    if (Object.keys(vitalErrors).length > 0) {
      setValidationErrors(vitalErrors);
      setToastMessage("Please fix validation errors before saving.");
      setShowToast(true);
      return;
    }

    setIsSaving(true);
    
    try {
      // In a real app, this would save to Firebase/backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setValidationErrors({});
      
      setToastMessage("Settings saved successfully!");
      setShowToast(true);
    } catch (error) {
      setToastMessage("Failed to save settings. Please try again.");
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setValidationErrors({});
  };

  const TabButton = ({ tabId, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? "bg-blue-100 text-blue-700 border border-blue-200"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </button>
  );

  const InputField = ({ 
    id, 
    label, 
    type = "number", 
    value, 
    onChange, 
    min, 
    max, 
    step, 
    error, 
    helpText, 
    disabled = false,
    className = ""
  }) => (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-500" : "border-gray-300"
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        aria-describedby={helpText ? `${id}-help` : undefined}
      />
      {helpText && (
        <p id={`${id}-help`} className="text-xs text-gray-500 mt-1">
          {helpText}
        </p>
      )}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );

  const VitalCard = ({ title, icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure vital sign thresholds and notification preferences</p>
        </div>
        
        {hasChanges && (
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{isSaving ? "⏳" : "💾"}</span>
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          <TabButton
            tabId="vital-thresholds"
            label="Vital Thresholds"
            isActive={activeTab === "vital-thresholds"}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="notifications"
            label="Notifications"
            isActive={activeTab === "notifications"}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="device-status"
            label="Device Status"
            isActive={activeTab === "device-status"}
            onClick={setActiveTab}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "vital-thresholds" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">⚙️</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Vital Sign Thresholds</h2>
                <p className="text-gray-600">Configure normal ranges for your vital signs. Readings outside these ranges will trigger alerts.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heart Rate */}
            <VitalCard title="Heart Rate (BPM)" icon="❤️">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  id="heart-rate-min"
                  label="Minimum"
                  value={settings.vitalThresholds.heartRate.min}
                  onChange={(value) => handleVitalChange('heartRate', 'min', value)}
                  min="30"
                  max="200"
                  error={validationErrors.heartRate}
                  helpText="Current range: 60-100 BPM"
                />
                <InputField
                  id="heart-rate-max"
                  label="Maximum"
                  value={settings.vitalThresholds.heartRate.max}
                  onChange={(value) => handleVitalChange('heartRate', 'max', value)}
                  min="30"
                  max="200"
                />
              </div>
            </VitalCard>

            {/* Blood Oxygen */}
            <VitalCard title="Blood Oxygen (SpO₂)" icon="🌊">
              <InputField
                id="blood-oxygen-min"
                label="Minimum (%)"
                value={settings.vitalThresholds.bloodOxygen.min}
                onChange={(value) => handleVitalChange('bloodOxygen', 'min', value)}
                min="70"
                max="100"
                error={validationErrors.bloodOxygen}
                helpText="Current minimum: 95%"
              />
            </VitalCard>

            {/* Body Temperature */}
            <VitalCard title="Body Temperature (°C)" icon="🌡️">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  id="temperature-min"
                  label="Minimum"
                  value={settings.vitalThresholds.bodyTemperature.min}
                  onChange={(value) => handleVitalChange('bodyTemperature', 'min', value)}
                  min="30"
                  max="45"
                  step="0.1"
                  error={validationErrors.bodyTemperature}
                  helpText="Current range: 36.1°C - 37.2°C"
                />
                <InputField
                  id="temperature-max"
                  label="Maximum"
                  value={settings.vitalThresholds.bodyTemperature.max}
                  onChange={(value) => handleVitalChange('bodyTemperature', 'max', value)}
                  min="30"
                  max="45"
                  step="0.1"
                />
              </div>
            </VitalCard>

            {/* Blood Pressure */}
            <VitalCard title="Blood Pressure (mmHg)" icon="🩸">
              <div className="space-y-4">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700 mb-3">Systolic (Top Number)</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      id="systolic-min"
                      label="Min"
                      value={settings.vitalThresholds.bloodPressure.systolic.min}
                      onChange={(value) => handleBloodPressureChange('systolic', 'min', value)}
                      min="60"
                      max="250"
                      error={validationErrors.bloodPressureSystolic}
                    />
                    <InputField
                      id="systolic-max"
                      label="Max"
                      value={settings.vitalThresholds.bloodPressure.systolic.max}
                      onChange={(value) => handleBloodPressureChange('systolic', 'max', value)}
                      min="60"
                      max="250"
                    />
                  </div>
                </fieldset>
                
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700 mb-3">Diastolic (Bottom Number)</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      id="diastolic-min"
                      label="Min"
                      value={settings.vitalThresholds.bloodPressure.diastolic.min}
                      onChange={(value) => handleBloodPressureChange('diastolic', 'min', value)}
                      min="30"
                      max="150"
                      error={validationErrors.bloodPressureDiastolic}
                    />
                    <InputField
                      id="diastolic-max"
                      label="Max"
                      value={settings.vitalThresholds.bloodPressure.diastolic.max}
                      onChange={(value) => handleBloodPressureChange('diastolic', 'max', value)}
                      min="30"
                      max="150"
                    />
                  </div>
                </fieldset>
              </div>
            </VitalCard>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">🔔</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                <p className="text-gray-600">Configure how and when you receive alerts and notifications.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Methods</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => handleNotificationChange('emailAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Email Alerts</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.smsAlerts}
                    onChange={(e) => handleNotificationChange('smsAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">SMS Alerts</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Push Notifications</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Frequency</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="alert-frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Frequency
                  </label>
                  <select
                    id="alert-frequency"
                    value={settings.notifications.alertFrequency}
                    onChange={(e) => handleNotificationChange('alertFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly Summary</option>
                    <option value="daily">Daily Summary</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "device-status" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">📱</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Device Status</h2>
                <p className="text-gray-600">Configure device monitoring and synchronization settings.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Synchronization</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.deviceStatus.autoSync}
                    onChange={(e) => handleDeviceChange('autoSync', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto Sync</span>
                </label>
                
                <InputField
                  id="sync-interval"
                  label="Sync Interval (seconds)"
                  value={settings.deviceStatus.syncInterval}
                  onChange={(value) => handleDeviceChange('syncInterval', value)}
                  min="10"
                  max="300"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Battery Monitoring</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.deviceStatus.batteryAlert}
                    onChange={(e) => handleDeviceChange('batteryAlert', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Battery Alert</span>
                </label>
                
                <InputField
                  id="battery-threshold"
                  label="Battery Alert Threshold (%)"
                  value={settings.deviceStatus.batteryThreshold}
                  onChange={(value) => handleDeviceChange('batteryThreshold', value)}
                  min="5"
                  max="50"
                />
              </div>
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

