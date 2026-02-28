'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface PendingDegree {
  id: number | null; // null = custom not yet in DB
  name: string;
  totalYears: number;
  semestersPerYear: number;
  isCustom: boolean;
  // for custom degrees not yet in DB
  pendingCreate?: { name: string; totalYears: number; semestersPerYear: number };
}

export const PENDING_DEGREE_KEY = 'gpa_pending_degree';

interface Degree {
  id: number;
  name: string;
  totalYears: number;
  semestersPerYear: number;
  isCustom: boolean;
  hasSubjects?: boolean; // computed client-side
}

const DEGREE_META: Record<string, { icon: string; color: string }> = {
  'Computer Science':        { icon: '💻', color: 'from-blue-500 to-indigo-600' },
  'Information Technology':  { icon: '🖥️', color: 'from-cyan-500 to-blue-600' },
  'Software Engineering':    { icon: '⚙️', color: 'from-indigo-500 to-purple-600' },
  'Business Administration': { icon: '📊', color: 'from-amber-500 to-orange-600' },
  'Engineering':             { icon: '🔧', color: 'from-orange-500 to-red-600' },
  'Medicine':                { icon: '🩺', color: 'from-red-500 to-pink-600' },
  'Law':                     { icon: '⚖️', color: 'from-slate-500 to-gray-600' },
  'Education':               { icon: '📚', color: 'from-emerald-500 to-teal-600' },
  'Other':                   { icon: '🎓', color: 'from-purple-500 to-pink-600' },
};

export default function SelectDegreePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChanging = searchParams.get('change') === '1';

  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [committedDegrees, setCommittedDegrees] = useState<Degree[]>([]); // degrees with subjects
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [yearOverride, setYearOverride] = useState<Record<number, number>>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customYears, setCustomYears] = useState(3);
  const [customSemesters, setCustomSemesters] = useState(2);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Load all degrees + find which ones have subjects
    Promise.all([
      fetch('/api/degrees').then((r) => r.json()),
      fetch('/api/degrees?withSubjects=1').then((r) => r.json()),
    ])
      .then(([allDegrees, subjectDegreeIds]: [Degree[], number[]]) => {
        if (!Array.isArray(allDegrees)) { setError('Failed to load degrees.'); return; }
        const tagged = allDegrees.map((d) => ({
          ...d,
          hasSubjects: Array.isArray(subjectDegreeIds) && subjectDegreeIds.includes(d.id),
        }));
        setDegrees(tagged);
        setCommittedDegrees(tagged.filter((d) => d.hasSubjects));
      })
      .catch(() => setError('Failed to load degrees.'))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const committedIds = new Set(committedDegrees.map((d) => d.id));
  const systemDegrees = degrees.filter((d) => !d.isCustom && !committedIds.has(d.id));
  const customDegrees = degrees.filter((d) => d.isCustom && !committedIds.has(d.id));

  const handleSelect = (id: number, defaultYears: number) => {
    setSelectedId(id);
    setYearOverride((prev) => ({ ...prev, [id]: prev[id] ?? defaultYears }));
    setError('');
  };

  // Custom degree: just store locally, don't hit DB yet
  const handleCreateCustom = () => {
    if (!customName.trim()) { setError('Please enter a degree name.'); return; }
    // Use a temporary negative id to mark as not-yet-in-DB
    const tempId = -(Date.now());
    const newDegree: Degree = {
      id: tempId,
      name: customName.trim(),
      totalYears: customYears,
      semestersPerYear: customSemesters,
      isCustom: true,
      hasSubjects: false,
    };
    setDegrees((prev) => [...prev, newDegree]);
    setSelectedId(tempId);
    setYearOverride((prev) => ({ ...prev, [tempId]: customYears }));
    setShowCustomForm(false);
    setCustomName('');
    setError('');
  };

  const handleConfirm = async () => {
    if (!selectedId) { setError('Please select a degree to continue.'); return; }
    setIsSaving(true);

    const deg = degrees.find((d) => d.id === selectedId)!;
    const years = yearOverride[selectedId] ?? deg.totalYears;

    // ── Case 1: already-committed degree (has subjects) — just switch degreeId ──
    if (committedIds.has(selectedId)) {
      sessionStorage.setItem(PENDING_DEGREE_KEY, JSON.stringify({
        id: selectedId, name: deg.name, totalYears: deg.totalYears,
        semestersPerYear: deg.semestersPerYear, isCustom: deg.isCustom,
      }));
      await fetch('/api/degrees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degreeId: selectedId }),
      });
      setIsSaving(false);
      router.replace('/dashboard');
      return;
    }

    // ── Case 2: system degree selected with default years → commit immediately
    //    so subject templates get copied right now ──
    if (selectedId > 0 && !deg.isCustom && years === deg.totalYears) {
      sessionStorage.setItem(PENDING_DEGREE_KEY, JSON.stringify({
        id: selectedId, name: deg.name, totalYears: deg.totalYears,
        semestersPerYear: deg.semestersPerYear, isCustom: deg.isCustom,
      }));
      await fetch('/api/degrees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degreeId: selectedId }),
      });
      setIsSaving(false);
      router.replace('/dashboard');
      return;
    }

    // ── Case 3: custom new degree (tempId < 0) or system degree with overridden years
    //    → defer via sessionStorage so dashboard can create it on first subject ──
    const pending: PendingDegree = selectedId < 0
      ? {
          id: null,
          name: deg.name,
          totalYears: years,
          semestersPerYear: deg.semestersPerYear,
          isCustom: true,
          pendingCreate: { name: deg.name, totalYears: years, semestersPerYear: deg.semestersPerYear },
        }
      : {
          id: selectedId,
          name: deg.name,
          totalYears: years,
          semestersPerYear: deg.semestersPerYear,
          isCustom: deg.isCustom,
          pendingCreate: { name: deg.name, totalYears: years, semestersPerYear: deg.semestersPerYear },
        };

    sessionStorage.setItem(PENDING_DEGREE_KEY, JSON.stringify(pending));
    setIsSaving(false);
    router.replace('/dashboard');
  };

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedDegree = degrees.find((d) => d.id === selectedId);

  const DegreeCard = ({ degree, accent = 'indigo' }: { degree: Degree; accent?: 'indigo' | 'purple' | 'emerald' }) => {
    const meta = DEGREE_META[degree.name] ?? { icon: '🎓', color: 'from-indigo-500 to-purple-600' };
    const isSelected = selectedId === degree.id;
    const years = yearOverride[degree.id] ?? degree.totalYears;
    const ringColor = accent === 'emerald' ? 'border-emerald-500 shadow-emerald-900/40' : accent === 'purple' ? 'border-purple-500 shadow-purple-900/40' : 'border-indigo-500 shadow-indigo-900/40';
    const btnColor = accent === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : accent === 'purple' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30';
    const checkColor = accent === 'emerald' ? 'bg-emerald-500' : accent === 'purple' ? 'bg-purple-500' : 'bg-indigo-500';
    const checkText = accent === 'emerald' ? 'text-emerald-400' : accent === 'purple' ? 'text-purple-400' : 'text-indigo-400';
    const iconColor = degree.isCustom ? 'from-purple-500 to-pink-600' : meta.color;

    return (
      <div
        onClick={() => handleSelect(degree.id, degree.totalYears)}
        className={`rounded-2xl p-4 cursor-pointer border-2 transition-all ${
          isSelected
            ? `${ringColor} bg-[#1c1f2e] shadow-lg`
            : 'border-transparent bg-[#1c1f2e] hover:border-white/10'
        }`}
      >
        <div className={`w-full h-10 rounded-xl bg-gradient-to-r ${iconColor} flex items-center justify-center text-xl mb-3`}>
          {degree.isCustom ? '🎓' : meta.icon}
        </div>
        <p className="font-semibold text-slate-200 text-xs leading-snug mb-2">{degree.name}</p>
        {isSelected ? (
          <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setYearOverride((p) => ({ ...p, [degree.id]: Math.max(1, years - 1) }))} className={`w-6 h-6 rounded-lg font-bold transition flex items-center justify-center ${btnColor}`}>-</button>
            <span className="text-xs font-semibold text-slate-300 w-16 text-center">{years} {years === 1 ? 'year' : 'years'}</span>
            <button onClick={() => setYearOverride((p) => ({ ...p, [degree.id]: Math.min(10, years + 1) }))} className={`w-6 h-6 rounded-lg font-bold transition flex items-center justify-center ${btnColor}`}>+</button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">{degree.totalYears}y · {degree.semestersPerYear} sem/yr</p>
        )}
        {isSelected && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`w-4 h-4 rounded-full ${checkColor} flex items-center justify-center`}>
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </span>
            <span className={`text-xs font-semibold ${checkText}`}>Selected</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 py-10">
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-3xl mb-4 shadow-xl shadow-indigo-900/60">🎓</div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            {isChanging ? 'Change Degree' : `Welcome, ${session?.user?.name}!`}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isChanging ? 'Pick a different degree to work on.' : 'Pick your degree — you can adjust the years before continuing.'}
          </p>
        </div>

        {error && <p className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-4">{error}</p>}

        {/* Summary + confirm — moved to top */}
        {selectedDegree && (
          <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-xl shadow-indigo-900/60">
            <div>
              <p className="font-bold">{selectedDegree.name}</p>
              <p className="text-xs opacity-75 mt-0.5">
                {yearOverride[selectedDegree.id] ?? selectedDegree.totalYears} years · {selectedDegree.semestersPerYear} semesters/year
                {committedIds.has(selectedDegree.id) && <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full">Active</span>}
              </p>
            </div>
            <button onClick={handleConfirm} disabled={isSaving} className="bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-50 transition disabled:opacity-40 flex-shrink-0">
              {isSaving ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Active degrees (with subjects) — shown at top when changing or when 2+ committed */}
        {committedDegrees.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Active Degrees
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {committedDegrees.map((degree) => <DegreeCard key={degree.id} degree={degree} accent="emerald" />)}
            </div>
          </div>
        )}

        {/* System recommended degrees */}
        {systemDegrees.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Recommended Degrees
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {systemDegrees.map((degree) => <DegreeCard key={degree.id} degree={degree} accent="indigo" />)}
            </div>
          </div>
        )}

        {/* User's custom degrees (without subjects) */}
        {customDegrees.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Custom Degrees</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {customDegrees.map((degree) => <DegreeCard key={degree.id} degree={degree} accent="purple" />)}
            </div>
          </div>
        )}

        {/* Add custom degree */}
        <div className="bg-[#1c1f2e] rounded-2xl border-2 border-dashed border-white/10 overflow-hidden">
          {!showCustomForm ? (
            <button onClick={() => setShowCustomForm(true)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.03] transition text-left">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg font-bold">+</span>
              <div>
                <p className="font-semibold text-slate-300 text-sm">Add your own degree</p>
                <p className="text-xs text-slate-500">Custom name, years &amp; semesters</p>
              </div>
            </button>
          ) : (
            <div className="p-5 space-y-3">
              <p className="font-semibold text-slate-200 text-sm">New Custom Degree</p>
              <input
                type="text"
                placeholder="e.g. BSc Computer Networking"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Total Years</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCustomYears((y) => Math.max(1, y - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition flex items-center justify-center border border-white/10">-</button>
                    <span className="text-sm font-semibold text-slate-200 w-8 text-center">{customYears}</span>
                    <button onClick={() => setCustomYears((y) => Math.min(10, y + 1))} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition flex items-center justify-center border border-white/10">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Semesters / Year</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCustomSemesters((s) => Math.max(1, s - 1))} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition flex items-center justify-center border border-white/10">-</button>
                    <span className="text-sm font-semibold text-slate-200 w-8 text-center">{customSemesters}</span>
                    <button onClick={() => setCustomSemesters((s) => Math.min(4, s + 1))} className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition flex items-center justify-center border border-white/10">+</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreateCustom} disabled={isCreating} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-40">
                  Add &amp; Select
                </button>
                <button onClick={() => { setShowCustomForm(false); setError(''); }} className="flex-1 bg-white/5 text-slate-400 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition border border-white/10">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* No longer show the continue button or error at the bottom */}
      </div>
    </div>
  );
}
