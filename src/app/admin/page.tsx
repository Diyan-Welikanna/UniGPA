'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  degreeId: number | null;
  degree: { name: string } | null;
  _count: { subjects: number };
}

interface SystemDegree {
  id: number;
  name: string;
  totalYears: number;
  semestersPerYear: number;
  isCustom: boolean;
  _count?: { subjectTemplates: number };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [degrees, setDegrees] = useState<SystemDegree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [showDegreeForm, setShowDegreeForm] = useState(false);
  const [degreeForm, setDegreeForm] = useState({ name: '', totalYears: '4', semestersPerYear: '2' });
  const [degreeFormErr, setDegreeFormErr] = useState('');
  const [savingDegree, setSavingDegree] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;   // wait — covers 'loading' too
    if (session.user.role !== 'SUPERADMIN') { router.replace('/dashboard'); return; }
    fetchUsers();
    fetchDegrees();
  }, [status]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data);
    setIsLoading(false);
  };

  const fetchDegrees = async () => {
    const res = await fetch('/api/degrees');
    const data: SystemDegree[] = await res.json();
    setDegrees(data.filter((d) => !d.isCustom));
  };

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleAddDegree = async (e: React.FormEvent) => {
    e.preventDefault();
    setDegreeFormErr('');
    if (!degreeForm.name.trim()) { setDegreeFormErr('Name is required'); return; }
    setSavingDegree(true);
    const res = await fetch('/api/degrees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin-create',
        name: degreeForm.name.trim(),
        totalYears: parseInt(degreeForm.totalYears),
        semestersPerYear: parseInt(degreeForm.semestersPerYear),
      }),
    });
    setSavingDegree(false);
    if (res.ok) {
      flash(`"${degreeForm.name.trim()}" added to recommendations`);
      setDegreeForm({ name: '', totalYears: '4', semestersPerYear: '2' });
      setShowDegreeForm(false);
      fetchDegrees();
    } else {
      const d = await res.json();
      setDegreeFormErr(d.error ?? 'Error creating degree');
    }
  };

  const handleDeleteDegree = async (degree: SystemDegree) => {
    if (!confirm(`Remove "${degree.name}" from recommendations?`)) return;
    const res = await fetch(`/api/degrees?id=${degree.id}`, { method: 'DELETE' });
    if (res.ok) {
      flash(`"${degree.name}" removed`);
      fetchDegrees();
    } else {
      const d = await res.json();
      flash(d.error ?? 'Error deleting degree');
    }
  };

  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === 'SUPERADMIN' ? 'USER' : 'SUPERADMIN';
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role: newRole }),
    });
    if (res.ok) {
      flash(`${user.name} is now ${newRole}`);
      fetchUsers();
    } else {
      const d = await res.json();
      flash(d.error ?? 'Error updating role');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.name} (${user.email}) and all their data?`)) return;
    const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      flash(`${user.name} deleted`);
      fetchUsers();
    } else {
      const d = await res.json();
      flash(d.error ?? 'Error deleting user');
    }
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

  const totalSubjects = users.reduce((s, u) => s + u._count.subjects, 0);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#13161f]/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="UniGPA" className="h-8 w-auto" />
            <span className="text-xs font-semibold bg-purple-600 text-white px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition font-medium border border-indigo-500/20"
            >
              My Dashboard
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition font-medium border border-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Total Users</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">{users.length}</p>
          </div>
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Admins</p>
            <p className="text-3xl font-bold text-purple-400 mt-1">
              {users.filter((u) => u.role === 'SUPERADMIN').length}
            </p>
          </div>
          <div className="bg-[#1c1f2e] rounded-2xl p-5 border border-white/[0.06]">
            <p className="text-sm text-slate-500">Total Subjects</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{totalSubjects}</p>
          </div>
        </div>

        {/* Flash message */}
        {actionMsg && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-3 rounded-xl text-sm font-medium">
            {actionMsg}
          </div>
        )}

        {/* Manage Degrees */}
        <div className="bg-[#1c1f2e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-200">Recommended Degrees</h2>
              <p className="text-xs text-slate-500 mt-0.5">These appear as recommendations for new users on the degree selection page</p>
            </div>
            <button
              onClick={() => { setShowDegreeForm((v) => !v); setDegreeFormErr(''); }}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-500 transition font-medium flex items-center gap-1.5"
            >
              <span className="text-base leading-none">+</span> Add Degree
            </button>
          </div>

          {/* Inline add form */}
          {showDegreeForm && (
            <form onSubmit={handleAddDegree} className="px-5 py-4 bg-white/[0.02] border-b border-white/[0.06]">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Degree Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BSc Computer Science"
                    value={degreeForm.name}
                    onChange={(e) => setDegreeForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Total Years</label>
                  <select
                    value={degreeForm.totalYears}
                    onChange={(e) => setDegreeForm((f) => ({ ...f, totalYears: e.target.value }))}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  >
                    {[2,3,4,5,6].map((y) => <option key={y} value={y} className="bg-[#1c1f2e]">{y} years</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Semesters / Year</label>
                  <select
                    value={degreeForm.semestersPerYear}
                    onChange={(e) => setDegreeForm((f) => ({ ...f, semestersPerYear: e.target.value }))}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  >
                    <option value="1" className="bg-[#1c1f2e]">1 semester</option>
                    <option value="2" className="bg-[#1c1f2e]">2 semesters</option>
                    <option value="3" className="bg-[#1c1f2e]">3 semesters</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingDegree}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-60"
                  >
                    {savingDegree ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDegreeForm(false)}
                    className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl text-sm font-medium hover:bg-white/10 transition border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {degreeFormErr && (
                <p className="text-xs text-red-400 mt-2">{degreeFormErr}</p>
              )}
            </form>
          )}

          {degrees.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">
              No system degrees yet. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {degrees.map((deg) => (
                <div key={deg.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] transition">
                  <div>
                    <p className="font-medium text-slate-200 text-sm">{deg.name}</p>
                    <p className="text-xs text-slate-500">
                      {deg.totalYears} {deg.totalYears === 1 ? 'year' : 'years'} &middot; {deg.semestersPerYear} semester{deg.semestersPerYear !== 1 ? 's' : ''}/year
                      {(deg._count?.subjectTemplates ?? 0) > 0 && (
                        <span className="ml-2 text-emerald-400 font-medium">&middot; {deg._count!.subjectTemplates} subjects</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/degrees/${deg.id}`)}
                      className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition font-medium border border-indigo-500/20"
                    >
                      ✏️ Edit Template
                    </button>
                    <button
                      onClick={() => handleDeleteDegree(deg)}
                      className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition font-medium border border-red-500/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1c1f2e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border-b border-white/[0.06]">
            <h2 className="font-bold text-slate-200">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Degree</th>
                  <th className="px-4 py-3 text-center">Subjects</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((user) => {
                  const isSelf = String(user.id) === session?.user?.id;
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-indigo-400">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.role === 'SUPERADMIN'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-white/5 text-slate-400'
                        }`}>
                          {user.role === 'SUPERADMIN' ? '⭐ Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {user.degree?.name ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">
                        {user._count.subjects}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleRoleToggle(user)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                                  user.role === 'SUPERADMIN'
                                    ? 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                                }`}
                              >
                                {user.role === 'SUPERADMIN' ? 'Demote' : 'Make Admin'}
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-500/20 transition font-medium border border-red-500/20"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
