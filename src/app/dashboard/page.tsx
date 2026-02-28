'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const PENDING_DEGREE_KEY = 'gpa_pending_degree';

interface PendingDegree {
  id: number | null;
  name: string;
  totalYears: number;
  semestersPerYear: number;
  isCustom: boolean;
  pendingCreate?: { name: string; totalYears: number; semestersPerYear: number };
}

interface SubjectWithResult {
  id: number;
  subject_name: string;
  credits: number;
  year: number;
  semester: number;
  result?: {
    grade_point: number;
    status: string;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectWithResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [degreeName, setDegreeName] = useState<string>('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [gradeSubjectId, setGradeSubjectId] = useState<number | null>(null);
  const [editGrade, setEditGrade] = useState<{ grade_point: number; status: string } | null>(null);
  const [pendingDegree, setPendingDegree] = useState<PendingDegree | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishMode, setPublishMode] = useState<'existing' | 'new'>('existing');
  const [publishDegreeId, setPublishDegreeId] = useState<string>('');
  const [publishNewName, setPublishNewName] = useState('');
  const [publishYears, setPublishYears] = useState('4');
  const [publishSemesters, setPublishSemesters] = useState('2');
  const [publishMsg, setPublishMsg] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [systemDegrees, setSystemDegrees] = useState<{ id: number; name: string }[]>([]);

  // Load pending degree from sessionStorage and resolve degree name
  useEffect(() => {
    if (status !== 'authenticated') return;  // wait — covers 'loading' too

    // Read pending degree from sessionStorage
    let pending: PendingDegree | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_DEGREE_KEY);
      if (raw) pending = JSON.parse(raw) as PendingDegree;
    } catch {}
    setPendingDegree(pending);

    // If no committed degree AND no pending → go pick one
    if (session?.user?.degreeId == null && !pending) {
      router.replace('/select-degree');
      return;
    }

    fetchSubjects();

    // Superadmin: load system degrees for publish dropdown
    if (session?.user?.role === 'SUPERADMIN') {
      fetch('/api/degrees')
        .then((r) => r.json())
        .then((all: { id: number; name: string; isCustom: boolean }[]) =>
          setSystemDegrees(all.filter((d) => !d.isCustom))
        )
        .catch(() => {});
    }

    // Set degree name from pending or from API
    if (pending) {
      setDegreeName(pending.name);
    } else if (session?.user?.degreeId) {
      fetch('/api/degrees')
        .then((r) => r.json())
        .then((degrees: { id: number; name: string }[]) => {
          const d = degrees.find((x) => x.id === session.user.degreeId);
          if (d) setDegreeName(d.name);
        })
        .catch(() => {});
    }
  }, [status]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setPublishMsg('');
    const body: Record<string, unknown> =
      publishMode === 'existing'
        ? { degreeId: parseInt(publishDegreeId) }
        : { newName: publishNewName.trim(), totalYears: parseInt(publishYears), semestersPerYear: parseInt(publishSemesters) };
    const res = await fetch('/api/admin/degrees/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setPublishing(false);
    const data = await res.json();
    if (res.ok) {
      setPublishMsg(`✅ Published ${data.count} subjects as a recommended degree template!`);
      setPublishNewName('');
      setPublishDegreeId('');
    } else {
      setPublishMsg(`❌ ${data.error ?? 'Error publishing'}`);
    }
  };

  const computeGPA = (list: SubjectWithResult[]) => {
    const graded = list.filter((s) => s.result);
    if (graded.length === 0) return 0;
    const totalPoints = graded.reduce(
      (sum, s) => sum + s.result!.grade_point * s.credits,
      0
    );
    const totalCredits = graded.reduce((sum, s) => sum + s.credits, 0);
    return totalCredits === 0 ? 0 : totalPoints / totalCredits;
  };

  const overallGPA = computeGPA(subjects);
  const totalSubjects = subjects.length;
  const gradedSubjects = subjects.filter((s) => s.result).length;
  const totalCredits = subjects.reduce((s, sub) => s + sub.credits, 0);
  const years = [...new Set(subjects.map((s) => s.year))].sort();

  const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const body: Record<string, unknown> = {
        subject_name: fd.get('subject_name'),
        credits: parseFloat(fd.get('credits') as string),
        year: parseInt(fd.get('year') as string),
        semester: parseInt(fd.get('semester') as string),
      };
      // Attach pending degree on first subject so API can commit it
      if (pendingDegree && !session?.user?.degreeId) {
        body._pendingDegree = pendingDegree;
      }
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // Clear pending degree from sessionStorage once committed
        if (pendingDegree && !session?.user?.degreeId) {
          try { sessionStorage.removeItem(PENDING_DEGREE_KEY); } catch {}
          setPendingDegree(null);
        }
        setShowAddSubject(false);
        fetchSubjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: gradeSubjectId,
          grade_point: parseFloat(fd.get('grade_point') as string),
          status: fd.get('status'),
        }),
      });
      if (res.ok) {
        setShowAddGrade(false);
        setGradeSubjectId(null);
        setEditGrade(null);
        fetchSubjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subject?')) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  const gpaColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-emerald-600';
    if (gpa >= 3.0) return 'text-blue-600';
    if (gpa >= 2.0) return 'text-amber-600';
    return 'text-red-600';
  };

  const gpaBg = (gpa: number) => {
    if (gpa >= 3.5) return 'from-emerald-500 to-teal-600';
    if (gpa >= 3.0) return 'from-blue-500 to-indigo-600';
    if (gpa >= 2.0) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#13161f]/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          {/* Left — Logo */}
          <img src="/logo.png" alt="UniGPA" className="h-16 w-auto" />

          {/* Right — account info + logout */}
          <div className="flex items-center gap-5">
            {session?.user?.role === 'SUPERADMIN' && (
              <a
                href="/admin"
                className="text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-500 transition shadow-lg shadow-purple-900/40"
              >
                ⭐ Admin Panel
              </a>
            )}

            {/* Account name */}
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-slate-200">
                {session?.user?.name}
              </span>
            </div>

            {/* Logout — far right */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition font-semibold border border-red-500/25"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Degree Card */}
        {degreeName && (
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Current Degree</p>
              <p className="text-lg font-bold text-slate-100">{degreeName}</p>
            </div>
            <a
              href="/select-degree?change=1"
              className="text-sm bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-xl hover:bg-indigo-500/20 transition font-semibold border border-indigo-500/20"
            >
              Change
            </a>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`col-span-2 lg:col-span-1 bg-gradient-to-br ${gpaBg(overallGPA)} rounded-2xl p-5 text-white shadow-2xl`}>
            <p className="text-sm font-medium opacity-80">Overall GPA</p>
            <p className="text-4xl font-extrabold mt-1">{overallGPA.toFixed(2)}</p>
            <p className="text-xs opacity-60 mt-2">out of 4.00</p>
          </div>
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Subjects</p>
            <p className="text-3xl font-bold text-purple-400 mt-1">{totalSubjects}</p>
            <p className="text-xs text-slate-600 mt-2">total added</p>
          </div>
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Graded</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{gradedSubjects}</p>
            <p className="text-xs text-slate-600 mt-2">of {totalSubjects} subjects</p>
          </div>
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Credits</p>
            <p className="text-3xl font-bold text-amber-400 mt-1">{totalCredits}</p>
            <p className="text-xs text-slate-600 mt-2">total credits</p>
          </div>
        </div>

        {/* Add Subject Button */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAddSubject(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/50 font-medium text-sm"
          >
            <span className="text-lg">+</span> Add Subject
          </button>
          {session?.user?.role === 'SUPERADMIN' && subjects.length > 0 && (
            <button
              onClick={() => { setShowPublish(true); setPublishMsg(''); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/50 font-medium text-sm"
            >
              📤 Publish as Recommended Degree
            </button>
          )}
        </div>

        {/* Subjects by Year */}
        {subjects.length === 0 ? (
          <div className="bg-[#1c1f2e] rounded-2xl p-12 text-center border-2 border-dashed border-white/10">
            <p className="text-5xl mb-4">&#x1F4DA;</p>
            <p className="text-lg font-semibold text-slate-300">No subjects yet</p>
            <p className="text-slate-500 mt-1">Click &quot;Add Subject&quot; to get started!</p>
          </div>
        ) : (
          years.map((year) => {
            const yearSubjects = subjects.filter((s) => s.year === year);
            const yearGPA = computeGPA(yearSubjects);
            const sem1 = yearSubjects.filter((s) => s.semester === 1);
            const sem2 = yearSubjects.filter((s) => s.semester === 2);
            const sems = [
              { label: 'Semester 1', items: sem1 },
              { label: 'Semester 2', items: sem2 },
            ].filter((s) => s.items.length > 0);

            const SubjectRow = ({ subject }: { subject: SubjectWithResult }) => (
              <div className="px-4 py-2.5 flex items-center gap-2 hover:bg-white/[0.03] transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">{subject.subject_name}</p>
                  <p className="text-xs text-slate-500">{subject.credits} cr</p>
                </div>
                <div className="shrink-0">
                  {subject.result ? (
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      subject.result.grade_point >= 3.5 ? 'bg-emerald-500/20 text-emerald-400'
                      : subject.result.grade_point >= 3.0 ? 'bg-blue-500/20 text-blue-400'
                      : subject.result.grade_point >= 2.0 ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                    }`}>
                      {subject.result.grade_point.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs bg-white/5 text-slate-500 px-2.5 py-0.5 rounded-full">—</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!subject.result ? (
                    <button
                      onClick={() => { setGradeSubjectId(subject.id); setEditGrade(null); setShowAddGrade(true); }}
                      className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-500/20 transition font-medium border border-indigo-500/20"
                    >
                      + Grade
                    </button>
                  ) : (
                    <button
                      onClick={() => { setGradeSubjectId(subject.id); setEditGrade(subject.result!); setShowAddGrade(true); }}
                      className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-500/20 transition font-medium border border-amber-500/20"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20 transition font-medium border border-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );

            return (
              <div key={year} className="bg-[#1c1f2e] rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Year header */}
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border-b border-white/[0.06] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                      {year}
                    </span>
                    Year {year}
                  </h2>
                  {yearSubjects.some((s) => s.result) && (
                    <span className={`text-sm font-bold ${gpaColor(yearGPA)}`}>
                      GPA: {yearGPA.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Two semesters side by side */}
                <div className={`grid ${sems.length === 2 ? 'grid-cols-2 divide-x divide-white/[0.06]' : 'grid-cols-1'}`}>
                  {sems.map((sem) => {
                    const semGPA = computeGPA(sem.items);
                    return (
                      <div key={sem.label}>
                        {/* Semester sub-header */}
                        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {sem.label}
                          </span>
                          {sem.items.some((s) => s.result) && (
                            <span className={`text-xs font-bold ${gpaColor(semGPA)}`}>
                              {semGPA.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                          {sem.items.map((subject) => (
                            <SubjectRow key={subject.id} subject={subject} />
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

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1f2e] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-3">
              <input
                name="subject_name"
                type="text"
                placeholder="Subject name"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  name="year"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Year"
                  required
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
                <select
                  name="semester"
                  required
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="1" className="bg-[#1c1f2e]">Sem 1</option>
                  <option value="2" className="bg-[#1c1f2e]">Sem 2</option>
                </select>
                <input
                  name="credits"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  placeholder="Credits"
                  required
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-500 transition font-medium text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="flex-1 bg-white/5 text-slate-400 py-2.5 rounded-xl hover:bg-white/10 transition font-medium text-sm border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Grade Modal */}
      {showAddGrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1f2e] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              {editGrade ? 'Edit Grade' : 'Add Grade'}
            </h3>
            <form onSubmit={handleAddGrade} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Grade Point (0.00 - 4.00)
                </label>
                <input
                  name="grade_point"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  required
                  defaultValue={editGrade?.grade_point ?? ''}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  required
                  defaultValue={editGrade?.status ?? 'Completed'}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="Completed" className="bg-[#1c1f2e]">Completed</option>
                  <option value="Incomplete" className="bg-[#1c1f2e]">Incomplete</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-500 transition font-medium text-sm"
                >
                  {editGrade ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGrade(false);
                    setGradeSubjectId(null);
                    setEditGrade(null);
                  }}
                  className="flex-1 bg-white/5 text-slate-400 py-2.5 rounded-xl hover:bg-white/10 transition font-medium text-sm border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish as Recommended Degree Modal — SUPERADMIN only */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1f2e] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold text-slate-100 mb-1">📤 Publish as Recommended Degree</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your current subjects (name + credits only, no grades) will be copied as a template for new students.
            </p>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPublishMode('existing')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${publishMode === 'existing' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
              >
                Update Existing
              </button>
              <button
                onClick={() => setPublishMode('new')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${publishMode === 'new' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
              >
                Create New Degree
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-3">
              {publishMode === 'existing' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Select Degree</label>
                  <select
                    value={publishDegreeId}
                    onChange={(e) => setPublishDegreeId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" className="bg-[#1c1f2e]">-- choose a degree --</option>
                    {systemDegrees.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#1c1f2e]">{d.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-400 mt-1">⚠️ This will replace existing subjects for that degree template.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">New Degree Name</label>
                    <input
                      type="text"
                      placeholder="e.g. BSc Software Engineering"
                      value={publishNewName}
                      onChange={(e) => setPublishNewName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Total Years</label>
                      <select value={publishYears} onChange={(e) => setPublishYears(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                        {[1,2,3,4,5,6].map((y) => <option key={y} value={y} className="bg-[#1c1f2e]">{y} {y === 1 ? 'year' : 'years'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Semesters / Year</label>
                      <select value={publishSemesters} onChange={(e) => setPublishSemesters(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="1" className="bg-[#1c1f2e]">1</option>
                        <option value="2" className="bg-[#1c1f2e]">2</option>
                        <option value="3" className="bg-[#1c1f2e]">3</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {publishMsg && (
                <p className={`text-sm font-medium ${publishMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{publishMsg}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-500 transition font-medium text-sm disabled:opacity-60"
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublish(false)}
                  className="flex-1 bg-white/5 text-slate-400 py-2.5 rounded-xl hover:bg-white/10 transition font-medium text-sm border border-white/10"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
