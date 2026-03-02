'use client';

export default function LoadingScreen() {
  const bars = [
    { height: 'h-6',  delay: '0s',    grade: 'C',  color: 'from-amber-500 to-orange-500' },
    { height: 'h-8',  delay: '0.15s', grade: 'B',  color: 'from-blue-500 to-cyan-500' },
    { height: 'h-11', delay: '0.3s',  grade: 'B+', color: 'from-blue-400 to-indigo-500' },
    { height: 'h-14', delay: '0.45s', grade: 'A',  color: 'from-indigo-500 to-purple-500' },
    { height: 'h-16', delay: '0.6s',  grade: 'A+', color: 'from-emerald-400 to-teal-500' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] overflow-hidden">
      {/* Subtle background shimmer */}
      <div className="absolute inset-0 gpa-shimmer opacity-40" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Orbiting dot */}
        <div className="absolute w-0 h-0" style={{ top: '40%' }}>
          <div className="gpa-orbit">
            <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50" />
          </div>
        </div>

        {/* GPA Bar Chart — animated bars that pulse like a grade chart */}
        <div className="flex items-end gap-2.5">
          {bars.map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              {/* Grade letter floats above */}
              <span
                className="text-[10px] font-bold text-slate-500 gpa-float"
                style={{ animationDelay: bar.delay }}
              >
                {bar.grade}
              </span>
              {/* Bar container */}
              <div className="w-5 h-20 rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-hidden relative flex items-end">
                {/* Animated fill */}
                <div
                  className={`w-full rounded-lg bg-gradient-to-t ${bar.color} gpa-bar origin-bottom`}
                  style={{
                    animationDelay: bar.delay,
                    height: '100%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* GPA counter */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 gpa-float">
              UniGPA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Calculating your future
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
