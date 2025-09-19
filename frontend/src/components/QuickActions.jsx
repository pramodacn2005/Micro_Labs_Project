import React, { useState } from "react";

export default function QuickActions({ onEmergency, onCallCaregiver, onViewMedications }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEmergencyClick = () => {
    setConfirmOpen(true);
  };

  const handleEmergencyConfirm = () => {
    setConfirmOpen(false);
    onEmergency?.();
  };

  return (
    <>
      <section className="bg-white rounded-card p-6 shadow-card border border-gray-200">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">⚠️</span>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          Emergency and health management options
        </p>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Emergency Alert - Primary action */}
          <button
            onClick={handleEmergencyClick}
            className="w-full rounded-lg bg-danger-500 py-3 px-4 text-white font-medium hover:bg-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-400 focus:ring-offset-2 transition-colors duration-200"
            aria-label="Send emergency alert"
          >
            🚨 Emergency Alert
          </button>

          {/* Secondary actions */}
          <button 
            onClick={onCallCaregiver}
            className="w-full rounded-lg border border-gray-300 py-2.5 px-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-colors duration-200"
          >
            📞 Call Caregiver
          </button>
          
          <button 
            onClick={onViewMedications}
            className="w-full rounded-lg border border-gray-300 py-2.5 px-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-colors duration-200"
          >
            💊 View Medications
          </button>
        </div>
      </section>

      {/* Emergency Confirmation Modal */}
      {confirmOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-modal-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-100">
                <span className="text-xl" aria-hidden="true">🚨</span>
              </div>
              <h3 id="emergency-modal-title" className="text-lg font-semibold text-gray-900">
                Send Emergency Alert?
              </h3>
            </div>
            
            <p className="mb-6 text-sm text-gray-600">
              This will immediately notify your caregiver and emergency contacts. 
              Only use this in genuine emergency situations.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyConfirm}
                className="rounded-lg bg-danger-500 px-4 py-2 text-sm font-medium text-white hover:bg-danger-600 focus:outline-none focus:ring-2 focus:ring-danger-400 focus:ring-offset-2"
              >
                Send Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


