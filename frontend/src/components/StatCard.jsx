import React from 'react';

export default function StatCard({ label, value, color = 'blue', icon }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${colors[color]}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      </div>
    </div>
  );
}
