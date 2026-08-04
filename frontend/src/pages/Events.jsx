import React, { useState, useEffect } from 'react';
import { Loader, Play, Radio, Search } from 'lucide-react';
import { getSimulate, connectLive } from '../services/api';
import EventCard from '../components/EventCard';

const MAX_LIVE = 300;

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [message, setMessage] = useState(null);
  const [liveStatus, setLiveStatus] = useState('connecting');

  useEffect(() => {
    let ws;
    let retry;

    const connect = () => {
      ws = connectLive({
        onEvent: (ev) => setEvents(prev => [ev, ...prev].slice(0, MAX_LIVE)),
        onStatus: (s) => {
          setLiveStatus(s);
          if (s === 'disconnected') {
            clearTimeout(retry);
            retry = setTimeout(connect, 3000);
          }
        },
      });
    };

    connect();
    return () => { clearTimeout(retry); ws?.close(); };
  }, []);

  const simulate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await getSimulate(20, 8);
      const list = r.data?.events ?? r.data ?? [];
      setEvents(prev => [...list, ...prev].slice(0, MAX_LIVE));
      setMessage({ type: 'success', text: `${r.data?.count ?? list.length} events generated and saved to logs.` });
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      setMessage({ type: 'error', text: `Error: ${detail}` });
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.action === filter || e.risk === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Search className="text-blue-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Live Traffic Events</h2>
            <p className="text-sm text-gray-500">Real-time AI monitoring — traffic streams in automatically. Click any event to see SHAP & LIME explanation and take action</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            liveStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200'
            : liveStatus === 'connecting' ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              liveStatus === 'connected' ? 'bg-green-500 animate-pulse'
              : liveStatus === 'connecting' ? 'bg-blue-500 animate-pulse'
              : 'bg-red-500'
            }`} />
            {liveStatus === 'connected' ? 'LIVE' : liveStatus === 'connecting' ? 'Connecting...' : 'Offline · retrying'}
          </span>
          <button onClick={simulate} disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? <><Loader className="animate-spin inline mr-1" size={16} /> Simulating...</> : <><Play className="inline mr-1" size={16} /> Run Simulation</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`text-sm rounded-lg px-4 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {events.length > 0 && (
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
      )}

      {events.length === 0 && !loading && !message && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <Radio className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-lg font-medium">Listening for live traffic...</p>
          <p className="text-sm mt-1">New AI decisions will appear here automatically, or click <strong>Run Simulation</strong> to generate a batch now</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(e => <EventCard key={e.id} event={e} />)}
      </div>
    </div>
  );
}
