'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified successfully! You can now sign in.');
    } else if (searchParams.get('registered') === 'true') {
      setMessage('Account created successfully! You can now sign in.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username or password');
      } else {
        // Route based on how many committed degrees the user has
        try {
          const idsRes = await fetch('/api/degrees?withSubjects=1');
          const committedIds: number[] = await idsRes.json();
          if (committedIds.length > 1) {
            router.push('/select-degree'); // multiple active degrees → let user pick
          } else {
            router.push('/dashboard'); // 0 or 1 → dashboard handles the rest
          }
        } catch {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

        <img src="/logo.png" alt="UniGPA" className="h-24 w-auto mb-10 drop-shadow-xl" />

        <h2 className="text-white text-4xl font-bold text-center leading-snug mb-4">
          Track every grade,<br />
          <span className="text-indigo-300">own your future.</span>
        </h2>
        <p className="text-indigo-200 text-center text-lg max-w-sm">
          Monitor your GPA, manage subjects, and stay on top of your academic journey — all in one place.
        </p>

        {/* Decorative stat cards */}
        <div className="mt-12 flex gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4 text-center">
            <p className="text-white text-2xl font-bold">4.0</p>
            <p className="text-indigo-300 text-sm">Perfect GPA</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4 text-center">
            <p className="text-white text-2xl font-bold">∞</p>
            <p className="text-indigo-300 text-sm">Subjects</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4 text-center">
            <p className="text-white text-2xl font-bold">📊</p>
            <p className="text-indigo-300 text-sm">Live Stats</p>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0f1117] p-8 lg:max-w-lg xl:max-w-xl">
        {/* Mobile logo */}
        <img src="/logo.png" alt="UniGPA" className="h-16 w-auto mb-8 lg:hidden" />

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 mb-8">Sign in to your UniGPA account</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-5 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your_username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
