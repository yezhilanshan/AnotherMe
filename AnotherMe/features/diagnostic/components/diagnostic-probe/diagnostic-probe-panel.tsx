/**
 * DiagnosticProbePanel - Interactive diagnostic probe panel for embedding.
 *
 * Supports answer submission (choice, fill_blank, step_by_step),
 * integrates with the diagnostic store for persistence, and reports
 * answers to the backend for BKT updates.
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { DiagnosticProbe } from '@/lib/types/diagnostic-probe';
import { useDiagnosticProbe } from '@/lib/hooks/use-diagnostic-probe';
import { useDiagnosticStore } from '@/lib/store/diagnostic';
import { recordDiagnosticEvent } from '@/lib/diagnostic-probe/record-diagnostic-event';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface DiagnosticProbePanelProps {
  userId: string;
  knowledgePointId?: string;
  /** Called after an answer is submitted (for external consumers like the AI tutor) */
  onAnswered?: (result: { correct: boolean; probe: DiagnosticProbe }) => void;
}

export function DiagnosticProbePanel({
  userId,
  knowledgePointId,
  onAnswered,
}: DiagnosticProbePanelProps) {
  const { probe, loading, error, generateProbe, clearProbe } = useDiagnosticProbe({ userId });
  const { currentSession, startSession, addEntry } = useDiagnosticStore();

  const handleGenerate = useCallback(() => {
    generateProbe({ knowledgePointId });
  }, [generateProbe, knowledgePointId]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">诊断练习</h3>
        {probe && (
          <button
            onClick={clearProbe}
            className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
          >
            清除
          </button>
        )}
      </div>

      {!probe && !loading && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            基于知识追踪状态生成一道针对性诊断题，检测薄弱知识点的掌握情况。
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            type="button"
          >
            {loading ? '生成中...' : '生成诊断题'}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          正在生成诊断题...
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {probe && (
        <ProbeAnswerCard
          probe={probe}
          userId={userId}
          onAnswered={(result) => {
            if (!currentSession) startSession();
            addEntry(result);

            // Fire structured LearningEvent for BKT pipeline and analytics
            recordDiagnosticEvent({
              userId,
              probe: result.probe,
              correct: result.correct,
            });

            onAnswered?.(result);
          }}
          onRegenerate={handleGenerate}
        />
      )}
    </div>
  );
}

function ProbeAnswerCard({
  probe,
  userId,
  onAnswered,
  onRegenerate,
}: {
  probe: DiagnosticProbe;
  userId: string;
  onAnswered: (result: { correct: boolean; probe: DiagnosticProbe }) => void;
  onRegenerate: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [stepChecks, setStepChecks] = useState<boolean[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize step checks when probe changes
  React.useEffect(() => {
    if (probe.probeType === 'step_by_step' && probe.options) {
      setStepChecks(new Array(probe.options.length).fill(false));
    }
  }, [probe]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    let correct = false;
    if (probe.probeType === 'choice' && selectedOption !== null && probe.options) {
      correct = probe.options[selectedOption] === probe.correctAnswer;
    } else if (probe.probeType === 'fill_blank') {
      correct = fillAnswer.trim().toLowerCase() === probe.correctAnswer.trim().toLowerCase();
    } else if (probe.probeType === 'step_by_step' && probe.options) {
      const checkedCount = stepChecks.filter(Boolean).length;
      correct = checkedCount === probe.options.length;
    } else {
      correct = true;
    }

    setIsCorrect(correct);
    setSubmitted(true);

    try {
      const res = await fetch(`/api/students/${encodeURIComponent(userId)}/quiz-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: probe.probeId,
          is_correct: correct,
          knowledge_point_id: probe.knowledgePointId,
        }),
      });
      if (!res.ok) {
        setSubmitError('知识追踪更新失败，答题记录已本地保存');
      }
    } catch {
      setSubmitError('知识追踪更新失败，答题记录已本地保存');
    }

    onAnswered({ correct, probe });
    setSubmitting(false);
  }, [submitting, probe, selectedOption, fillAnswer, stepChecks, userId, onAnswered]);

  if (submitted) {
    const stepTotal = probe.probeType === 'step_by_step' && probe.options ? probe.options.length : 0;
    const stepDone = stepTotal > 0 ? stepChecks.filter(Boolean).length : 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {probe.probeType === 'choice'
              ? '选择题'
              : probe.probeType === 'step_by_step'
                ? '分步题'
                : '填空题'}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-card-foreground">{probe.question}</p>
        <div
          className={`rounded-md p-2 text-xs font-medium ${
            isCorrect
              ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {isCorrect
            ? '回答正确！'
            : stepTotal > 0
              ? `完成了 ${stepDone}/${stepTotal} 个步骤，请查看解析。`
              : '回答错误，请查看解析。'}
        </div>
        {stepTotal > 0 && probe.options && (
          <div className="space-y-1">
            {probe.options.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-xs ${
                  stepChecks[idx]
                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                    : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                }`}
              >
                <span className="font-medium">{stepChecks[idx] ? '✓' : '✗'}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-md bg-muted/50 p-2 text-xs">
          <p className="font-medium text-foreground">解析:</p>
          <p className="mt-1 text-muted-foreground">{probe.explanation}</p>
        </div>
        {submitError && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {submitError}
          </div>
        )}
        <button
          onClick={onRegenerate}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          type="button"
        >
          下一题
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {probe.probeType === 'choice'
            ? '选择题'
            : probe.probeType === 'step_by_step'
              ? '分步题'
              : '填空题'}
        </span>
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          难度: {probe.difficulty}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-card-foreground">{probe.question}</p>

      {probe.probeType === 'choice' && probe.options && (
        <div className="space-y-1.5">
          {probe.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(idx)}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedOption === idx
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background hover:bg-accent/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {probe.probeType === 'fill_blank' && (
        <input
          type="text"
          value={fillAnswer}
          onChange={(e) => setFillAnswer(e.target.value)}
          placeholder="请输入你的答案..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}

      {probe.probeType === 'step_by_step' && probe.options && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-2">
            请逐步完成以下步骤，完成后勾选：
          </p>
          {probe.options.map((step, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${
                stepChecks[idx]
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-background hover:bg-accent/50'
              }`}
            >
              <input
                type="checkbox"
                checked={stepChecks[idx] || false}
                onChange={(e) => {
                  const newChecks = [...stepChecks];
                  newChecks[idx] = e.target.checked;
                  setStepChecks(newChecks);
                }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>{step}</span>
            </label>
          ))}
        </div>
      )}

      {probe.probeType === 'step_by_step' && !probe.options && (
        <p className="text-xs text-muted-foreground">
          分步题请自行在纸上推导，提交后查看参考答案与解析。
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={
            submitting ||
            (probe.probeType === 'choice' && selectedOption === null) ||
            (probe.probeType === 'step_by_step' &&
              !!probe.options &&
              stepChecks.every((c) => !c))
          }
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          type="button"
        >
          {submitting ? '提交中...' : '提交答案'}
        </button>
        <button
          onClick={() => setShowHint((v) => !v)}
          className="text-xs text-primary hover:underline"
          type="button"
        >
          {showHint ? '隐藏提示' : '查看提示'}
        </button>
        <button
          onClick={() => setShowAnswer((v) => !v)}
          className="text-xs text-primary hover:underline"
          type="button"
        >
          {showAnswer ? '隐藏答案' : '查看答案'}
        </button>
      </div>

      {showHint && probe.hints.length > 0 && (
        <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <p className="font-medium">提示:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {probe.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {showAnswer && (
        <div className="rounded-md bg-green-50 p-2 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="font-medium">参考答案:</p>
          <p className="mt-1">{probe.correctAnswer}</p>
          <p className="mt-2 text-muted-foreground">{probe.explanation}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        策略: {probe.teachingAction} · {probe.reason}
      </p>
    </div>
  );
}
