import React, { useEffect, useState } from 'react';
import { Loader, Plus, Landmark, Edit3, Trash2, Save, RefreshCw } from 'lucide-react';
import { getDepartments, createDepartment, createCourse, updateCourse, deleteCourse } from '../services/api';
import { useDialogs } from '../components/Dialogs';
import Modal from '../components/Modal';

const EMPTY_COURSE = { code: '', name: '', cutoff: 170, credits: 5, weight: 0.4, age_min: 16, age_max: 45, subjects: '', description: '' };

export default function Courses() {
  const dialogs = useDialogs();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showDept, setShowDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });
  const [courseDept, setCourseDept] = useState(null);
  const [courseForm, setCourseForm] = useState({ ...EMPTY_COURSE });
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    getDepartments()
      .then(r => { setDepts(r.data.departments); setError(null); })
      .catch(() => setError('Could not load departments. Is the backend running?'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAddCourse = (dept, course) => {
    setEditId(course ? course.id : null);
    setCourseDept(dept.id);
    setCourseForm({
      code: course?.code || '', name: course?.name || '',
      cutoff: course?.cutoff ?? 205, credits: course?.credits ?? 5, weight: course?.weight ?? 0.4,
      age_min: course?.age_min ?? 16, age_max: course?.age_max ?? 45,
      subjects: (course?.subjects || []).join(', '), description: course?.description || '',
    });
  };

  const saveDept = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      await createDepartment(deptForm);
      setShowDept(false);
      setDeptForm({ code: '', name: '' });
      setMsg('Department created.');
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create department.');
    }
  };

  const saveCourse = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    const payload = {
      code: courseForm.code.trim().toUpperCase(), name: courseForm.name.trim(),
      cutoff: parseInt(courseForm.cutoff) || 0, credits: parseInt(courseForm.credits) || 5,
      weight: parseFloat(courseForm.weight) || 0.35, age_min: parseInt(courseForm.age_min) || 16,
      age_max: parseInt(courseForm.age_max) || 45,
      subjects: courseForm.subjects.split(',').map(s => s.trim()).filter(Boolean),
      description: courseForm.description.trim(),
    };
    try {
      if (editId) {
        await updateCourse(editId, payload);
        setMsg('Course updated. The AI uses the new requirements on the next run.');
      } else {
        await createCourse({ department_id: courseDept, ...payload });
        setMsg('Course created. The AI will use it for admission decisions.');
      }
      setCourseForm({ ...EMPTY_COURSE });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save course.');
    }
  };

  const removeCourse = async (id, name) => {
    const ok = await dialogs.confirm(`Delete course "${name}"? Applications already submitted for it will still show the course name.`, 'Delete course');
    if (!ok) return;
    try {
      await deleteCourse(id);
      setMsg('Course deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete course.');
    }
  };

  if (loading && !depts.length) return <div className="flex items-center justify-center h-64 text-gray-500 text-lg"><Loader className="animate-spin mr-2" size={20} /> Loading programmes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Departments & Courses</h2>
          <p className="text-sm text-gray-500">Requirements saved here are what the AI uses when it runs admissions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-blue-500 text-gray-600 inline-flex items-center gap-1.5"><RefreshCw size={15} /> Refresh</button>
          <button onClick={() => setShowDept(true)} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"><Landmark size={15} /> Add Department</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{msg}</div>}

      {/* New / edit course modal */}
      <Modal open={courseDept !== null} onClose={() => { setCourseDept(null); setEditId(null); }}
        title={editId ? 'Edit Course Requirements' : 'Add New Course'}>
        <form onSubmit={saveCourse} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Code</label>
              <input value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="e.g. BIO" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Name</label>
              <input value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="e.g. Biochemistry" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (shown to nobody — admin reference only)</label>
            <input value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="e.g. B.Sc. Biochemistry" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">JAMB Cut-off</label>
              <input type="number" value={courseForm.cutoff} onChange={e => setCourseForm({ ...courseForm, cutoff: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credits</label>
              <input type="number" value={courseForm.credits} onChange={e => setCourseForm({ ...courseForm, credits: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Age</label>
              <input type="number" value={courseForm.age_min} onChange={e => setCourseForm({ ...courseForm, age_min: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Age</label>
              <input type="number" value={courseForm.age_max} onChange={e => setCourseForm({ ...courseForm, age_max: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Compulsory Subjects (comma-separated)</label>
            <input value={courseForm.subjects} onChange={e => setCourseForm({ ...courseForm, subjects: e.target.value })} placeholder="e.g. English Language, Biology, Chemistry" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setCourseDept(null); setEditId(null); }} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium inline-flex items-center gap-1.5"><Save size={15} /> {editId ? 'Update Course' : 'Add Course'}</button>
          </div>
        </form>
      </Modal>

      {/* New department modal */}
      <Modal open={showDept} onClose={() => setShowDept(false)} title="Add Department">
        <form onSubmit={saveDept} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. SOC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Social Sciences" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowDept(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium inline-flex items-center gap-1.5"><Plus size={15} /> Create Department</button>
          </div>
        </form>
      </Modal>

      {/* Department groups */}
      {depts.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 text-sm">No departments yet. Add one to start building the course catalogue.</div>
      ) : (
        <div className="space-y-5">
          {depts.map(dept => (
            <div key={dept.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-700 inline-flex items-center gap-2"><Landmark size={16} className="text-blue-600" /> {dept.name} <span className="text-xs text-gray-400 font-normal">· {dept.code}</span></h3>
                <button onClick={() => openAddCourse(dept)} className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg inline-flex items-center gap-1"><Plus size={13} /> Add Course</button>
              </div>
              {dept.courses.length === 0 ? (
                <div className="p-6 text-sm text-gray-400 text-center">No courses. Add the first course for this department.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-400 border-b">
                        <th className="px-5 py-2">Code</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Cut-off</th>
                        <th className="px-4 py-2">Credits</th>
                        <th className="px-4 py-2">Age Range</th>
                        <th className="px-4 py-2">Compulsory Subjects</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.courses.map(course => (
                        <tr key={course.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-600">{course.code}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{course.name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{course.cutoff}</td>
                          <td className="px-4 py-2.5 text-gray-600">{course.credits}</td>
                          <td className="px-4 py-2.5 text-gray-600">{course.age_min}–{course.age_max}</td>
                          <td className="px-4 py-2.5 text-gray-600">{(course.subjects || []).join(', ') || '—'}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button onClick={() => openAddCourse(dept, course)} className="text-gray-400 hover:text-blue-700 p-1" title="Edit"><Edit3 size={15} /></button>
                            <button onClick={() => removeCourse(course.id, course.name)} className="text-gray-400 hover:text-red-700 p-1" title="Delete"><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}