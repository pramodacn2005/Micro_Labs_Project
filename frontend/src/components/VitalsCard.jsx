import React from "react";

const statusToColors = {
  normal: "bg-green-100 text-green-800 border-green-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  critical: "bg-red-100 text-red-800 border-red-300",
  unknown: "bg-gray-100 text-gray-800 border-gray-300"
};

export default function VitalsCard({ label, value, unit, status, timestamp }) {
  const color = statusToColors[status] || statusToColors.unknown;
  return (
    <div className={`border rounded-lg p-4 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs opacity-70">{timestamp ? new Date(timestamp).toLocaleTimeString() : "--"}</span>
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-2xl font-bold">{value ?? "--"}</span>
        {unit ? <span className="text-sm">{unit}</span> : null}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wide">{status}</div>
    </div>
  );
}


