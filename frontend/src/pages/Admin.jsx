import React, { useEffect, useState } from 'react';
import { Loader, Rocket, Users, CheckCircle2, XCircle, Clock, Inbox, ChevronDown, ChevronUp, RefreshCw, Download } from 'lucide-react';
import { getAdminApplications, runAdmission, downloadUrl } from '../services/api';
import { useDialogs } from '../components/Dialogs';

const STATUS_STYLE = {
  admitted:  'bg-green-100 text-green-800',
  waitlisted:'bg-yellow-100 text-yellow-800',
  rejected:  'bg-red-100 text-red-700',
  applied:   'bg-blue-100 text-blue-800',
};
const STATUS_LABEL = { admitted:'Admitted', waitlisted:'Waitlisted', rejected:'Rejected', applied:'Pending Review' };

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

export default function Admin() {
  const dialogs = useDialogs();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [overrideMsg, setOverrideMsg] = useState(null);

  const load = () => {
    setLoading(true);
    getAdminApplications()
      .then(r => { setData(r.data); setError(null); })
      .catch(() => setError('Could not connect to backend. Start FastAPI on port 8000.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRun = async () => {
    const ok = await dialogs.confirm('Run the AI admission engine on all pending applications now?', 'Run AI Admission');
    if (!ok) return;
    setRunning(true); setOverrideMsg(null); setRunResult(null);
    try {
      const r = await runAdmission();
      setRunResult(r.data.results);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to run admission.');
    } finally {
      setRunning(false);
    }
  };

  const handleOverride = async (id, status) => {
    const reason = await dialogs.prompt(`Reason for overriding to "${STATUS_LABEL[status]}"?`, 'Manual decision by the admissions officer.');
    if (reason === null) return;
    try {
      await import('../services/api').then(m => m.overrideApplication(id, { status, reason }));
      setOverrideMsg(`Updated application #${id} to ${STATUS_LABEL[status]}.`);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Override failed.');
    }
  };

  if (loading && !data) return <div className="flex items-center justify-center h-64 text-gray-500 text-lg"><Loader className="animate-spin mr-2" size={20} /> Loading applicants...</div>;

  const stats = data?.stats || { total:0, admitted:0, waitlisted:0, rejected:0, applied:0 };
  const apps = data?.applications || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Admissions Dashboard</h2>
          <p className="text-sm text-gray-500">Review applications and run the AI admission engine.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-blue-500 text-gray-600 inline-flex items-center gap-1.5"><RefreshCw size={15} /> Refresh</button>
          <button onClick={handleRun} disabled={running || stats.applied === 0}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
            {running ? <Loader className="animate-spin" size={16} /> : <Rocket size={16} />}
            {running ? 'Running AI...' : `Run AI Admission (${stats.applied} pending)`}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {overrideMsg && <div className="bg-purple-50 border border-purple-200 text-purple-700 text-sm rounded-xl px-4 py-3">{overrideMsg}</div>}

      {runResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <b>AI admission complete.</b> Evaluated {runResult.evaluated} applicant(s) →
          <span className="mx-1 font-semibold text-green-700">{runResult.admitted} admitted</span>·
          <span className="mx-1 font-semibold text-yellow-700">{runResult.waitlisted} waitlisted</span>·
          <span className="mx-1 font-semibold text-red-700">{runResult.rejected} rejected</span>
          {runResult.per_programme && Object.keys(runResult.per_programme).length > 0 && (
            <div className="mt-2">
              <div className="text-xs uppercase text-green-600 mb-1">By programme</div>
              {Object.entries(runResult.per_programme).map(([name, r]) => (
                <div key={name} className="text-xs">• {name}: {r.admitted} adm · {r.waitlisted} wl · {r.rejected} rej</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Users size={22} />} color="bg-blue-100 text-blue-700" />
        <StatCard label="Admitted" value={stats.admitted} icon={<CheckCircle2 size={22} />} color="bg-green-100 text-green-700" />
        <StatCard label="Waitlisted" value={stats.waitlisted} icon={<Inbox size={22} />} color="bg-yellow-100 text-yellow-700" />
        <StatCard label="Rejected" value={stats.rejected} icon={<XCircle size={22} />} color="bg-red-100 text-red-700" />
        <StatCard label="Pending Review" value={stats.applied} icon={<Loader size={22} />} color="bg-gray-100 text-gray-600" />
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-700">Applications ({apps.length})</h3>
        </div>
        {apps.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No applications submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 border-b">
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">JAMB</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(a => {
                  const st = STATUS_STYLE[a.status] || STATUS_STYLE.applied;
                  const open = expanded === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(open ? null : a.id)}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{a.full_name}</div>
                          <div className="text-xs text-gray-400">{a.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.programme_name || a.programme}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{a.jamb_score}</td>
                        <td className="px-4 py-3 font-medium">{a.ai_score != null ? a.ai_score : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs px-2 py-1 rounded-full ${st}`}>{a.status_label || 'Applied'}</span>
                          {a.admin_override && <span className="ml-1 text-[10px] text-purple-600">(admin)</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-gray-400 hover:text-blue-700 p-1">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs uppercase text-gray-400 mb-2">Bio Data</h4>
                                <dl className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                                  <div><dt className="text-gray-400">DOB</dt><dd>{a.date_of_birth || '—'}</dd></div>
                                  <div><dt className="text-gray-400">Gender</dt><dd>{a.gender || '—'}</dd></div>
                                  <div><dt className="text-gray-400">State</dt><dd>{a.state || '—'}</dd></div>
                                  <div><dt className="text-gray-400">Phone</dt><dd>{a.phone || '—'}</dd></div>
                                  <div className="col-span-2"><dt className="text-gray-400">Address</dt><dd>{a.address || '—'}</dd></div>
                                  <div><dt className="text-gray-400">JAMB Reg</dt><dd>{a.jamb_reg || '—'}</dd></div>
                                </dl>
                                <h4 className="text-xs uppercase text-gray-400 mt-4 mb-2">O-Level</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {(a.olevel || []).map((o, i) => (
                                    <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded ${['A1','B2','B3','C4','C5','C6'].includes(o.grade) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                      {o.subject}: <b>{o.grade}</b>
                                    </span>
                                  ))}
                                </div>
                              <h4 className="text-xs uppercase text-gray-400 mt-4 mb-2">Documents</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {(a.documents || []).map(d => (
                                    <a key={d.id} href={downloadUrl(d.id)} target="_blank" rel="noreferrer"
                                      className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1">
                                      <Download size={11} /> {d.doc_type} · {d.filename}
                                    </a>
                                  ))}
                                  {(!a.documents || a.documents.length === 0) && <span className="text-[11px] text-gray-400">None</span>}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs uppercase text-gray-400 mb-2">AI Decision</h4>
                                {a.ai_explanation && a.ai_explanation.length ? (
                                  <ol className="space-y-1.5 text-xs text-gray-700">
                                    {a.ai_explanation.map((line, i) => (
                                      <li key={i} className="flex gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>{line}</li>
                                    ))}
                                  </ol>
                                ) : <p className="text-xs text-gray-400">Not assessed yet. Click "Run AI Admission".</p>}
                                <div className="flex gap-2 mt-4 flex-wrap">
                                  <button onClick={() => handleOverride(a.id, 'admitted')} className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md">Admit</button>
                                  <button onClick={() => handleOverride(a.id, 'waitlisted')} className="text-xs px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md">Waitlist</button>
                                  <button onClick={() => handleOverride(a.id, 'rejected')} className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md">Reject</button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}