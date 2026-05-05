/**
 * Knowledge State Dashboard - Visualizes BKT mastery probabilities
 * with progress bars, teaching decisions, and weak knowledge points.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchKnowledgeStates,
  type KnowledgeStateEntry,
} from '@/lib/diagnostic-probe/knowledge-state-client';
import { describeTeachingAction } from '@/lib/types/knowledge-tracing';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

const MASTERY_THRESHOLDS = {
  weak: 0.35,
  medium: 0.65,
  strong: 0.85,
} as const;

function getMasteryColor(pMastery: number): string {
  if (pMastery < MASTERY_THRESHOLDS.weak) return 'bg-red-500';
  if (pMastery < MASTERY_THRESHOLDS.medium) return 'bg-amber-500';
  if (pMastery < MASTERY_THRESHOLDS.strong) return 'bg-blue-500';
  return 'bg-green-500';
}

function getMasteryLabel(pMastery: number): string {
  if (pMastery < MASTERY_THRESHOLDS.weak) return '薄弱';
  if (pMastery < MASTERY_THRESHOLDS.medium) return '待提高';
  if (pMastery < MASTERY_THRESHOLDS.strong) return '良好';
  return '已掌握';
}

function getMasteryTextColor(pMastery: number): string {
  if (pMastery < MASTERY_THRESHOLDS.weak) return 'text-red-600 dark:text-red-400';
  if (pMastery < MASTERY_THRESHOLDS.medium) return 'text-amber-600 dark:text-amber-400';
  if (pMastery < MASTERY_THRESHOLDS.strong) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
}

interface KnowledgeStateDashboardProps {
  userId: string;
}

export function KnowledgeStateDashboard({ userId }: KnowledgeStateDashboardProps) {
  const [states, setStates] = useState<KnowledgeStateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKnowledgeStates(userId, { limit: 50 });
      setStates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载知识状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadStates();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        加载知识状态...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (states.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        暂无知识状态数据。完成诊断练习后，系统将自动追踪你的掌握情况。
      </div>
    );
  }

  // Sort by mastery ascending (weakest first)
  const sorted = [...states].sort((a, b) => a.pMastery - b.pMastery);
  const weakCount = sorted.filter((s) => s.pMastery < MASTERY_THRESHOLDS.weak).length;
  const mediumCount = sorted.filter(
    (s) => s.pMastery >= MASTERY_THRESHOLDS.weak && s.pMastery < MASTERY_THRESHOLDS.medium,
  ).length;
  const strongCount = sorted.filter((s) => s.pMastery >= MASTERY_THRESHOLDS.strong).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-lg font-bold text-red-600">{weakCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">薄弱</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-lg font-bold text-amber-600">{mediumCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">待提高</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-lg font-bold text-green-600">{strongCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">已掌握</p>
        </div>
      </div>

      {/* Knowledge point list */}
      <div className="space-y-2">
        {sorted.map((state) => (
          <div
            key={state.knowledgePointId}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-card-foreground truncate max-w-[70%]">
                {state.knowledgePointId}
              </span>
              <span className={`text-xs font-semibold ${getMasteryTextColor(state.pMastery)}`}>
                {(state.pMastery * 100).toFixed(0)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${getMasteryColor(state.pMastery)}`}
                style={{ width: `${state.pMastery * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {getMasteryLabel(state.pMastery)} · {state.correctAttempts}/{state.attempts} 正确
              </span>
              {state.teachingAction && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                  {describeTeachingAction(state.teachingAction as never)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
