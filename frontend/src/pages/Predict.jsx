import React, { useState } from 'react';
import { Loader, Search, CheckCircle, Ban, AlertTriangle } from 'lucide-react';
import { postPredict } from '../services/api';
import { RiskBadge, ActionBadge } from '../components/RiskBadge';
import ShapChart from '../components/ShapChart';

const FIELDS = [
  { key: 'ip_request_rate',  label: 'IP Request Rate (req/min)', type: 'number', step: '0.1', placeholder: '15.0' },
  { key: 'login_attempts',   label: 'Login Attempts',            type: 'number', step: '1',   placeholder: '3' },
  { key: 'failed_logins',    label: 'Failed Logins',             type: 'number', step: '1',   placeholder: '1' },
  { key: 'session_duration', label: 'Session Duration (sec)',     type: 'number', step: '1',   placeholder: '120' },
  { key: 'pages_visited',    label: 'Pages Visited',             type: 'number', step: '1',   placeholder: '5' },
  { key: 'request_size_kb',  label: 'Request Size (KB)',         type: 'number', step: '0.1', placeholder: '10.0' },
  { key: 'unique_endpoints', label: 'Unique Endpoints Hit',      type: 'number', step: '1',   placeholder: '4' },
  { key: 'time_of_day',      label: 'Time of Day (0–23 hr)',     type: 'number', step: '1',   placeholder: '14' },
];

const PRESETS = {
  'Normal User': { ip_request_rate: 8, login_attempts: 2, failed_logins: 0, session_duration: 300, pages_visited: 8, request_size_kb: 12, unique_endpoints: 4, time_of_day: 14 },
  'Brute Force': { ip_request_rate: 20, login_attempts: 35, failed_logins: 32, session_duration: 15, pages_visited: 1, request_size_kb: 0.5, unique_endpoints: 1, time_of_day: 3 },
  'DDoS Attack': { ip_request_rate: 650, login_attempts: 1, failed_logins: 0, session_duration: 3, pages_visited: 1, request_size_kb: 0.2, unique_endpoints: 1, time_of_day: 11 },
  'Suspicious':  { ip_request_rate: 90, login_attempts: 8, failed_logins: 6, session_duration: 12, pages_visited: 25, request_size_kb: 280, unique_endpoints: 18, time_of_day: 2 },
};

export default function Predict() {
  const [form, setForm] = useState({ ip_request_rate: '', login_attempts: '', failed_logins: '', session_duration: '', pages_visited: '', request_size_kb: '', unique_endpoints: '', time_of_day: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyPreset = (preset) => {
    setForm(PRESETS[preset]);
    setResult(null);
  };

  const submit = async () => {
    const payload = {};
    for (const f of FIELDS) {
      const v = parseFloat(form[f.key]);
      if (isNaN(v)) return alert(`Please fill in: ${f.label}`);
      payload[f.key] = v;
    }
    payload.login_attempts = Math.round(payload.login_attempts);
    payload.failed_logins  = Math.round(payload.failed_logins);
    payload.pages_visited  = Math.round(payload.pages_visited);
    payload.unique_endpoints = Math.round(payload.unique_endpoints);
    payload.time_of_day    = Math.round(payload.time_of_day);

    setLoading(true);
    try {
      const r = await postPredict(payload);
      setResult(r.data);
    } catch {
      alert('Backend not reachable. Start FastAPI on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Manual Prediction</h2>
        <p className="text-sm text-gray-500">Enter traffic features manually and get an AI decision with SHAP & LIME explanation</p>
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-gray-500 self-center">Quick presets:</span>
        {Object.keys(PRESETS).map(p => (
          <button key={p} onClick={() => applyPreset(p)}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:border-blue-500 hover:text-blue-700 transition-colors">
            {p}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input
                type={f.type}
                step={f.step}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => handleChange(f.key, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {loading ? <><Loader className="animate-spin inline mr-1" size={16} /> Analysing...</> : <><Search className="inline mr-1" size={16} /> Analyse Traffic</>}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Decision banner */}
          <div className={`rounded-xl p-5 ${result.action === 'allowed' ? 'bg-green-50 border border-green-200' : result.action === 'blocked' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{result.action === 'allowed' ? <CheckCircle className="text-green-500" size={36} /> : result.action === 'blocked' ? <Ban className="text-red-500" size={36} /> : <AlertTriangle className="text-yellow-500" size={36} />}</span>
              <div>
                <div className="font-bold text-lg capitalize text-gray-800">{result.label.replace('_', ' ')}</div>
                <div className="flex gap-2 mt-1">
                  <RiskBadge risk={result.risk} />
                  <ActionBadge action={result.action} />
                  <span className="text-xs text-gray-500 self-center">{result.confidence}% confidence</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ShapChart data={result.shap} title="SHAP — Feature contributions" />

            {/* LIME */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">LIME — Local Explanation</h3>
              <div className="space-y-2">
                {result.lime.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{l.feature}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${l.weight > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                             style={{ width: `${Math.min(Math.abs(l.weight) * 200, 100)}%` }} />
                      </div>
                      <span className={`font-mono w-14 text-right ${l.weight > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {l.weight > 0 ? '+' : ''}{l.weight.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
