import React, { useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, Undo2, Flag, FileText, UserCheck } from 'lucide-react';
import { RiskBadge, ActionBadge } from './RiskBadge';
import ShapChart from './ShapChart';
import { postAction } from '../services/api';

const ACTION_BUTTONS = [
  { action: 'confirm',  label: 'Confirm',  icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white',          help: 'You agree with the AI decision' },
  { action: 'override', label: 'Override', icon: Undo2,       color: 'bg-blue-600 hover:bg-blue-700 text-white',            help: 'AI was wrong — reverse the decision' },
  { action: 'flag',     label: 'Flag',     icon: Flag,        color: 'bg-yellow-500 hover:bg-yellow-600 text-white',        help: 'Mark this event for further review' },
  { action: 'note',     label: 'Note',     icon: FileText,    color: 'bg-gray-200 hover:bg-gray-300 text-gray-800',         help: 'Add a comment to this event' },
];

export default function EventCard({ event }) {
  const [open, setOpen]           = useState(false);
  const [saved, setSaved]         = useState(null);
  const [noteText, setNoteText]   = useState('');
  const [showNote, setShowNote]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const time = new Date(event.timestamp).toLocaleTimeString();

  const handleAction = async (action) => {
    if (action === 'note') { setShowNote(v => !v); return; }
    setLoading(true);
    try {
      await postAction({ event_id: event.id, action, new_label: null, note: null });
      setSaved(action);
    } catch { alert('Could not save action.'); }
    finally { setLoading(false); }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setLoading(true);
    try {
      await postAction({ event_id: event.id, action: 'note', new_label: null, note: noteText });
      setSaved('note');
      setShowNote(false);
      setNoteText('');
    } catch { alert('Could not save note.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-gray-500">{time}</span>
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{event.ip}</span>
          <span className="text-sm font-semibold text-gray-700 capitalize">{event.label?.replace('_', ' ') || ''}</span>
          <span className="text-xs text-gray-400">{event.confidence}% conf.</span>
          {saved && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
              <UserCheck size={12} /> Admin: {saved}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge risk={event.risk} />
          <ActionBadge action={event.action} />
          <span className="text-gray-400 ml-2">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">

          {/* Admin Action Bar */}
          <div className="mt-4 bg-white rounded-lg p-3 shadow-sm border border-purple-100">
            <h4 className="text-xs font-bold text-purple-700 uppercase mb-2 inline-flex items-center gap-1.5">
              <UserCheck size={14} /> Admin Actions — Human in the Loop
            </h4>
            <div className="flex flex-wrap gap-2">
              {ACTION_BUTTONS.map(btn => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.action}
                    onClick={() => handleAction(btn.action)}
                    disabled={loading}
                    title={btn.help}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${btn.color} ${saved === btn.action ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`}
                  >
                    <Icon size={14} /> {btn.label}
                  </button>
                );
              })}
            </div>

            {showNote && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Type your note here..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                />
                <button onClick={submitNote} disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                  Save
                </button>
              </div>
            )}

            {saved && (
              <p className="text-xs text-purple-600 mt-2 font-medium">
                Action "{saved}" recorded for this event.
              </p>
            )}
          </div>

          {/* Input values + SHAP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Traffic Input</h4>
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(event.input || {}).map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-50">
                      <td className="py-1 text-gray-500">{k}</td>
                      <td className="py-1 font-mono font-semibold text-right">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ShapChart data={event.shap} title="SHAP — Why this decision?" />
          </div>

          {/* LIME */}
          <div className="mt-4 bg-white rounded-lg p-3 shadow-sm">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">LIME — Local Explanation</h4>
            <div className="flex flex-wrap gap-2">
              {(event.lime || []).map((l, i) => (
                <span key={i}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    l.weight > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  {l.feature} ({l.weight > 0 ? '+' : ''}{l.weight.toFixed(3)})
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">+ = pushed toward detected class · − = pushed away</p>
          </div>
        </div>
      )}
    </div>
  );
}
