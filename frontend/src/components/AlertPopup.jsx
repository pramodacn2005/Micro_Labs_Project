import React, { useEffect } from "react";

export default function AlertPopup({ visible, messages, onClose }) {
  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg border-l-4 border-red-500">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-semibold text-red-700">Emergency Alert</h2>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-800">
          {messages.map((m, idx) => (
            <li key={idx} className="font-medium">{m}</li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-gray-500">Auto-dismisses in 15 seconds</span>
          <button 
            onClick={onClose} 
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}


