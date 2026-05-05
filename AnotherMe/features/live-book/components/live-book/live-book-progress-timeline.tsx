'use client';

import { useState } from 'react';
import { Check, Loader2, AlertCircle, BookOpen, Search, Wand2, Layers, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StageKey = 'queued' | 'ideation' | 'exploration' | 'synthesis' | 'compilation' | 'completed';

const stageOrder: StageKey[] = ['queued', 'ideation', 'exploration', 'synthesis', 'compilation', 'completed'];

const stageLabels: Record<StageKey, string> = {
  queued: '排队',
  ideation: '构思',
  exploration: '探索',
  synthesis: '合成',
  compilation: '编译',
  completed: '完成',
};

const stageDescriptions: Record<StageKey, string> = {
  queued: '等待开始处理',
  ideation: 'AI正在构思书籍结构',
  exploration: '探索相关知识和资料',
  synthesis: '整合内容生成书脊',
  compilation: '编译生成页面内容',
  completed: '活书生成完成',
};

const stageIcons: Record<StageKey, typeof Loader2> = {
  queued: BookOpen,
  ideation: Wand2,
  exploration: Search,
  synthesis: Layers,
  compilation: Loader2,
  completed: Check,
};

interface StageInfo {
  key: StageKey;
  label: string;
  description: string;
  icon: typeof Loader2;
}

const stages: StageInfo[] = stageOrder.map((key) => ({
  key,
  label: stageLabels[key],
  description: stageDescriptions[key],
  icon: stageIcons[key],
}));

function getStageState(
  stageKey: string,
  currentStage: string,
): 'pending' | 'running' | 'completed' | 'error' {
  if (currentStage === 'failed') return stageKey === 'compilation' ? 'error' : 'pending';
  const currentIdx = stageOrder.indexOf(currentStage as StageKey);
  const stageIdx = stageOrder.indexOf(stageKey as StageKey);
  if (currentIdx < 0 || stageIdx < 0) return 'pending';
  if (stageKey === currentStage) return 'running';
  if (stageIdx < currentIdx) return 'completed';
  return 'pending';
}

function stageProgressFraction(currentStage: string, progress: number): number {
  const currentIdx = stageOrder.indexOf(currentStage as StageKey);
  if (currentIdx < 0) return 0;
  let value = 0;
  for (let i = 0; i < stageOrder.length; i++) {
    if (i < currentIdx) value += 1;
    else if (i === currentIdx) value += progress / 100;
  }
  return Math.min(1, value / stageOrder.length);
}

export interface ProgressCounters {
  totalPages: number;
  readyPages: number;
  partialPages: number;
  failedPages: number;
  blockReady: number;
  blockFailed: number;
}

export function LiveBookProgressTimeline({
  currentStage,
  currentProgress,
  counters,
  connectionState,
  reconnectCount,
}: {
  currentStage: string;
  currentProgress: number;
  counters?: ProgressCounters;
  connectionState?: 'idle' | 'connected' | 'reconnecting' | 'closed';
  reconnectCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (currentStage === 'completed' || currentStage === 'failed') return null;
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="pointer-events-auto absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-500 shadow-lg backdrop-blur transition-all hover:scale-110 hover:text-gray-900"
        title="显示进度"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </button>
    );
  }

  const fraction = stageProgressFraction(currentStage, currentProgress);
  const label = stageLabels[currentStage as StageKey] || currentStage;
  const currentIdx = stageOrder.indexOf(currentStage as StageKey);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-30 flex w-80 flex-col gap-2">
      {/* Main progress card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-3.5 w-3.5 text-gray-700 animate-spin" />
            <span className="text-xs font-medium text-gray-900">{label}</span>
            <span className="tabular-nums text-xs font-semibold text-gray-700">
              {Math.round(fraction * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            {connectionState === 'reconnecting' && (
              <span className="text-[10px] text-amber-600">重连#{reconnectCount}</span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title={expanded ? '收起详情' : '展开详情'}
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="最小化"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        </div>

        {/* Stage timeline - always visible, compact */}
        <div className="flex items-center justify-between px-4 pb-3">
          {stages.map((stage, index) => {
            const state = getStageState(stage.key, currentStage);
            const isLast = index === stages.length - 1;

            return (
              <div key={stage.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300',
                      state === 'running' && 'bg-gray-900 text-white ring-2 ring-gray-900/20',
                      state === 'completed' && 'bg-emerald-500 text-white',
                      state === 'error' && 'bg-red-500 text-white',
                      state === 'pending' && 'bg-gray-100 text-gray-400',
                    )}
                    title={`${stage.label} · ${stageDescriptions[stage.key]}`}
                  >
                    {state === 'running' ? (
                      <stage.icon className="h-2.5 w-2.5 animate-spin" />
                    ) : state === 'completed' ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : state === 'error' ? (
                      <AlertCircle className="h-2.5 w-2.5" />
                    ) : (
                      <span className="text-[8px]">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-medium transition-colors',
                      state === 'running' && 'text-gray-900',
                      state === 'completed' && 'text-emerald-600',
                      state === 'error' && 'text-red-600',
                      state === 'pending' && 'text-gray-400',
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'mx-0.5 h-0.5 flex-1 rounded-full transition-colors duration-300',
                      index < currentIdx ? 'bg-emerald-300' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            {/* Current stage description */}
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-gray-900 animate-pulse" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {stageDescriptions[currentStage as StageKey] || '处理中...'}
                <span className="text-gray-400 ml-1">({currentProgress}%)</span>
              </p>
            </div>

            {/* Counters */}
            {counters && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">页面</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {counters.readyPages}/{counters.totalPages}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">块就绪</p>
                  <p className="text-xs font-semibold text-gray-900">{counters.blockReady}</p>
                </div>
                {counters.blockFailed > 0 ? (
                  <div className="rounded-lg bg-red-50 px-2 py-1.5 text-center">
                    <p className="text-[10px] text-red-400">块错误</p>
                    <p className="text-xs font-semibold text-red-600">{counters.blockFailed}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center">
                    <p className="text-[10px] text-emerald-400">状态</p>
                    <p className="text-xs font-semibold text-emerald-600">正常</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
