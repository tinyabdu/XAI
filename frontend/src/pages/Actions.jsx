import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, Undo2, Flag, FileText, UserCheck, ClipboardCheck } from 'lucide-react';
import { getActions } from '../services/api';

const ACTION_STYLE = {
  confirm:  'bg-green-100 text-green-700 border-green-200',
  override: 'bg-blue-100 text-blue-700 border-blue-200',
  flag:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  note:     'bg-gray-100 text-gray-700 border-gray-200',
};

const ACTION_LUCIDE = {
  confirm:  CheckCircle,
  override: Undo2,
  flag:     Flag,
  note:     FileText,
};

export default function Actions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActions()
      .then(r => setActions(r.data.actions ?? r.data ?? []))
      .catch(() => alert('Could not fetch actions.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader className="animate-spin mr-2" size={20} /> Loading actions...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="text-blue-600" size={24} />
        <div>
          <h2 className="text-xl font-bold text-gray-800">Admin Action History</h2>
          <p className="text-sm text-gray-500">Every decision the admin made full human-in-the-loop audit trail</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['confirm','override','flag','note'].map(a => {
          const count = actions.filter(x => x.action === a).length;
          const Icon = ACTION_LUCIDE[a];
          return (
            <div key={a} className={`rounded-xl border p-4 ${ACTION_STYLE[a]}`}>
              <Icon size={20} className="mb-1" />
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium uppercase mt-1 opacity-70">{a}s</div>
            </div>
          );
        })}
      </div>

      {actions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <UserCheck className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="font-medium">No admin actions yet</p>
          <p className="text-sm mt-1">Go to Events or Report, expand any event, and take an action.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, i) => {
                const Icon = ACTION_LUCIDE[a.action];
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 truncate max-w-[120px]">
                      {a.event_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_STYLE[a.action]}`}>
                        <Icon size={12} /> {a.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">{a.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NCAIR note */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-xs text-purple-700">
        <strong>Human-in-the-Loop Compliance (NCAIR 2024):</strong> Every admin action is permanently stored alongside the AI decision.
        This ensures the administrator is always the final authority — the AI assists but never acts alone.
      </div>
    </div>
  );
}
