import React, { useState, useEffect } from 'react';

export default function MedicineCard({ 
  medicine, 
  onMedicineTaken, 
  onVoiceConfirmation, 
  isTaken = false 
}) {
  const [timeUntil, setTimeUntil] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [canTake, setCanTake] = useState(false);

  useEffect(() => {
    const updateTimeStatus = () => {
      const now = new Date();
      const scheduledTime = new Date(medicine.scheduledTime);
      const timeDiff = scheduledTime - now;
      
      if (timeDiff <= 0) {
        // Medicine is due or overdue
        const overdueMinutes = Math.floor(Math.abs(timeDiff) / (1000 * 60));
        setIsOverdue(overdueMinutes > medicine.maxDelayMinutes);
        setCanTake(true);
        
        if (overdueMinutes === 0) {
          setTimeUntil('Due now');
        } else if (overdueMinutes < 60) {
          setTimeUntil(`${overdueMinutes}m overdue`);
        } else {
          const hours = Math.floor(overdueMinutes / 60);
          const minutes = overdueMinutes % 60;
          setTimeUntil(`${hours}h ${minutes}m overdue`);
        }
      } else {
        // Medicine is upcoming
        setIsOverdue(false);
        setCanTake(false);
        
        if (timeDiff < 60000) { // Less than 1 minute
          setTimeUntil('Due soon');
        } else if (timeDiff < 3600000) { // Less than 1 hour
          const minutes = Math.floor(timeDiff / 60000);
          setTimeUntil(`In ${minutes}m`);
        } else {
          const hours = Math.floor(timeDiff / 3600000);
          const minutes = Math.floor((timeDiff % 3600000) / 60000);
          setTimeUntil(`In ${hours}h ${minutes}m`);
        }
      }
    };

    updateTimeStatus();
    const interval = setInterval(updateTimeStatus, 1000);

    return () => clearInterval(interval);
  }, [medicine.scheduledTime, medicine.maxDelayMinutes]);

  const handleTakeMedicine = () => {
    onMedicineTaken(medicine.id);
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Voice recognition started');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice input:', transcript);
        
        // Check if user confirmed taking medicine
        if (transcript.includes('yes') || transcript.includes('taken') || transcript.includes('done')) {
          onVoiceConfirmation(medicine.id);
        }
      };

      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
      };

      recognition.start();
    } else {
      alert('Voice recognition not supported in this browser');
    }
  };

  const getStatusColor = () => {
    if (isTaken) return 'bg-green-100 text-green-800';
    if (isOverdue) return 'bg-red-100 text-red-800';
    if (canTake) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (isTaken) return 'Taken';
    if (isOverdue) return 'Overdue';
    if (canTake) return 'Due';
    return 'Upcoming';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
      isTaken ? 'border-green-500' : 
      isOverdue ? 'border-red-500' : 
      canTake ? 'border-yellow-500' : 'border-blue-500'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {medicine.medicineName}
          </h3>
          <p className="text-sm text-gray-600">
            {medicine.dosage}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">🕐</span>
          <span>
            {new Date(medicine.scheduledTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <span className="ml-2 text-xs text-gray-500">({timeUntil})</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">🍽️</span>
          <span className="capitalize">
            {medicine.foodTiming} food
          </span>
        </div>

        {medicine.instructions && (
          <div className="flex items-start text-sm text-gray-600">
            <span className="mr-2 mt-0.5">📝</span>
            <span>{medicine.instructions}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isTaken && canTake && (
        <div className="space-y-2">
          <button
            onClick={handleTakeMedicine}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            ✓ Mark as Taken
          </button>
          
          <button
            onClick={handleVoiceInput}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🎤 Voice Confirmation
          </button>
        </div>
      )}

      {isTaken && (
        <div className="text-center text-green-600 font-medium">
          ✓ Medicine taken successfully
        </div>
      )}

      {!canTake && !isTaken && (
        <div className="text-center text-gray-500 text-sm">
          Medicine not yet due
        </div>
      )}

      {/* Overdue Warning */}
      {isOverdue && !isTaken && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-sm text-red-700 font-medium">
              This medicine is overdue! Please take it as soon as possible.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}



















