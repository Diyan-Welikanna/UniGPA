'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      if (data.verificationCode) {
        setDevCode(data.verificationCode);
      }
      setMessage(data.message || 'Account created!');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid verification code');
        return;
      }

      setMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login?verified=true');
      }, 2000);
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
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

        <img src="/logo.png" alt="UniGPA" className="h-24 w-auto mb-10 drop-shadow-xl" />

        <h2 className="text-white text-4xl font-bold text-center leading-snug mb-4">
          Your academic journey<br />
          <span className="text-indigo-300">starts here.</span>
        </h2>
        <p className="text-indigo-200 text-center text-lg max-w-sm">
          Join UniGPA to track your grades, calculate your GPA, and get insights across all your semesters.
        </p>

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
          <h1 className="text-2xl font-bold text-white mb-1">
            {step === 'register' ? 'Create an account' : 'Verify your email'}
          </h1>
          <p className="text-gray-400 mb-8">
            {step === 'register' ? 'Create your UniGPA account today' : devCode ? `Your code: ${devCode}` : `Enter the code sent to ${formData.email}`}
          </p>

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

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="john_doe"
                />
                <p className="text-xs text-gray-500 mt-1">Letters, numbers and underscores only</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 bg-[#1c1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Check your email for the 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button
                type="button"
                onClick={() => setStep('register')}
                className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
              >
                ← Back to registration
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-gray-500 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
