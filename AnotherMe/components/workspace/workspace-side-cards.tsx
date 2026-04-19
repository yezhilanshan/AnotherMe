'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StageListItem } from '@/lib/utils/stage-storage';
import type { StudyTaskRecord } from '@/lib/workspace/workspace-db';
import { shiftLocalDateKey, toLocalDateKey } from '@/lib/workspace/date-utils';

type ActivityPoint = {
  date: string;
  count: number;
};

type CardPalette = 'sky' | 'peach' | 'mint' | 'violet' | 'rose' | 'sun';

interface ProfileOverviewCardProps {
  avatar: string;
  nickname?: string;
  bio?: string;
  title?: string;
  palette?: CardPalette;
  className?: string;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  note?: string;
}

interface StatusChecklistCardProps {
  title: string;
  items: ChecklistItem[];
  accent?: 'amber' | 'pink' | 'mint' | 'violet';
  className?: string;
}

interface RecentStageListCardProps {
  title: string;
  stages: StageListItem[];
  emptyText: string;
  palette?: CardPalette;
  className?: string;
}

interface ActivityTrendCardProps {
  title: string;
  subtitle: string;
  points: ActivityPoint[];
  palette?: CardPalette;
  className?: string;
}

interface TagCloudCardProps {
  title: string;
  tags: Array<{ tag: string; count: number }>;
  emptyText: string;
  palette?: CardPalette;
  className?: string;
}

interface TaskProgressCardProps {
  total: number;
  completed: number;
  focusMinutes: number;
  className?: string;
}

interface WeekCalendarCardProps {
  title: string;
  tasks: StudyTaskRecord[];
  palette?: CardPalette;
  className?: string;
}

interface MiniMetricCardProps {
  title: string;
  value: string;
  note: string;
  icon?: ReactNode;
  palette?: CardPalette;
  className?: string;
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function accentClass(accent: NonNullable<StatusChecklistCardProps['accent']>) {
  if (accent === 'pink') return 'from-[#ffe2ea] to-[#ffd0dc] text-[#643844]';
  if (accent === 'mint') return 'from-[#dbf8ef] to-[#c6efdf] text-[#1d5447]';
  if (accent === 'violet') return 'from-[#ebe6ff] to-[#d8d1ff] text-[#38326d]';
  return 'from-[#fff0d9] to-[#ffe4b7] text-[#614525]';
}

function surfaceClass(palette: CardPalette) {
  if (palette === 'peach')
    return 'border-[#ffd8c9] bg-[linear-gradient(145deg,rgba(255,243,235,0.98),rgba(255,222,205,0.92))]';
  if (palette === 'mint')
    return 'border-[#cdebdc] bg-[linear-gradient(145deg,rgba(239,255,248,0.98),rgba(209,242,225,0.92))]';
  if (palette === 'violet')
    return 'border-[#ddd8ff] bg-[linear-gradient(145deg,rgba(246,243,255,0.98),rgba(225,219,255,0.94))]';
  if (palette === 'rose')
    return 'border-[#ffd7e5] bg-[linear-gradient(145deg,rgba(255,244,248,0.98),rgba(255,222,234,0.94))]';
  if (palette === 'sun')
    return 'border-[#ffe2a6] bg-[linear-gradient(145deg,rgba(255,249,232,0.98),rgba(255,231,180,0.94))]';
  return 'border-[#d7e6ff] bg-[linear-gradient(145deg,rgba(245,250,255,0.98),rgba(220,236,255,0.94))]';
}

function metricTone(index: number) {
  const tones = [
    'bg-[linear-gradient(145deg,#ffffff,#fff5dd)]',
    'bg-[linear-gradient(145deg,#ffffff,#ffeaf2)]',
    'bg-[linear-gradient(145deg,#ffffff,#e7f4ff)]',
    'bg-[linear-gradient(145deg,#ffffff,#e6fbf3)]',
  ];

  return tones[index % tones.length];
}

export function ProfileOverviewCard({
  avatar,
  nickname,
  bio,
  title = '学习档案',
  palette = 'sky',
  className,
}: ProfileOverviewCardProps) {
  return (
    <section className={cn('workspace-panel overflow-hidden', surfaceClass(palette), className)}>
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-[1.2rem] border border-white/70 bg-white shadow-[0_14px_28px_rgba(75,102,148,0.14)]">
          <Image src={avatar} alt="用户头像" fill sizes="56px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
          <p className="mt-2 text-lg font-semibold text-[#261f19]">
            {nickname?.trim() || '学习者'}
          </p>
          <p className="mt-1 text-sm text-[#6e7d97]">
            {bio?.trim() || '保持节奏，把今天最关键的一步推进下去。'}
          </p>
        </div>
      </div>
    </section>
  );
}

export function StatusChecklistCard({
  title,
  items,
  accent = 'amber',
  className,
}: StatusChecklistCardProps) {
  return (
    <section className={cn('workspace-panel bg-gradient-to-br', accentClass(accent), className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] opacity-70">{title}</p>
        <Sparkles className="h-4 w-4 opacity-70" />
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.15rem] border border-white/60 bg-white/70 px-3 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{item.label}</p>
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-current/45" />
              )}
            </div>
            {item.note ? <p className="mt-1 text-xs opacity-75">{item.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentStageListCard({
  title,
  stages,
  emptyText,
  palette = 'peach',
  className,
}: RecentStageListCardProps) {
  return (
    <section className={cn('workspace-panel', surfaceClass(palette), className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
        <BookOpenCheck className="h-4 w-4 text-[#7890ba]" />
      </div>

      <div className="mt-4 space-y-3">
        {stages.length ? (
          stages.slice(0, 3).map((stage) => (
            <Link
              key={stage.id}
              href={`/classroom/${stage.id}`}
              className={cn(
                'block rounded-[1.2rem] border border-white/70 px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#b7cff6]',
                metricTone(stages.indexOf(stage)),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#2f261f]">{stage.name}</p>
                  <p className="mt-1 text-xs text-[#76859e]">
                    {stage.sceneCount} 个场景 ·{' '}
                    {new Date(stage.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#84a0cf]" />
              </div>
            </Link>
          ))
        ) : (
          <div className="workspace-empty-box">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

export function ActivityTrendCard({
  title,
  subtitle,
  points,
  palette = 'violet',
  className,
}: ActivityTrendCardProps) {
  const safePoints = points.length ? points : [{ date: '0', count: 0 }];
  const max = Math.max(...safePoints.map((point) => point.count), 1);

  return (
    <section className={cn('workspace-panel', surfaceClass(palette), className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
          <p className="mt-2 text-sm text-[#6f7f99]">{subtitle}</p>
        </div>
        <Clock3 className="h-4 w-4 text-[#7890ba]" />
      </div>

      <div className="mt-5 flex h-24 items-end gap-2">
        {safePoints.map((point) => {
          const height = Math.max(12, Math.round((point.count / max) * 96));
          return (
            <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-full bg-[linear-gradient(180deg,#bdeede,#8ab2ff,#c8b9fb)]"
                style={{ height }}
                title={`${point.date}: ${point.count}`}
              />
              <span className="text-[10px] text-[#9aa7bc]">{point.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TagCloudCard({
  title,
  tags,
  emptyText,
  palette = 'sun',
  className,
}: TagCloudCardProps) {
  return (
    <section className={cn('workspace-panel', surfaceClass(palette), className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
        <Sparkles className="h-4 w-4 text-[#7890ba]" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length ? (
          tags.map((item, index) => (
            <span
              key={item.tag}
              className={cn('workspace-chip-muted border-white/70', metricTone(index))}
            >
              {item.tag} · {item.count}
            </span>
          ))
        ) : (
          <div className="workspace-empty-box w-full">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

export function TaskProgressCard({
  total,
  completed,
  focusMinutes,
  className,
}: TaskProgressCardProps) {
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className={cn(
        'workspace-panel border-[#d6d9ff] bg-[linear-gradient(145deg,rgba(244,244,255,0.98),rgba(222,226,255,0.94))]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">任务进度</p>
          <p className="mt-2 text-3xl font-semibold text-[#22365b]">{percent}%</p>
        </div>
        <div className="rounded-full bg-[#eef4ff] p-3 text-[#5377b5]">
          <Clock3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-[#eaf1ff]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#79b2ff,#416fe1)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[1.15rem] bg-[linear-gradient(145deg,#ffe4eb,#ffd2dd)] px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#a36271]">完成</p>
          <p className="mt-1 text-xl font-semibold text-[#5f3841]">
            {completed}/{total}
          </p>
        </div>
        <div className="rounded-[1.15rem] bg-[linear-gradient(145deg,#e8e2ff,#d7d0ff)] px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#7266af]">专注</p>
          <p className="mt-1 text-xl font-semibold text-[#3f3773]">{focusMinutes} 分钟</p>
        </div>
      </div>
    </section>
  );
}

export function WeekCalendarCard({
  title,
  tasks,
  palette = 'mint',
  className,
}: WeekCalendarCardProps) {
  const today = new Date();
  const cells = Array.from({ length: 7 }, (_, index) => {
    const dateKey = shiftLocalDateKey(today, index);
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const count = tasks.filter((task) => task.dueDate === dateKey).length;
    return {
      key: dateKey,
      label: WEEK_LABELS[(date.getDay() + 6) % 7],
      day: date.getDate(),
      isToday: dateKey === toLocalDateKey(today),
      count,
    };
  });

  return (
    <section className={cn('workspace-panel', surfaceClass(palette), className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
        <CalendarDays className="h-4 w-4 text-[#7890ba]" />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={cn(
              'rounded-[1.1rem] border px-2 py-3 text-center',
              cell.isToday
                ? 'border-[#7ea8f0] bg-[#edf4ff] text-[#2651a0]'
                : cn('border-white/80 text-[#41556f]', metricTone(cells.indexOf(cell))),
            )}
          >
            <p className="text-[10px] font-semibold tracking-[0.08em] text-[#92a1ba]">
              {cell.label}
            </p>
            <p className="mt-1 text-sm font-semibold">{cell.day}</p>
            <p className="mt-1 text-[10px]">{cell.count ? `${cell.count} 项` : '空'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MiniMetricCard({
  title,
  value,
  note,
  icon,
  palette = 'rose',
  className,
}: MiniMetricCardProps) {
  return (
    <section className={cn('workspace-panel', surfaceClass(palette), className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#7e8fb0]">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-[#26355a]">{value}</p>
          <p className="mt-2 text-sm text-[#617491]">{note}</p>
        </div>
        {icon ? (
          <div className="rounded-[1rem] border border-white/70 bg-white/70 p-2.5">{icon}</div>
        ) : null}
      </div>
    </section>
  );
}
