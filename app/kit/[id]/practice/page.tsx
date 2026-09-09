'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Flashcard, PracticeSessionStats } from '@/lib/types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const CONFIDENCE_LEVELS = [
  { level: 1, label: 'Struggled' },
  { level: 2, label: 'Hard' },
  { level: 3, label: 'Okay' },
  { level: 4, label: 'Confident' },
  { level: 5, label: 'Mastered' },
];

export default function PracticeModePage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;

  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState<PracticeSessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.practice.getDeck(kitId);
      setDeck(res.deck || []);
      setStats(res.stats || null);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionCompleted(false);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    let isMounted = true;
    api.practice.getDeck(kitId)
      .then(res => {
        if (isMounted) {
          setDeck(res.deck || []);
          setStats(res.stats || null);
          setCurrentIndex(0);
          setIsFlipped(false);
          setSessionCompleted(false);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [kitId]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleRecordConfidence = useCallback(async (confidence: number) => {
    if (deck.length === 0) return;
    const currentCard = deck[currentIndex];

    try {
      const res = await api.practice.recordConfidence(kitId, currentCard.id, confidence);
      setStats(res.stats);

      if (currentIndex + 1 < deck.length) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      } else {
        setSessionCompleted(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to record rating: ${msg}`);
    }
  }, [deck, currentIndex, kitId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        if (isFlipped) {
          const rating = parseInt(e.code.replace('Digit', ''), 10);
          handleRecordConfidence(rating);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, isFlipped, handleRecordConfidence, sessionCompleted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (deck.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600 mb-5">No flashcards in this kit yet.</p>
          <button
            onClick={() => router.push(`/kit/${kitId}`)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium"
          >
            Back to kit
          </button>
        </div>
      </div>
    );
  }

  const currentCard = deck[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push(`/kit/${kitId}`)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[13px] font-medium flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to kit
          </button>

          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-slate-500 tabular-nums">
              Card <span className="font-semibold text-slate-900">{currentIndex + 1}</span> of {deck.length}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium tabular-nums">
              {stats?.masteryPercentage ?? 0}% mastered
            </span>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-slate-900 transition-all duration-300"
            style={{ width: `${Math.round(((currentIndex + (sessionCompleted ? 1 : 0)) / deck.length) * 100)}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-6 py-10 my-auto">
        {!sessionCompleted ? (
          <div className="space-y-5">
            <div
              onClick={handleFlip}
              className="cursor-pointer min-h-[320px] rounded-xl border border-slate-200 bg-white p-8 flex flex-col shadow-sm hover:border-slate-300 transition-colors select-none"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
                <span className="font-mono">{currentCard.id}</span>
                <span>Select card or press Space to reveal</span>
              </div>

              <div className="my-auto">
                {!isFlipped ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Question</p>
                    <h2 className="text-xl font-semibold tracking-tight leading-snug">
                      {currentCard.front}
                    </h2>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Answer</p>
                    <p className="text-[15px] text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                      {currentCard.back}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-400 mt-6">
                {currentCard.requirement_ids?.join(', ') || 'General'}
              </p>
            </div>

            <div className="text-center space-y-3">
              <p className="text-[13px] text-slate-500">
                {isFlipped
                  ? 'How well did you know this? (keys 1–5)'
                  : 'Reveal the answer first, then rate yourself'}
              </p>

              <div className="grid grid-cols-5 gap-2">
                {CONFIDENCE_LEVELS.map(({ level, label }) => (
                  <button
                    key={level}
                    disabled={!isFlipped}
                    onClick={() => handleRecordConfidence(level)}
                    className="px-2 py-3 rounded-lg border border-slate-300 bg-white font-medium text-[13px] flex flex-col items-center gap-0.5 transition enabled:hover:border-slate-900 enabled:hover:bg-slate-900 enabled:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="font-semibold tabular-nums">{level}</span>
                    <span className="text-xs opacity-70">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-6 shadow-sm">
            <div className="mx-auto h-11 w-11 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight">Session complete</h2>
              <p className="text-sm text-slate-500 mt-1">
                Your ratings have been saved. Weak areas will come up first next time.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Reviewed</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{deck.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Average rating</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{stats?.averageConfidence || 0}/5</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Mastery</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{stats?.masteryPercentage || 0}%</p>
              </div>
            </div>

            {stats && stats.weakestRequirementIds && stats.weakestRequirementIds.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-left text-[13px] text-amber-900">
                <p className="flex items-center gap-1.5 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> Focus next on
                </p>
                <p className="text-amber-800">
                  Requirement{stats.weakestRequirementIds.length > 1 ? 's' : ''} <span className="font-mono">{stats.weakestRequirementIds.join(', ')}</span> — your lowest-rated cards.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <button
                onClick={loadDeck}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="h-4 w-4" /> Practice weak areas
              </button>
              <button
                onClick={() => router.push(`/kit/${kitId}`)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[13px] font-medium transition"
              >
                Back to kit
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
