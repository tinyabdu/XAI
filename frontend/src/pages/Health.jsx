import React, { useState, useEffect } from 'react';
import { Loader, RefreshCw, HeartPulse, Monitor, Cpu, HardDrive, Clock, Info } from 'lucide-react';
import { getHealth } from '../services/api';

function Gauge({ label, percent, status, detail, icon: Icon }) {
  const color = status === 'good' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = status === 'good' ? 'text-green-700' : status === 'warning' ? 'text-yellow-700' : 'text-red-700';
  const bg = status === 'good' ? 'bg-green-50 border-green-200' : status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-700 text-sm inline-flex items-center gap-2">{Icon && <Icon size={16} />}{label}</span>
        <span className={`text-lg font-bold ${textColor}`}>{percent}%</span>
      </div>
      <div className="w-full bg-white rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">{detail}</p>
      <span className={`inline-block mt-2 text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${textColor} ${bg} border`}>
        {status}
      </span>
    </div>
  );
}

export default function Health() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetch = async () => {
    try {
      const r = await getHealth();
      setData(r.data);
      setLastRefresh(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      setError('Could not fetch system health. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); const t = setInterval(fetch, 10000); return () => clearInterval(t); }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader className="animate-spin mr-2" size={20} /> Loading system health...</div>;
  if (error)   return <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">{error}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeartPulse className="text-blue-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-800">System Health</h2>
            <p className="text-sm text-gray-500">Live server resource monitoring auto-refreshes every 10 seconds</p>
          </div>
        </div>
        <div className="text-right">
          <button onClick={fetch} className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1">
            <RefreshCw size={14} /> Refresh
          </button>
          {lastRefresh && <p className="text-xs text-gray-400 mt-1">Last: {lastRefresh}</p>}
        </div>
      </div>

      {/* Uptime banner */}
      <div className="bg-blue-900 text-white rounded-xl px-6 py-4 flex items-center gap-4">
        <Clock className="text-blue-300" size={32} />
        <div>
          <div className="text-sm font-medium text-blue-200">Monitor Uptime</div>
          <div className="text-2xl font-bold">{data.monitor_uptime}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-blue-300">Last checked</div>
          <div className="text-sm font-mono">{new Date(data.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Gauge
          label="CPU Usage"
          percent={data.cpu.percent}
          status={data.cpu.status}
          detail="Processor load on the monitoring server"
          icon={Cpu}
        />
        <Gauge
          label="RAM Usage"
          percent={data.ram.percent}
          status={data.ram.status}
          detail={`${data.ram.used_gb} GB used of ${data.ram.total_gb} GB`}
          icon={Monitor}
        />
        <Gauge
          label="Disk Usage"
          percent={data.disk.percent}
          status={data.disk.status}
          detail={`${data.disk.used_gb} GB used of ${data.disk.total_gb} GB`}
          icon={HardDrive}
        />
      </div>

      {/* NCAIR note */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-2 inline-flex items-center gap-1.5"><Info size={16} /> About This Monitor (NCAIR Compliance)</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          This system health monitor is built in accordance with the <strong>National Center for Artificial Intelligence
          and Robotics (NCAIR) National AI Strategy (2024)</strong>. All AI decisions are logged and explained
          using SHAP and LIME so that the human administrator remains fully in control at all times.
          The system acts as a transparent digital deputy never a hidden black box.
        </p>
      </div>
    </div>
  );
}
