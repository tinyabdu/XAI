import React from 'react';

const STYLES = {
  critical: 'bg-red-100 text-red-800 border border-red-300',
  high:     'bg-orange-100 text-orange-800 border border-orange-300',
  medium:   'bg-yellow-100 text-yellow-800 border border-yellow-300',
  low:      'bg-green-100 text-green-800 border border-green-300',
};

const ACTION_STYLES = {
  blocked: 'bg-red-600 text-white',
  flagged: 'bg-yellow-500 text-white',
  allowed: 'bg-green-600 text-white',
};

export function RiskBadge({ risk }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STYLES[risk] || 'bg-gray-100 text-gray-600'}`}>
      {risk}
    </span>
  );
}

export function ActionBadge({ action }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${ACTION_STYLES[action] || 'bg-gray-500 text-white'}`}>
      {action}
    </span>
  );
}
