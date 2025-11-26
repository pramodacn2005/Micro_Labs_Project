import React, { useState, useEffect } from 'react';

export default function ReminderNotification({ 
  medicine, 
  onMedicineTaken, 
  onVoiceConfirmation, 
  onDismiss 
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const scheduledTime = new Date(medicine.scheduledTime);
      const timeDiff = scheduledTime - now;
      
      if (timeDiff <= 0) {
        setTimeLeft('Due now');
      } else {
        const minutes = Math.floor(timeDiff / 60000);
        setTimeLeft(`In ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [medicine.scheduledTime]);

  const handleTakeMedicine = () => {
    onMedicineTaken(medicine.id);
    setIsVisible(false);
  };

  const handleVoiceInput = () => {
    onVoiceConfirmation(medicine.id);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">💊</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Medicine Reminder</h2>
              <p className="text-sm text-gray-600">{timeLeft}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Medicine Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {medicine.medicineName}
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="mr-2">💊</span>
              <span>Dosage: {medicine.dosage}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🕐</span>
              <span>
                Scheduled: {new Date(medicine.scheduledTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🍽️</span>
              <span className="capitalize">
                {medicine.foodTiming} food
              </span>
            </div>
            {medicine.instructions && (
              <div className="flex items-start">
                <span className="mr-2 mt-0.5">📝</span>
                <span>{medicine.instructions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleTakeMedicine}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
          >
            ✓ I Took This Medicine
          </button>
          
          <button
            onClick={handleVoiceInput}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
          >
            🎤 Voice Confirmation
          </button>
          
          <button
            onClick={handleDismiss}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Remind Me Later (5 min)
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <span className="text-sm text-yellow-700">
              Please take your medicine on time. If you don't confirm within {medicine.maxDelayMinutes} minutes, 
              an alert will be sent to your doctor/caregiver.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}



















