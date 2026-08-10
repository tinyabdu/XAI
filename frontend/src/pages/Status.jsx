import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, CheckCircle2, XCircle, Clock, GraduationCap, Info, AlertTriangle, Download } from 'lucide-react';
import { getMyApplication, downloadUrl } from '../services/api';

const DOC_LABELS = {
  passport: 'Passport Photo',
  olevel_cert: 'O-Level Certificate',
  jamb_result: 'JAMB Result',
  admission_form: 'Admission Form',
  birth_cert: 'Birth Certificate',
  local_govt: 'LG Identification',
  other: 'Document',
};
const docsLabel = (t) => DOC_LABELS[t] || t;

const STATUS_STYLE = {
  admitted:  { color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle2 },
  waitlisted: { color: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: Clock },
  rejected:  { color: 'bg-red-50 border-red-200 text-red-700', icon: XCircle },
  applied:   { color: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
};

export default function Status() {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyApplication()
      .then(r => setApp(r.data.application))
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500 text-lg"><Loader className="animate-spin mr-2" size={20} /> Checking your status...</div>;

  if (!app) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center max-w-lg mx-auto mt-10">
        <AlertTriangle className="mx-auto text-yellow-500 mb-3" size={40} />
        <h2 className="text-lg font-bold text-gray-800 mb-1">No Application Yet</h2>
        <p className="text-sm text-gray-500 mb-5">You haven't submitted an application for admission. Once you apply, your admission status will appear here.</p>
        <Link to="/apply" className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Apply Now</Link>
      </div>
    );
  }

  const style = STATUS_STYLE[app.status] || STATUS_STYLE.applied;
  const Icon = style.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Admission Status</h2>
        <p className="text-sm text-gray-500">The AI decision is based on your JAMB score, O-level results and programme requirements.</p>
      </div>

      {/* Decision banner */}
      <div className={`rounded-xl border p-5 ${style.color}`}>
        <div className="flex items-center gap-3">
          <Icon size={36} />
          <div>
            <div className="font-bold text-lg">{app.status_label}</div>
            <div className="text-sm">{app.programme_name} · JAMB {app.jamb_score}</div>
          </div>
          {app.ai_score != null && (
            <div className="ml-auto text-right">
              <div className="text-xs uppercase tracking-wide opacity-70">Composite Score</div>
              <div className="font-bold text-2xl">{app.ai_score}</div>
            </div>
          )}
        </div>
      </div>

      {app.admin_override && (
        <div className="bg-purple-50 border border-purple-200 text-purple-700 text-sm rounded-xl p-4">
          <b>Admin review:</b> The admissions officer manually updated your status to <b>{app.status_label}</b>. {app.admin_override.reason}
        </div>
      )}

      {/* AI explanation */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm inline-flex items-center gap-2"><Info size={16} className="text-blue-600" /> How the AI decided</h3>
        {app.ai_explanation && app.ai_explanation.length ? (
          <ol className="space-y-2">
            {app.ai_explanation.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {line}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">Decision pending — the admissions officer has not run the admission process yet. <Link to="/apply" className="text-blue-700 underline">View/Edit my application</Link></p>
        )}
      </div>

      {/* Bio/JAMB/O-level summary */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Application Summary</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs text-gray-400">Programme</dt><dd className="font-medium">{app.programme_name}</dd></div>
          <div><dt className="text-xs text-gray-400">JAMB Score</dt><dd className="font-medium">{app.jamb_score}</dd></div>
          <div><dt className="text-xs text-gray-400">Date of Birth</dt><dd className="font-medium">{app.date_of_birth || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">Gender</dt><dd className="font-medium">{app.gender || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">State</dt><dd className="font-medium">{app.state || '—'}</dd></div>
        </dl>
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 mb-2">O-Level Results ({app.olevel?.length || 0} subjects)</h4>
          <div className="flex flex-wrap gap-2">
            {(app.olevel || []).map((o, i) => (
              <span key={i} className={`text-xs px-2 py-1 rounded ${['A1','B2','B3','C4','C5','C6'].includes(o.grade) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {o.subject}: <b>{o.grade}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 mb-2">Supporting Documents ({app.documents?.length || 0})</h4>
          {(app.documents && app.documents.length) ? (
            <div className="flex flex-wrap gap-2">
              {app.documents.map(d => (
                <a key={d.id} href={downloadUrl(d.id)} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <Download size={13} /> {docsLabel(d.doc_type)} <span className="text-blue-300">·</span> {d.filename}
                </a>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No documents uploaded.</p>}
        </div>
      </div>
    </div>
  );
}