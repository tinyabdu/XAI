import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Loader, Activity, CheckCircle, Ban, AlertTriangle } from 'lucide-react';
import { getReport } from '../services/api';
import StatCard from '../components/StatCard';
import ShapChart from '../components/ShapChart';

const PIE_COLORS = { low: '#16a34a', medium: '#d97706', high: '#ea580c', critical: '#dc2626' };
const LABEL_COLORS = ['#2563eb', '#dc2626', '#d97706', '#16a34a'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReport(30, 8)
      .then(r => setData(r.data))
      .catch(() => setError('Could not connect to backend. Make sure FastAPI is running on port 8000.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500 text-lg"><Loader className="animate-spin mr-2" size={20} /> Loading dashboard...</div>;
  if (error)   return <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">{error}</div>;

  const { summary = {}, risk_breakdown = {}, label_breakdown = {}, global_shap } = data;

  const riskPie = Object.entries(risk_breakdown).map(([name, value]) => ({ name, value }));
  const labelBar = Object.entries(label_breakdown).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Overview</h2>
        <p className="text-sm text-gray-500">Last {summary.monitored_hours} hours of monitored traffic</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Events"  value={summary.total_events} icon={<Activity size={24} />} color="blue" />
        <StatCard label="Allowed"       value={summary.allowed}      icon={<CheckCircle size={24} />} color="green" />
        <StatCard label="Blocked"       value={summary.blocked}      icon={<Ban size={24} />} color="red" />
        <StatCard label="Flagged"       value={summary.flagged}      icon={<AlertTriangle size={24} />} color="yellow" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk breakdown pie */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Risk Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {riskPie.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Label bar chart */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Traffic Classification</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={labelBar}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {labelBar.map((_, i) => <Cell key={i} fill={LABEL_COLORS[i % LABEL_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Global SHAP */}
      <ShapChart data={global_shap} title="Global SHAP Most Important Features Across All Decisions" />
    </div>
  );
}
