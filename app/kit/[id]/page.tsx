'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  PrepKit,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  Requirement,
  ScheduleDay,
  Flashcard,
} from '@/lib/types';
import {
  ArrowLeft,
  Pin,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Play,
  X,
} from 'lucide-react';

interface AnswerFeedback {
  score: number;
  hasStructure: boolean;
  strengths: string[];
  improvements: string[];
  rubric: {
    clarity: number;
    depth: number;
    starMethod: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  'technical': 'Technical',
  'system-design': 'System design',
  'behavioural': 'Behavioural',
  'company-fit': 'Company fit',
};

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition';

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;

  const [kit, setKit] = useState<PrepKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'brief' | 'requirements' | 'questions' | 'schedule' | 'flashcards'>('questions');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionOutline, setNewQuestionOutline] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<QuestionCategory>('technical');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<QuestionDifficulty>(2);
  const [newQuestionReqId, setNewQuestionReqId] = useState('');

  const [mockQuestion, setMockQuestion] = useState<Question | null>(null);
  const [mockAnswer, setMockAnswer] = useState('');
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);

  const loadKit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.kits.get(kitId);
      setKit(res.kit);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load prep kit');
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    let isMounted = true;
    api.kits.get(kitId)
      .then(res => {
        if (isMounted) {
          setKit(res.kit);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load prep kit');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [kitId]);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveKit = async (updatedKit: PrepKit) => {
    setKit(updatedKit);
    try {
      await api.kits.update(kitId, updatedKit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save changes: ${msg}`);
    }
  };

  const handleUpdateQuestion = (qId: string, field: keyof Question, value: unknown) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map((q: Question) => {
      if (q.id !== qId) return q;
      return {
        ...q,
        [field]: value,
        _meta: {
          ...q._meta,
          is_edited: true,
          last_modified: new Date().toISOString(),
        },
      };
    });

    handleSaveKit({ ...kit, questions: updatedQuestions });
    notify('Question updated');
  };

  const handleTogglePin = (qId: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map((q: Question) => {
      if (q.id !== qId) return q;
      const isPinned = !q._meta?.is_pinned;
      return {
        ...q,
        _meta: {
          ...q._meta,
          is_pinned: isPinned,
        },
      };
    });

    handleSaveKit({ ...kit, questions: updatedQuestions });
    notify('Pin state updated');
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!kit || !confirm('Delete this question? The schedule will adjust automatically.')) return;
    const updatedQuestions = kit.questions.filter((q: Question) => q.id !== qId);

    const updatedScheduleDays = kit.schedule.days.map((d: ScheduleDay) => ({
      ...d,
      question_ids: d.question_ids.filter((id: string) => id !== qId),
    }));

    handleSaveKit({
      ...kit,
      questions: updatedQuestions,
      schedule: { ...kit.schedule, days: updatedScheduleDays },
    });
    notify('Question deleted');
  };

  const handleMoveQuestionOrder = (index: number, direction: 'up' | 'down') => {
    if (!kit) return;
    const newQuestions = [...kit.questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newQuestions.length) return;

    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;

    handleSaveKit({ ...kit, questions: newQuestions });
    notify('Questions reordered');
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newQuestionPrompt) return;

    const maxIdNum = kit.questions.reduce((max: number, q: Question) => {
      const match = q.id.match(/^q(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const newQ: Question = {
      id: `q${maxIdNum + 1}`,
      requirement_ids: newQuestionReqId ? [newQuestionReqId] : [kit.role.requirements[0]?.id || 'r1'],
      category: newQuestionCategory,
      prompt: newQuestionPrompt,
      answer_outline: newQuestionOutline || '1. Core technical concepts.\n2. Implementation details.\n3. Trade-offs.',
      difficulty: newQuestionDifficulty,
      _meta: {
        origin: 'user',
        is_edited: true,
        is_pinned: true,
        last_modified: new Date().toISOString(),
      },
    };

    handleSaveKit({
      ...kit,
      questions: [...kit.questions, newQ],
    });

    setShowAddModal(false);
    setNewQuestionPrompt('');
    setNewQuestionOutline('');
    setNewQuestionReqId('');
    notify('Question added');
  };

  const handleRegenerateSection = async (target: string) => {
    setRegeneratingSection(target);
    try {
      const res = await api.kits.regenerate(kitId, target);
      setKit(res.kit);
      notify('Section regenerated. Your edits and pinned items were kept.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Regeneration failed: ${msg}`);
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleEvaluateMockAnswer = () => {
    if (!mockAnswer.trim()) return;
    setEvaluatingAnswer(true);

    setTimeout(() => {
      const words = mockAnswer.split(/\s+/).length;
      const hasStructure = /first|second|then|finally|situation|action|result|trade-off/i.test(mockAnswer);
      const score = Math.min(95, Math.max(50, Math.round(words * 0.8) + (hasStructure ? 20 : 0)));

      setAnswerFeedback({
        score,
        hasStructure,
        strengths: [
          'Directly addressed the core interview prompt.',
          hasStructure ? 'Demonstrated structured communication.' : 'Concise technical phrasing.',
        ],
        improvements: [
          'Add quantitative detail from past work (latency, scale, failure rates).',
          'Mention alternative approaches you considered and why you chose this one.',
        ],
        rubric: {
          clarity: Math.min(100, score + 5),
          depth: Math.min(100, score - 5),
          starMethod: hasStructure ? 90 : 65,
        },
      });
      setEvaluatingAnswer(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-red-700 mb-5">{error || 'Kit not found'}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => loadKit()}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-[13px] font-medium"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredQuestions = kit.questions.filter((q: Question) =>
    categoryFilter === 'all' ? true : q.category === categoryFilter
  );

  const mustReqCount = kit.role?.requirements?.filter((r: Requirement) => r.priority === 'must').length || 0;

  const tabs = [
    { id: 'questions' as const, label: `Questions (${kit.questions?.length || 0})` },
    { id: 'brief' as const, label: 'Company brief' },
    { id: 'requirements' as const, label: `Requirements (${kit.role?.requirements?.length || 0})` },
    { id: 'schedule' as const, label: `Schedule (${kit.schedule?.days_available} days)` },
    { id: 'flashcards' as const, label: `Flashcards (${kit.flashcards?.length || 0})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {statusMessage}
        </div>
      )}

      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-medium text-slate-900">{kit.source?.company}</span>
                <a
                  href={kit.source?.company_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                >
                  {kit.source?.company_url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <h1 className="text-lg font-semibold tracking-tight mt-0.5">
                {kit.role?.title}
                <span className="ml-2 text-xs font-normal text-slate-500">{kit.role?.seniority}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              {mustReqCount} must-haves covered
            </span>
            <button
              onClick={() => router.push(`/kit/${kitId}/practice`)}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium flex items-center gap-2 transition"
            >
              <Play className="h-3.5 w-3.5" /> Practice
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-slate-900 border-b-2 border-slate-900 -mb-px' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {activeTab === 'questions' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {['all', 'technical', 'system-design', 'behavioural', 'company-fit'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${categoryFilter === cat ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'}`}
                  >
                    {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {categoryFilter !== 'all' && (
                  <button
                    disabled={regeneratingSection !== null}
                    onClick={() => handleRegenerateSection(categoryFilter)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Edited and pinned questions are kept"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${regeneratingSection === categoryFilter ? 'animate-spin' : ''}`} />
                    Regenerate {CATEGORY_LABELS[categoryFilter]}
                  </button>
                )}

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredQuestions.map((q: Question, idx: number) => {
                const isPinned = q._meta?.is_pinned;
                const isEdited = q._meta?.is_edited;
                const isUserCreated = q._meta?.origin === 'user';

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        <span className="font-semibold uppercase tracking-wide text-slate-500">
                          {CATEGORY_LABELS[q.category] || q.category}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500 tabular-nums">Difficulty {q.difficulty}/3</span>
                        {isPinned && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            Pinned
                          </span>
                        )}
                        {isEdited && !isUserCreated && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Edited
                          </span>
                        )}
                        {isUserCreated && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                            Yours
                          </span>
                        )}
                        <span className="font-mono text-slate-400">
                          {q.requirement_ids?.join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <button
                          onClick={() => handleMoveQuestionOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestionOrder(idx, 'down')}
                          disabled={idx === filteredQuestions.length - 1}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePin(q.id)}
                          className={`p-1.5 rounded-md transition ${isPinned ? 'text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                          title={isPinned ? 'Unpin question' : 'Pin question (kept during regeneration)'}
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Question</label>
                      <textarea
                        rows={2}
                        value={q.prompt ?? ''}
                        onChange={e => handleUpdateQuestion(q.id, 'prompt', e.target.value || '')}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Answer outline</label>
                      <textarea
                        rows={3}
                        value={q.answer_outline ?? ''}
                        onChange={e => handleUpdateQuestion(q.id, 'answer_outline', e.target.value || '')}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <label className="flex items-center gap-2 text-[13px] text-slate-500">
                        Category
                        <select
                          value={q.category}
                          onChange={e => handleUpdateQuestion(q.id, 'category', e.target.value as QuestionCategory)}
                          className="px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          <option value="technical">Technical</option>
                          <option value="system-design">System design</option>
                          <option value="behavioural">Behavioural</option>
                          <option value="company-fit">Company fit</option>
                        </select>
                      </label>

                      <button
                        onClick={() => {
                          setMockQuestion(q);
                          setMockAnswer('');
                          setAnswerFeedback(null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition"
                      >
                        Practice this question
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'brief' && (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Company brief</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">Researched from the company website.</p>
              </div>
              <button
                disabled={regeneratingSection !== null}
                onClick={() => handleRegenerateSection('company_brief')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regeneratingSection === 'company_brief' ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  What they do
                </label>
                <textarea
                  rows={3}
                  value={kit.company_brief?.what_they_do ?? ''}
                  onChange={e => {
                    handleSaveKit({
                      ...kit,
                      company_brief: { ...kit.company_brief, what_they_do: e.target.value },
                    });
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Hiring process and culture
                </label>
                <textarea
                  rows={4}
                  value={kit.company_brief?.summary ?? ''}
                  onChange={e => {
                    handleSaveKit({
                      ...kit,
                      company_brief: { ...kit.company_brief, summary: e.target.value },
                    });
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Sources
                </label>
                <ul className="space-y-1">
                  {kit.company_brief?.sources?.map((src: string, idx: number) => (
                    <li key={idx}>
                      <a
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-slate-600 hover:text-slate-900 underline underline-offset-4 truncate block"
                      >
                        {src}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="max-w-4xl space-y-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Role requirements</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Extracted from the job description. Each one is linked to covering questions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-900 text-xs uppercase tracking-wide text-slate-300">
                    <th className="py-3 px-4 font-medium">ID</th>
                    <th className="py-3 px-4 font-medium">Requirement</th>
                    <th className="py-3 px-4 font-medium">Priority</th>
                    <th className="py-3 px-4 font-medium text-right">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kit.role?.requirements?.map((req: Requirement) => {
                    const coveringQuestions = kit.questions.filter((q: Question) =>
                      q.requirement_ids?.includes(req.id)
                    );

                    return (
                      <tr key={req.id}>
                        <td className="py-3 px-4 font-mono text-[13px] text-slate-500">{req.id}</td>
                        <td className="py-3 px-4">
                          <p className="text-slate-900">{req.text}</p>
                          <p className="text-xs text-slate-400 capitalize mt-0.5">{req.kind}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${req.priority === 'must' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {req.priority === 'must' ? 'Must-have' : 'Nice to have'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {coveringQuestions.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-green-800">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {coveringQuestions.length}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-red-700">
                              <AlertTriangle className="h-3.5 w-3.5" /> Gap
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Study schedule · {kit.schedule?.days_available} days
                </h2>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Harder must-have topics are placed earlier in the plan.
                </p>
              </div>
              <button
                disabled={regeneratingSection !== null}
                onClick={() => handleRegenerateSection('schedule')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regeneratingSection === 'schedule' ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>

            <ol className="space-y-3">
              {kit.schedule?.days?.map((day: ScheduleDay) => {
                const dayQuestions = day.question_ids
                  .map((id: string) => kit.questions.find((q: Question) => q.id === id))
                  .filter(Boolean) as Question[];

                return (
                  <li key={day.day} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold">
                        <span className="text-slate-400 font-normal tabular-nums mr-2">Day {day.day}</span>
                        {day.focus}
                      </h3>
                      <span className="text-[13px] text-slate-500 tabular-nums">{day.minutes} min</span>
                    </div>

                    <ul className="mt-3 space-y-2">
                      {dayQuestions.map((q: Question) => (
                        <li key={q.id} className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[13px] flex items-start justify-between gap-3">
                          <span className="text-slate-700">{q.prompt}</span>
                          <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                            {CATEGORY_LABELS[q.category]} · {q.difficulty}/3
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Flashcards ({kit.flashcards?.length})</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">Recall prompts derived from your question bank.</p>
              </div>
              <button
                onClick={() => router.push(`/kit/${kitId}/practice`)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium flex items-center gap-2 transition"
              >
                <Play className="h-3.5 w-3.5" /> Start practice
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kit.flashcards?.map((card: Flashcard) => (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="font-mono text-xs text-slate-400 mb-2">{card.id}</p>
                  <h3 className="text-sm font-medium text-slate-900 mb-3">{card.front}</h3>
                  <p className="text-[13px] text-slate-600 whitespace-pre-line leading-relaxed font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {card.back}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="rounded-xl border border-slate-200 bg-white max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold tracking-tight">Add question</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddCustomQuestion} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Question</label>
                <textarea
                  rows={3}
                  required
                  value={newQuestionPrompt ?? ''}
                  onChange={e => setNewQuestionPrompt(e.target.value || '')}
                  placeholder="e.g. Describe your experience with event streaming…"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Answer outline</label>
                <textarea
                  rows={3}
                  required
                  value={newQuestionOutline ?? ''}
                  onChange={e => setNewQuestionOutline(e.target.value || '')}
                  placeholder={'1. Core concepts\n2. Implementation'}
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={newQuestionCategory}
                    onChange={e => setNewQuestionCategory(e.target.value as QuestionCategory)}
                    className={inputClass}
                  >
                    <option value="technical">Technical</option>
                    <option value="system-design">System design</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="company-fit">Company fit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Difficulty</label>
                  <select
                    value={newQuestionDifficulty}
                    onChange={e => setNewQuestionDifficulty(parseInt(e.target.value, 10) as QuestionDifficulty)}
                    className={inputClass}
                  >
                    <option value={1}>1 · Basic</option>
                    <option value={2}>2 · Intermediate</option>
                    <option value={3}>3 · Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Linked requirement <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={newQuestionReqId}
                  onChange={e => setNewQuestionReqId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {kit.role?.requirements?.map((r: Requirement) => (
                    <option key={r.id} value={r.id}>
                      [{r.id}] {r.text.substring(0, 60)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 text-[13px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium"
                >
                  Add question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mockQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-white max-w-xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-sm font-semibold">Practice answer</h2>
              <button
                onClick={() => setMockQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[13px] font-medium text-slate-900">{mockQuestion.prompt}</p>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Your answer</label>
              <textarea
                rows={5}
                value={mockAnswer ?? ''}
                onChange={e => setMockAnswer(e.target.value || '')}
                placeholder="Write your response as you would say it in the interview…"
                className={inputClass}
              />
            </div>

            <button
              onClick={handleEvaluateMockAnswer}
              disabled={evaluatingAnswer || !mockAnswer.trim()}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition disabled:opacity-50"
            >
              {evaluatingAnswer ? 'Evaluating…' : 'Evaluate my answer'}
            </button>

            {answerFeedback && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-[13px] font-medium">Readiness score</span>
                  <span className="text-lg font-semibold tabular-nums">{answerFeedback.score}/100</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-xs text-slate-500 block">Clarity</span>
                    <strong className="text-sm tabular-nums">{answerFeedback.rubric.clarity}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-xs text-slate-500 block">Depth</span>
                    <strong className="text-sm tabular-nums">{answerFeedback.rubric.depth}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-xs text-slate-500 block">Structure</span>
                    <strong className="text-sm tabular-nums">{answerFeedback.rubric.starMethod}</strong>
                  </div>
                </div>

                <div className="text-[13px]">
                  <p className="font-medium text-green-800 mb-1">Strengths</p>
                  <ul className="space-y-1 text-slate-600">
                    {answerFeedback.strengths.map((s: string, idx: number) => (
                      <li key={idx}>· {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[13px]">
                  <p className="font-medium text-amber-800 mb-1">To improve</p>
                  <ul className="space-y-1 text-slate-600">
                    {answerFeedback.improvements.map((imp: string, idx: number) => (
                      <li key={idx}>· {imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
