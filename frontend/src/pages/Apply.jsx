import React, { useEffect, useState } from 'react';
import { Loader, Send, Plus, Trash2, User, GraduationCap, Award, UploadCloud, FileText, Download, X } from 'lucide-react';
import { getProgrammes, getMyApplication, postApplication, getDocTypes, getMyDocuments, uploadDocument, deleteDocument, downloadUrl } from '../services/api';
import { useDialogs } from '../components/Dialogs';

const EMPTY_OLEVEL = { subject: '', grade: 'C6', exam_type: 'WAEC', year: 2024 };

export default function Apply() {
  const dialogs = useDialogs();
  const [programmes, setProgrammes] = useState([]);
  const [form, setForm] = useState({
    programme: '', jamb_reg: '', jamb_score: '',
    full_name: '', date_of_birth: '', gender: '', phone: '', state: '', address: '',
  });
  const [olevel, setOlevel] = useState([{ ...EMPTY_OLEVEL }]);
  const [existing, setExisting] = useState(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [docTypes, setDocTypes] = useState({});
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([getProgrammes(), getMyApplication(), getDocTypes().then(r => r.data).catch(() => ({}))])
      .then(([p, mine, types]) => {
        const list = p.data;
        setProgrammes(list);
        setDocTypes(types);
        const app = mine.data.application;
        if (app) {
          setExisting(app);
          setForm({
            programme: app.programme, jamb_reg: app.jamb_reg || '', jamb_score: app.jamb_score || '',
            full_name: app.full_name || localStorage.getItem('xai_name') || '',
            date_of_birth: app.date_of_birth || '', gender: app.gender || '',
            phone: app.phone || '', state: app.state || '', address: app.address || '',
          });
          if (app.olevel && app.olevel.length) {
            setOlevel(app.olevel.map(o => ({ subject: o.subject, grade: o.grade, exam_type: o.exam_type || 'WAEC', year: o.year || 2024 })));
          }
          setDocuments(app.documents || []);
        } else {
          setForm(f => ({ ...f, full_name: localStorage.getItem('xai_name') || '' }));
        }
      })
      .catch(() => setErr('Could not load form. Is the backend running on port 8000?'))
      .finally(() => setLoadingForm(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const setO = (idx, k, v) =>
    setOlevel(rows => rows.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));

  const addRow = () => setOlevel(rows => [...rows, { ...EMPTY_OLEVEL }]);
  const removeRow = (idx) => setOlevel(rows => rows.filter((_, i) => i !== idx));

  const selectedProgramme = programmes.find(p => p.code === form.programme);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!form.programme) return setErr('Please choose a programme.');
    const score = parseInt(form.jamb_score);
    if (isNaN(score)) return setErr('Please enter your JAMB score.');
    if (!olevel.length) return setErr('Please add your O-level results.');

    setSaving(true);
    try {
      const payload = {
        programme: form.programme,
        jamb_reg: form.jamb_reg,
        jamb_score: score,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone,
        state: form.state,
        address: form.address,
        olevel: olevel.map(o => ({ ...o, year: parseInt(o.year) || null })),
      };
      await postApplication(payload);
      setMsg('Application saved! The admissions committee will review it.');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to save application.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!docType) return setErr('Choose a document type.');
    if (!docFile) return setErr('Choose a file to upload.');
    setErr(null); setMsg(null); setUploading(true);
    try {
      await uploadDocument(docType, docFile);
      setMsg('Document uploaded.');
      setDocFile(null);
      const r = await getMyDocuments();
      setDocuments(r.data.documents);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    const ok = await dialogs.confirm('Delete this document? It cannot be undone.', 'Delete document');
    if (!ok) return;
    try {
      await deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (e) {
      setErr(e.response?.data?.detail || 'Delete failed.');
    }
  };

  if (loadingForm) return <div className="flex items-center justify-center h-64 text-gray-500 text-lg"><Loader className="animate-spin mr-2" size={20} /> Loading application form...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 inline-flex items-center gap-2"><User size={22} className="text-blue-700" /> Admissions Application</h2>
          <p className="text-sm text-gray-500">Fill in your bio data, JAMB details and O-level results.</p>
        </div>
        {existing && existing.status !== 'applied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs text-yellow-800">
            You already have an assessment result ({existing.status_label}).
            Editing will reset it to <b>Pending Review</b>.
          </div>
        )}
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{msg}</div>}

      <form onSubmit={submit}>
        {/* Bio data */}
        <section className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-4 inline-flex items-center gap-2"><User size={16} className="text-blue-600" /> Bio Data</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input value={form.full_name} onChange={set('full_name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
              <select value={form.gender} onChange={set('gender')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={set('phone')} placeholder="080xxxxxxxx" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State of Origin</label>
              <input value={form.state} onChange={set('state')} placeholder="e.g. Kaduna" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Address</label>
              <input value={form.address} onChange={set('address')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </section>

        {/* JAMB details */}
        <section className="bg-white rounded-xl shadow p-5 mt-5">
          <h3 className="font-semibold text-gray-700 mb-4 inline-flex items-center gap-2"><GraduationCap size={16} className="text-blue-600" /> JAMB / UTME Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">JAMB Registration No.</label>
              <input value={form.jamb_reg} onChange={set('jamb_reg')} placeholder="e.g. 2024UTME123456" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">JAMB Score (0–400)</label>
              <input type="number" min="0" max="400" value={form.jamb_score} onChange={set('jamb_score')} placeholder="e.g. 248" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Programme</label>
              <select value={form.programme} onChange={set('programme')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select programme</option>
                {programmes.map(p => (
                  <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            {selectedProgramme && (
              <div className="sm:col-span-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
                <b>{selectedProgramme.name} (Code: {selectedProgramme.code})</b> You selected this programme as your first choice.
              </div>
            )}
          </div>
        </section>

        {/* O-level */}
        <section className="bg-white rounded-xl shadow p-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 inline-flex items-center gap-2"><Award size={16} className="text-blue-600" /> O-Level Results</h3>
            <button type="button" onClick={addRow} className="text-sm text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"><Plus size={16} /> Add subject</button>
          </div>
          <div className="space-y-2">
            {olevel.map((o, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-2">
                  <select value={o.exam_type} onChange={e => setO(idx, 'exam_type', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500">
                    <option>WAEC</option>
                    <option>NECO</option>
                    <option>NABTEB</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input type="number" value={o.year} onChange={e => setO(idx, 'year', e.target.value)} placeholder="Year" className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500" />
                </div>
                <div className="sm:col-span-5">
                  <input value={o.subject} onChange={e => setO(idx, 'subject', e.target.value)} placeholder="Subject (e.g. Mathematics)" className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <select value={o.grade} onChange={e => setO(idx, 'grade', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500">
                    {['A1','B2','B3','C4','C5','C6','D7','E8','F9'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <button type="button" onClick={() => removeRow(idx)} disabled={olevel.length === 1}
                    className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button type="submit" disabled={saving}
          className="mt-6 w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {saving ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
          {saving ? 'Saving...' : (existing ? 'Update Application' : 'Submit Application')}
        </button>
      </form>

      {/* Documents */}
      <section className="bg-white rounded-xl shadow p-5 mt-6">
        <h3 className="font-semibold text-gray-700 mb-1 inline-flex items-center gap-2">
          <UploadCloud size={16} className="text-blue-600" /> Supporting Documents
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Upload scanned copies of your documents (max 5 MB each). You must submit the application above first.
        </p>

        {!existing ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500">
            Please submit your application first, then upload your documents here.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select type</option>
                  {Object.entries(docTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">File (PDF / image)</label>
                <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:px-3 file:py-2 file:rounded-lg" />
              </div>
              <div className="sm:col-span-3">
                <button onClick={handleUpload} disabled={uploading}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                  {uploading ? <Loader className="animate-spin" size={15} /> : <UploadCloud size={15} />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100 border rounded-lg">
                {documents.map(d => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="text-blue-600 shrink-0" size={18} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{docTypes[d.doc_type] || d.doc_type}</div>
                        <div className="text-xs text-gray-400 truncate">{d.filename} · {(d.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={downloadUrl(d.id)} className="text-blue-600 hover:text-blue-800 p-1 inline-flex" title="Download"><Download size={16} /></a>
                      <button onClick={() => handleDeleteDoc(d.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete"><X size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}