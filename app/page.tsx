'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Briefcase, Check, ArrowRight } from 'lucide-react';

const CAPABILITIES = [
  {
    title: 'Company research',
    body: 'Reads the company site and hiring pages so questions reflect how they actually work.',
  },
  {
    title: 'Requirement coverage',
    body: 'Every must-have requirement in the posting gets targeted questions. Gaps are closed automatically.',
  },
  {
    title: 'Day-by-day schedule',
    body: 'Material is distributed across your exact timeline, hardest topics first.',
  },
  {
    title: 'Active recall practice',
    body: 'Flashcards and mock-answer scoring ordered by your weakest areas.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.auth.me()
      .then(() => router.push('/dashboard'))
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await api.auth.login({ email, password });
      } else {
        await api.auth.register({ email, password, name });
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    const demoEmail = `demo_${Date.now()}@interviewprep.ai`;
    try {
      await api.auth.register({
        email: demoEmail,
        password: 'Password123!',
        name: 'Alex Candidate',
      });
      router.push('/dashboard');
    } catch {
      try {
        await api.auth.login({ email: demoEmail, password: 'Password123!' });
        router.push('/dashboard');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Demo sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-slate-900">
              Interview Prep Kit
            </span>
          </div>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-start w-full">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Interview preparation workspace
          </p>

          <h1 className="mt-4 text-4xl sm:text-[44px] font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Prepare for the job you actually applied to.
          </h1>

          <p className="mt-5 text-[17px] text-slate-600 leading-relaxed max-w-xl">
            Paste a job description and the company website. You get a structured
            preparation plan — company brief, question bank, flashcards, and a
            schedule that fits the days you have left.
          </p>

          <ul className="mt-9 divide-y divide-slate-200 border-y border-slate-200 max-w-xl">
            {CAPABILITIES.map(item => (
              <li key={item.title} className="py-4 flex gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-8">
          <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm max-w-md w-full ml-auto">
            <div className="flex items-center gap-1 border-b border-slate-200 pb-4 mb-6">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isLogin ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!isLogin ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Create account
              </button>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              {isLogin
                ? 'Sign in to continue to your workspace.'
                : 'Create an account to build your first prep kit.'}
            </p>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-slate-900 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-slate-900 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? 'Please wait…' : (isLogin ? 'Sign in' : 'Create account')}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="text-[13px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 transition"
              >
                Continue with a demo account
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 py-6">
        <p className="text-center text-xs text-slate-400">
          Interview Prep Kit
        </p>
      </footer>
    </div>
  );
}
