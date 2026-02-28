'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Template {
  id: number;
  subjectName: string;
  credits: number;
  year: number;
  semester: number;
}

interface DegreeInfo {
  id: number;
  name: string;
  totalYears: number;
  semestersPerYear: number;
}

const EMPTY_FORM = { subjectName: '', credits: '3', year: '1', semester: '1' };

export default function AdminDegreeEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const degreeId = parseInt(params.id as string);

  const [degree, setDegree] = useState<DegreeInfo | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;   // wait — covers 'loading' too
    if (session.user.role !== 'SUPERADMIN') { router.replace('/dashboard'); return; }
    load();
  }, [status]);

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3000); };

  const load = async () => {
    setIsLoading(true);
    const [degreesRes, templatesRes] = await Promise.all([
      fetch('/api/degrees'),
      fetch(`/api/admin/degrees/${degreeId}/subjects`),
    ]);
    const allDegrees: DegreeInfo[] = await degreesRes.json();
    const deg = allDegrees.find((d) => d.id === degreeId) ?? null;
    setDegree(deg);
    setTemplates(await templatesRes.json());
    setIsLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/degrees/${degreeId}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectName: form.subjectName.trim(),
        credits: parseFloat(form.credits),
        year: parseInt(form.year),
        semester: parseInt(form.semester),
      }),
    });
    setSaving(false);
    if (res.ok) { setForm(EMPTY_FORM); load(); showFlash('Subject added'); }
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditForm({ subjectName: t.subjectName, credits: String(t.credits), year: String(t.year), semester: String(t.semester) });
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true);
    const res = await fetch(`/api/admin/degrees/${degreeId}/subjects`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: id,
        subjectName: editForm.subjectName.trim(),
        credits: parseFloat(editForm.credits),
        year: parseInt(editForm.year),
        semester: parseInt(editForm.semester),
      }),
    });
    setSaving(false);
    if (res.ok) { setEditingId(null); load(); showFlash('Updated'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from this template?`)) return;
    const res = await fetch(`/api/admin/degrees/${degreeId}/subjects?templateId=${id}`, { method: 'DELETE' });
    if (res.ok) { load(); showFlash(`"${name}" removed`); }
  };

  // Group templates by year → semester
  const years = [...new Set(templates.map((t) => t.year))].sort();

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#13161f]/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-white/10 transition font-medium border border-white/10"
          >
            ← Admin
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100">{degree?.name ?? 'Degree'}</h1>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">Template Editor</span>
          </div>
          {degree && (
            <span className="text-xs text-slate-600 ml-auto">
              {degree.totalYears} years · {degree.semestersPerYear} sem/year
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {flash && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">{flash}</div>
        )}

        {/* Add subject form */}
        <div className="bg-[#1c1f2e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border-b border-white/[0.06]">
            <h2 className="font-bold text-slate-200 text-sm">Add Subject to Template</h2>
            <p className="text-xs text-slate-500 mt-0.5">No grades — templates define subject name, credits, year and semester only</p>
          </div>
          <form onSubmit={handleAdd} className="px-5 py-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-slate-500 mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures"
                  value={form.subjectName}
                  onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Credits</label>
                <input
                  type="number" step="0.5" min="0.5" max="10"
                  value={form.credits}
                  onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
                  className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {[1,2,3,4,5,6].map((y) => <option key={y} value={y} className="bg-[#1c1f2e]">Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Semester</label>
                <select
                  value={form.semester}
                  onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="1" className="bg-[#1c1f2e]">Sem 1</option>
                  <option value="2" className="bg-[#1c1f2e]">Sem 2</option>
                  <option value="3" className="bg-[#1c1f2e]">Sem 3</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-60"
              >
                + Add
              </button>
            </div>
          </form>
        </div>

        {/* Template subjects grouped by year/semester */}
        {templates.length === 0 ? (
          <div className="bg-[#1c1f2e] rounded-2xl p-10 text-center border-2 border-dashed border-white/10">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-semibold text-slate-400">No subjects in this template yet</p>
            <p className="text-xs text-slate-600 mt-1">Add subjects above to build the recommended template</p>
          </div>
        ) : (
          years.map((year) => {
            const yearItems = templates.filter((t) => t.year === year);
            const sems = [...new Set(yearItems.map((t) => t.semester))].sort();
            return (
              <div key={year} className="bg-[#1c1f2e] rounded-2xl border border-white/[0.06] overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border-b border-white/[0.06] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">{year}</span>
                  <span className="font-bold text-slate-200 text-sm">Year {year}</span>
                  <span className="text-xs text-slate-600 ml-auto">{yearItems.length} subject{yearItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className={`grid ${sems.length === 2 ? 'grid-cols-2 divide-x divide-white/[0.06]' : 'grid-cols-1'}`}>
                  {sems.map((sem) => {
                    const semItems = yearItems.filter((t) => t.semester === sem);
                    return (
                      <div key={sem}>
                        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Semester {sem}</span>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                          {semItems.map((t) => (
                            <div key={t.id} className="px-4 py-2.5">
                              {editingId === t.id ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                  <input
                                    type="text"
                                    value={editForm.subjectName}
                                    onChange={(e) => setEditForm((f) => ({ ...f, subjectName: e.target.value }))}
                                    className="flex-1 min-w-32 px-2 py-1 bg-white/5 border border-indigo-500/40 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                  <input
                                    type="number" step="0.5" min="0.5" max="10"
                                    value={editForm.credits}
                                    onChange={(e) => setEditForm((f) => ({ ...f, credits: e.target.value }))}
                                    className="w-16 px-2 py-1 bg-white/5 border border-indigo-500/40 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                  <select
                                    value={editForm.year}
                                    onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))}
                                    className="px-2 py-1 bg-white/5 border border-indigo-500/40 rounded-lg text-sm text-slate-200 outline-none"
                                  >
                                    {[1,2,3,4,5,6].map((y) => <option key={y} value={y} className="bg-[#1c1f2e]">Y{y}</option>)}
                                  </select>
                                  <select
                                    value={editForm.semester}
                                    onChange={(e) => setEditForm((f) => ({ ...f, semester: e.target.value }))}
                                    className="px-2 py-1 bg-white/5 border border-indigo-500/40 rounded-lg text-sm text-slate-200 outline-none"
                                  >
                                    <option value="1" className="bg-[#1c1f2e]">S1</option>
                                    <option value="2" className="bg-[#1c1f2e]">S2</option>
                                    <option value="3" className="bg-[#1c1f2e]">S3</option>
                                  </select>
                                  <button onClick={() => handleSaveEdit(t.id)} disabled={saving} className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-500 transition font-medium disabled:opacity-60">Save</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs bg-white/5 text-slate-400 px-2.5 py-1 rounded-lg hover:bg-white/10 transition font-medium border border-white/10">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-200 text-sm truncate">{t.subjectName}</p>
                                    <p className="text-xs text-slate-500">{t.credits} cr</p>
                                  </div>
                                  <button onClick={() => startEdit(t)} className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-500/20 transition font-medium border border-amber-500/20">Edit</button>
                                  <button onClick={() => handleDelete(t.id, t.subjectName)} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20 transition font-medium border border-red-500/20">Remove</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
