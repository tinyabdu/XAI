import React, { useState, useEffect, useCallback } from 'react';
import { Loader, RefreshCw, Database, Activity, CheckCircle, Ban, AlertTriangle, Archive } from 'lucide-react';
import { getLogs } from '../services/api';
import EventCard from '../components/EventCard';

export default function Logs() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [error, setError]     = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await getLogs(100);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not fetch logs. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader className="animate-spin mr-2" size={20} /> Loading logs...
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
      <p className="font-semibold">Error loading logs</p>
      <p className="text-sm mt-1">{error}</p>
      <button onClick={fetchLogs} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
        Retry
      </button>
    </div>
  );

  if (!data) return null;

  const events = data.events ?? data ?? [];
  const stats  = data.stats ?? {};

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.action === filter || e.risk === filter);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Database className="text-blue-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Stored Event Logs</h2>
            <p className="text-sm text-gray-500">All AI decisions saved to the database permanent record</p>
          </div>
        </div>
        <button onClick={fetchLogs}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Logged', value: stats.total,   icon: Activity,      color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Allowed',      value: stats.allowed, icon: CheckCircle,   color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Blocked',      value: stats.blocked, icon: Ban,           color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Flagged',      value: stats.flagged, icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <Icon size={20} className="mb-1" />
              <div className="text-2xl font-bold">{s.value ?? 0}</div>
              <div className="text-xs font-medium uppercase mt-1 opacity-70">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all','blocked','flagged','allowed','critical','high','medium','low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-2">{filtered.length} events</span>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <Archive className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="font-medium">No logs yet</p>
          <p className="text-sm mt-1">Go to <strong>Live Events</strong> and click <strong>Run Simulation</strong> first events will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
