'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, KitListItem, Requirement } from '@/lib/types';
import {
  Briefcase,
  Plus,
  Trash2,
  LogOut,
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const SAMPLE_JD = `Staff Backend Platform Engineer
Company: Acme Cloud Systems
Location: Remote (US / EMEA)

About Acme:
Acme is building the next-generation global edge compute and event streaming platform.

The Role:
We are looking for a Staff Backend Engineer to lead the architecture and resilience of our distributed state synchronization engine.

Responsibilities:
- Architect, build, and maintain high-throughput distributed event streaming pipelines handling millions of events/sec.
- Drive database scalability, schema partitioning, and query optimization across PostgreSQL and Redis clusters.
- Lead architectural review forums and mentor senior and mid-level engineers.
- Partner with security and site-reliability teams to guarantee 99.99% system availability.

Requirements:
- 7+ years of hands-on software engineering experience in Go, Rust, or Node.js/TypeScript (Required)
- Deep expertise in distributed systems fundamentals, consensus algorithms (Raft/Paxos), and event streaming with Kafka (Required)
- Production experience with high-scale PostgreSQL, indexing strategies, and connection pooling (Required)
- Demonstrated track record of mentoring engineers and setting technical engineering standards (Required)
- Hands-on experience with Kubernetes, eBPF network observability, or Envoy proxy (Bonus / Nice to have)
- Prior experience in high-volume fintech or telemetry platforms (Bonus / Nice to have)`;

const SAMPLE_THIN_JD = `Senior Developer.
Must have 4+ years of Go and PostgreSQL.
Bonus points for Docker.`;

function isErrorLog(log: string): boolean {
  return /^(error|case .* failed)/i.test(log.trim());
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [kits, setKits] = useState<KitListItem[]>([]);
  const [loadingKits, setLoadingKits] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationPercent, setGenerationPercent] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState('');

  const [batchFile, setBatchFile] = useState<File | null>(null);

  const loadKits = useCallback(async () => {
    setLoadingKits(true);
    try {
      const res = await api.kits.list();
      setKits(res.kits);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingKits(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.auth.me()
      .then(res => {
        if (isMounted) setUser(res.user);
      })
      .catch(() => {
        if (isMounted) router.push('/');
      });

    api.kits.list()
      .then(res => {
        if (isMounted) {
          setKits(res.kits);
          setLoadingKits(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error(err);
          setLoadingKits(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await api.auth.logout();
    router.push('/');
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setJd('');
    setCompanyUrl('');
    setCompanyName('');
    setLocation('');
    setDays(5);
    setGenerationError('');
    setGenerationLogs([]);
  };

  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd || !companyUrl) return;

    setIsGenerating(true);
    setGenerationError('');
    setGenerationLogs(['Starting research and preparation pipeline.']);
    setGenerationPercent(5);
    setGenerationStep('Validating inputs');

    try {
      setGenerationLogs(prev => [...prev, `Researching company website: ${companyUrl}`]);
      setGenerationPercent(20);
      setGenerationStep('Researching company site');

      const res = await api.kits.generate({
        jd,
        companyUrl,
        days,
        companyName: companyName || undefined,
        location: location || undefined,
      });

      setGenerationPercent(100);
      setGenerationStep('Kit ready');
      setGenerationLogs(prev => [...prev, 'Validation passed.', 'Coverage check complete.']);

      setTimeout(() => {
        setIsGenerating(false);
        setShowCreateModal(false);
        router.push(`/kit/${res.id}`);
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setGenerationError(msg);
      setGenerationLogs(prev => [...prev, `Error: ${msg}`]);
      setIsGenerating(false);
    }
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFile) return;

    setIsGenerating(true);
    setGenerationError('');
    setGenerationLogs(['Reading batch file.']);

    try {
      const text = await batchFile.text();
      const cases = JSON.parse(text);

      if (!Array.isArray(cases)) {
        throw new Error('Batch file must contain a JSON array of cases.');
      }

      setGenerationLogs(prev => [...prev, `Loaded ${cases.length} cases. Processing in order.`]);

      for (let i = 0; i < cases.length; i++) {
        const c = cases[i] as { id?: string; jd: string; company_url: string; days?: number };
        setGenerationStep(`Processing case ${i + 1} of ${cases.length}: ${c.id || c.company_url}`);
        setGenerationPercent(Math.round(((i + 1) / cases.length) * 100));

        try {
          await api.kits.generate({
            jd: c.jd,
            companyUrl: c.company_url,
            days: c.days || 5,
          });
          setGenerationLogs(prev => [...prev, `Case "${c.id || i + 1}" completed.`]);
        } catch (caseErr: unknown) {
          const caseMsg = caseErr instanceof Error ? caseErr.message : 'Failed';
          setGenerationLogs(prev => [...prev, `Case "${c.id || i + 1}" failed: ${caseMsg}`]);
        }
      }

      await loadKits();
      setTimeout(() => {
        setIsGenerating(false);
        setShowCreateModal(false);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch processing failed.';
      setGenerationError(msg);
      setIsGenerating(false);
    }
  };

  const handleDeleteKit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this prep kit? This cannot be undone.')) return;
    try {
      await api.kits.delete(id);
      setKits(prev => prev.filter(k => k.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Interview Prep Kit</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-500 hidden sm:inline">
              {user?.name || user?.email}
            </span>
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-[13px] flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" /> New prep kit
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Prep kits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Preparation plans built from job postings and company research.
          </p>
        </div>

        {loadingKits ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        ) : kits.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto bg-white">
            <h2 className="text-[15px] font-semibold">No prep kits yet</h2>
            <p className="text-sm text-slate-500 mt-1.5 mb-6">
              Paste a job description and company website to build your first preparation plan.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-[13px] inline-flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" /> Create your first kit
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                  <th className="py-3 px-5 font-medium">Role</th>
                  <th className="py-3 px-5 font-medium hidden md:table-cell">Timeline</th>
                  <th className="py-3 px-5 font-medium hidden sm:table-cell">Questions</th>
                  <th className="py-3 px-5 font-medium hidden lg:table-cell">Coverage</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kits.map(({ id, kit }) => {
                  const mustReqCount = kit.role?.requirements?.filter((r: Requirement) => r.priority === 'must').length || 0;
                  const totalReqCount = kit.role?.requirements?.length || 0;
                  const daysCount = kit.schedule?.days_available || 5;

                  return (
                    <tr
                      key={id}
                      onClick={() => router.push(`/kit/${id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-5">
                        <p className="font-medium text-slate-900">{kit.role?.title || 'Software Engineer'}</p>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                          {kit.source?.company || 'Company'}
                          {kit.role?.seniority ? ` · ${kit.role.seniority}` : ''}
                        </p>
                      </td>
                      <td className="py-4 px-5 text-slate-600 hidden md:table-cell">{daysCount} days</td>
                      <td className="py-4 px-5 text-slate-600 hidden sm:table-cell tabular-nums">
                        {kit.questions?.length || 0} questions · {kit.flashcards?.length || 0} cards
                      </td>
                      <td className="py-4 px-5 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                          {mustReqCount}/{totalReqCount} must-haves
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[13px] font-medium text-slate-700 hidden sm:inline-flex items-center gap-1 mr-1">
                            Open <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                          <button
                            onClick={e => handleDeleteKit(id, e)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                            title="Delete kit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-white max-w-2xl w-full p-6 shadow-xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <h2 className="text-base font-semibold tracking-tight">New prep kit</h2>
              {!isGenerating && (
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold">{generationStep}</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">This usually takes under a minute.</p>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationPercent}%` }}
                  ></div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 h-40 overflow-y-auto thin-scroll text-[13px] space-y-1.5">
                  {generationLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-snug">
                      {isErrorLog(log) ? (
                        <XCircle className="h-3.5 w-3.5 mt-0.5 text-red-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                      )}
                      <span className={isErrorLog(log) ? 'text-red-700' : 'text-slate-600'}>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-6 border-b border-slate-200 mb-6">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`pb-2.5 text-sm font-medium transition-colors ${activeTab === 'single' ? 'text-slate-900 border-b-2 border-slate-900 -mb-px' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Single role
                  </button>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className={`pb-2.5 text-sm font-medium transition-colors ${activeTab === 'batch' ? 'text-slate-900 border-b-2 border-slate-900 -mb-px' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Batch upload
                  </button>
                </div>

                {generationError && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2">
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}

                {activeTab === 'single' ? (
                  <form onSubmit={handleGenerateSingle} className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-slate-700">
                          Job description
                        </label>
                        <div className="flex items-center gap-2 text-[13px]">
                          <button
                            type="button"
                            onClick={() => {
                              setJd(SAMPLE_JD);
                              setCompanyUrl('https://example.com');
                              setCompanyName('Acme Cloud');
                            }}
                            className="text-slate-600 hover:text-slate-900 underline underline-offset-4"
                          >
                            Load sample
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setJd(SAMPLE_THIN_JD);
                              setCompanyUrl('https://example.com');
                              setCompanyName('Minimalist Co');
                            }}
                            className="text-slate-600 hover:text-slate-900 underline underline-offset-4"
                          >
                            Load short sample
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={7}
                        required
                        value={jd ?? ''}
                        onChange={e => setJd(e.target.value || '')}
                        placeholder="Paste the full job posting here…"
                        className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono transition"
                      />
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">{(jd || '').length} characters</p>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                        Company website
                      </label>
                      <input
                        type="text"
                        required
                        value={companyUrl ?? ''}
                        onChange={e => setCompanyUrl(e.target.value || '')}
                        placeholder="https://company.com"
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Used to research what the company does and how they hire.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-slate-700">
                          Timeline: <span className="font-semibold text-slate-900 tabular-nums">{days ?? 5} days</span>
                        </label>
                        <span className="text-xs text-slate-400">1–60 days</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={days ?? 5}
                        onChange={e => setDays(parseInt(e.target.value, 10) || 5)}
                        className="w-full cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Company name <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="text"
                          value={companyName ?? ''}
                          onChange={e => setCompanyName(e.target.value || '')}
                          placeholder="e.g. Stripe"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Location <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="text"
                          value={location ?? ''}
                          onChange={e => setLocation(e.target.value || '')}
                          placeholder="e.g. Remote"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition mt-2"
                    >
                      Generate prep kit
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleBatchUpload} className="space-y-4">
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-600 space-y-2">
                      <p className="font-medium text-slate-900">Cases file format</p>
                      <pre className="p-2.5 rounded-md bg-white border border-slate-200 font-mono text-xs text-slate-600 overflow-x-auto">
{`[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer...",
    "company_url": "https://stripe.com",
    "days": 5
  }
]`}
                      </pre>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Select JSON file</label>
                      <input
                        type="file"
                        accept=".json"
                        required
                        onChange={e => setBatchFile(e.target.files?.[0] || null)}
                        className="w-full text-[13px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[13px] file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-700 cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!batchFile}
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition disabled:opacity-50 mt-2"
                    >
                      Process batch
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
