import React, { useEffect } from 'react';

export default function SuccessPopup({ isVisible, message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
        <div className="text-2xl">✅</div>
        <div>
          <div className="font-semibold">Success!</div>
          <div className="text-sm opacity-90">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}




















