import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceArea } from "recharts";

export default function ChartComponent({ data, lines, thresholds }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => {
              try {
                return new Date(v).toLocaleTimeString();
              } catch {
                return v;
              }
            }}
          />
          <YAxis />
          <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
          <Legend />

          {thresholds && lines.map((l) => {
            const th = thresholds[l.key];
            if (!th || (th.min === undefined && th.max === undefined)) return null;
            const y1 = th.min !== undefined ? th.min : undefined;
            const y2 = th.max !== undefined ? th.max : undefined;
            if (y1 === undefined && y2 === undefined) return null;
            return (
              <ReferenceArea
                key={`band-${l.key}`}
                y1={y1}
                y2={y2}
                fill={l.color}
                fillOpacity={0.08}
                strokeOpacity={0}
              />
            );
          })}

          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} dot={false} name={l.label} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


