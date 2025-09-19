import React from "react";

export default function AlertModal({ open, title, messages = [], onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-red-700">{title || "Emergency Alert"}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-800">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">Dismiss</button>
        </div>
      </div>
    </div>
  );
}


