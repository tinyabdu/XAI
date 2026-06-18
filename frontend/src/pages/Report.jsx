import React, { useState } from 'react';
import { Loader, ClipboardList, Shield, FileText, AlertTriangle, FolderOpen } from 'lucide-react';
import { getReport } from '../services/api';
import EventCard from '../components/EventCard';

export default function Report() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(8);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await getReport(30, hours);
      setReport(r.data);
    } catch {
      alert('Backend not reachable. Start FastAPI on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 inline-flex items-center gap-2"><ClipboardList size={22} /> Admin Handover Report</h2>
          <p className="text-sm text-gray-500">Plain English summary of everything the AI did while you were away</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value={4}>Last 4 hours</option>
            <option value={8}>Last 8 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
          </select>
          <button onClick={generate} disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? <><Loader className="animate-spin inline mr-1" size={16} /> Generating...</> : <><ClipboardList className="inline mr-1" size={16} /> Generate Report</>}
          </button>
        </div>
      </div>

      {!report && !loading && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <ClipboardList className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-lg font-medium">No report yet</p>
          <p className="text-sm mt-1">Click "Generate Report" to see what the AI did during your absence</p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary box */}
          <div className="bg-blue-900 text-white rounded-xl p-6">
            <h3 className="text-lg font-bold mb-1 inline-flex items-center gap-2"><Shield size={20} /> AI Shift Summary</h3>
            <p className="text-blue-200 text-sm mb-4">Monitored period: {report.summary?.monitored_hours ?? '?'} hours</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Events', value: report.summary?.total_events, color: 'text-white' },
                { label: 'Allowed',      value: report.summary?.allowed,      color: 'text-green-300' },
                { label: 'Blocked',      value: report.summary?.blocked,      color: 'text-red-300' },
                { label: 'Flagged',      value: report.summary?.flagged,      color: 'text-yellow-300' },
              ].map(s => (
                <div key={s.label} className="bg-blue-800 rounded-lg p-3 text-center">
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value ?? 0}</div>
                  <div className="text-blue-300 text-xs mt-1 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plain-English narrative */}
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-600">
            <h3 className="font-semibold text-gray-700 mb-2 inline-flex items-center gap-2"><FileText size={16} /> What Happened While You Were Away</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              During the past <strong>{report.summary?.monitored_hours ?? '?'} hours</strong>, the AI monitored{' '}
              <strong>{report.summary?.total_events ?? 0} traffic events</strong>.{' '}
              Out of these, <strong className="text-green-600">{report.summary?.allowed ?? 0} were allowed</strong> as normal traffic,{' '}
              <strong className="text-red-600">{report.summary?.blocked ?? 0} were automatically blocked</strong> due to high risk behaviour (brute-force or DDoS patterns),
              and <strong className="text-yellow-600">{report.summary?.flagged ?? 0} were flagged</strong> as suspicious for your review.
              {(report.summary?.blocked ?? 0) > 0 && ' The blocked events were stopped before they could cause any harm.'}
              {(report.summary?.flagged ?? 0) > 0 && ' Please review the flagged events below and decide whether to block or allow them.'}
            </p>
          </div>

          {/* Top threats */}
          {(report.top_threats ?? []).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 inline-flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Top Threats Detected</h3>
              <div className="space-y-3">
                {report.top_threats.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}

          {/* All events */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 inline-flex items-center gap-2"><FolderOpen size={16} /> All Events ({(report.all_events ?? []).length})</h3>
            <div className="space-y-2">
              {(report.all_events ?? []).map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
