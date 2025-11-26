import React, { useState } from 'react';

const VitalAlertTester = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('test-device-001');
  const [patientName, setPatientName] = useState('John Doe');
  const [patientEmail, setPatientEmail] = useState('john.doe@example.com');

  const testScenarios = [
    {
      name: 'Normal readings',
      vitals: { heartRate: 75, spo2: 98, bodyTemp: 36.5, ambientTemp: 22, accMagnitude: 1.2 }
    },
    {
      name: '1st Abnormal reading',
      vitals: { heartRate: 110, spo2: 88, bodyTemp: 38.5, ambientTemp: 22, accMagnitude: 1.2 }
    },
    {
      name: '2nd Abnormal reading',
      vitals: { heartRate: 115, spo2: 87, bodyTemp: 38.8, ambientTemp: 22, accMagnitude: 1.2 }
    },
    {
      name: '3rd Abnormal reading (should trigger email)',
      vitals: { heartRate: 120, spo2: 86, bodyTemp: 39.0, ambientTemp: 22, accMagnitude: 1.2 }
    },
    {
      name: 'Normal readings (reset counters)',
      vitals: { heartRate: 78, spo2: 97, bodyTemp: 36.8, ambientTemp: 22, accMagnitude: 1.2 }
    }
  ];

  const runTest = async (scenario) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/vital-alerts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceId,
          vitals: scenario.vitals,
          patientData: {
            patientName: patientName,
            patientId: deviceId,
            email: patientEmail
          }
        })
      });

      const result = await response.json();
      
      setTestResults(prev => [...prev, {
        scenario: scenario.name,
        vitals: scenario.vitals,
        result: result,
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (error) {
      console.error('Test error:', error);
      setTestResults(prev => [...prev, {
        scenario: scenario.name,
        vitals: scenario.vitals,
        result: { error: error.message },
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
    setIsLoading(false);
  };

  const runAllTests = async () => {
    setTestResults([]);
    for (const scenario of testScenarios) {
      await runTest(scenario);
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getStatusColor = (result) => {
    if (result.error) return 'text-red-600';
    if (result.result?.abnormalVitals?.length > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🧪 Vital Alert Email System Tester</h2>
      
      {/* Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Email</label>
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        <button
          onClick={() => setTestResults([])}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      {/* Test Scenarios */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Test Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testScenarios.map((scenario, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">{scenario.name}</h4>
              <div className="text-sm text-gray-600 mb-3">
                {Object.entries(scenario.vitals).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}:</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => runTest(scenario)}
                disabled={isLoading}
                className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                Test
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Test Results</h3>
          <div className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800">{test.scenario}</h4>
                  <span className="text-sm text-gray-500">{test.timestamp}</span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Vitals:</strong> {JSON.stringify(test.vitals)}
                </div>
                
                <div className={`text-sm ${getStatusColor(test.result)}`}>
                  <strong>Result:</strong> {JSON.stringify(test.result, null, 2)}
                </div>
                
                {test.result?.abnormalVitals?.length > 0 && (
                  <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded">
                    <strong className="text-orange-800">⚠️ Email Alert Triggered!</strong>
                    <div className="text-orange-700 text-sm">
                      Abnormal vitals: {test.result.abnormalVitals.map(v => v.metric).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📧 How to Test Email Alerts</h3>
        <div className="text-blue-700 text-sm space-y-1">
          <p>1. Make sure your backend server is running on port 4000</p>
          <p>2. Configure email settings in your .env file (GMAIL_USER, GMAIL_PASS, DOCTOR_EMAIL)</p>
          <p>3. Run the test scenarios in sequence to see the consecutive counter logic</p>
          <p>4. The 3rd abnormal reading should trigger an email alert</p>
          <p>5. Check your email inbox for the alert notification</p>
        </div>
      </div>
    </div>
  );
};

export default VitalAlertTester;

















