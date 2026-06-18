import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export default function ShapChart({ data, title = 'SHAP Feature Importance' }) {
  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => (b.value ?? b.importance) - (a.value ?? a.importance));

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(val) => [val.toFixed(4), 'SHAP value']}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine x={0} stroke="#ccc" />
          <Bar dataKey={data[0]?.value !== undefined ? 'value' : 'importance'} radius={[0, 4, 4, 0]}>
            {sorted.map((entry, i) => {
              const v = entry.value ?? entry.importance;
              return <Cell key={i} fill={v >= 0 ? '#2563eb' : '#dc2626'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2">Blue = pushed toward this class · Red = pushed away</p>
    </div>
  );
}
