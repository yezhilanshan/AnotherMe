'use client';

import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type WorkspaceTone = 'sky' | 'peach' | 'mint' | 'violet' | 'rose' | 'sun' | 'teal' | 'coral';

const TONE_STYLES: Record<WorkspaceTone, string> = {
  sky: 'border-[#d7e4f4] bg-[linear-gradient(145deg,rgba(251,253,255,0.99),rgba(226,237,252,0.93))]',
  peach:
    'border-[#f3d8c9] bg-[linear-gradient(145deg,rgba(255,248,242,0.99),rgba(252,225,205,0.94))]',
  mint: 'border-[#cde7d7] bg-[linear-gradient(145deg,rgba(248,255,251,0.99),rgba(215,242,227,0.94))]',
  violet:
    'border-[#dcd5f5] bg-[linear-gradient(145deg,rgba(250,247,255,0.99),rgba(231,223,255,0.94))]',
  rose: 'border-[#f4d3de] bg-[linear-gradient(145deg,rgba(255,247,250,0.99),rgba(252,226,236,0.94))]',
  sun: 'border-[#f0ddab] bg-[linear-gradient(145deg,rgba(255,252,241,0.99),rgba(251,235,193,0.94))]',
  teal: 'border-[#c9e5e2] bg-[linear-gradient(145deg,rgba(245,255,254,0.99),rgba(210,239,235,0.94))]',
  coral:
    'border-[#f1d6bf] bg-[linear-gradient(145deg,rgba(255,249,242,0.99),rgba(251,227,203,0.94))]',
};

export function workspaceToneClass(tone: WorkspaceTone) {
  return TONE_STYLES[tone];
}

interface WorkspaceHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  tone?: WorkspaceTone;
  className?: string;
  children?: ReactNode;
}

export function WorkspaceHero({
  eyebrow: _eyebrow,
  title: _title,
  description: _description,
  badges: _badges = [],
  tone: _tone = 'sky',
  className: _className,
  children: _children,
}: WorkspaceHeroProps) {
  return null;
}

interface WorkspacePanelProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: WorkspaceTone;
  className?: string;
  headerSlot?: ReactNode;
  children: ReactNode;
}

export function WorkspacePanel({
  title,
  subtitle,
  icon: Icon,
  tone = 'sky',
  className,
  headerSlot,
  children,
}: WorkspacePanelProps) {
  return (
    <section
      className={cn(
        'workspace-panel overflow-hidden rounded-[2rem] border p-5 md:p-6',
        workspaceToneClass(tone),
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8796ad]">
            {title}
          </p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-[#5e6c85]">{subtitle}</p> : null}
        </div>
        {headerSlot ? (
          <div className="shrink-0">{headerSlot}</div>
        ) : Icon ? (
          <div className="rounded-[1.1rem] border border-white/80 bg-white/86 p-2.5 text-[#657691] shadow-[0_12px_24px_rgba(91,93,110,0.08)]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}

interface WorkspaceMetricCardProps {
  label: string;
  value: string;
  note: string;
  tone?: WorkspaceTone;
  icon?: LucideIcon;
  className?: string;
}

export function WorkspaceMetricCard({
  label,
  value,
  note,
  tone = 'peach',
  icon: Icon,
  className,
}: WorkspaceMetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[1.65rem] border p-4 shadow-[0_18px_34px_rgba(70,86,115,0.1)]',
        workspaceToneClass(tone),
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8191a9]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#222936]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#5d6b84]">{note}</p>
        </div>
        {Icon ? (
          <div className="rounded-[1rem] border border-white/80 bg-white/92 p-2.5 text-[#697894] shadow-[0_10px_22px_rgba(88,94,110,0.08)]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface WorkspaceProfilePanelProps {
  avatar?: string;
  nickname?: string;
  bio?: string;
  title?: string;
  tone?: WorkspaceTone;
  className?: string;
  footer?: ReactNode;
}

export function WorkspaceProfilePanel({
  avatar,
  nickname,
  bio,
  title = '学习档案',
  tone = 'peach',
  className,
  footer,
}: WorkspaceProfilePanelProps) {
  return (
    <WorkspacePanel
      title={title}
      subtitle={bio?.trim() || '保持节奏，把今天最关键的一步推进下去。'}
      tone={tone}
      className={className}
      headerSlot={
        <div className="relative h-14 w-14 overflow-hidden rounded-[1.2rem] border border-white/80 bg-white/92 shadow-[0_14px_30px_rgba(65,82,109,0.14)]">
          {avatar ? (
            <img src={avatar} alt="头像" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#7c6a57]">
              {nickname?.trim()?.slice(0, 1) || 'A'}
            </div>
          )}
        </div>
      }
    >
      <div className="rounded-[1.4rem] border border-white/80 bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        <p className="text-lg font-semibold text-[#20242c]">{nickname?.trim() || '学习者'}</p>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#7d8ca4]">
          <Sparkles className="h-3.5 w-3.5" />
          学习仪表盘已同步更新
        </div>
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </WorkspacePanel>
  );
}

interface MiniBarChartProps {
  values: number[];
  labels?: string[];
  className?: string;
  barClassName?: string;
}

export function MiniBarChart({ values, labels, className, barClassName }: MiniBarChartProps) {
  const max = Math.max(...values, 1);

  function barHeightClass(value: number) {
    const ratio = value / max;
    if (ratio >= 0.92) return 'h-[132px]';
    if (ratio >= 0.78) return 'h-[116px]';
    if (ratio >= 0.64) return 'h-[100px]';
    if (ratio >= 0.5) return 'h-[84px]';
    if (ratio >= 0.36) return 'h-[68px]';
    if (ratio >= 0.22) return 'h-[52px]';
    return 'h-[36px]';
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-36 items-end gap-2">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn(
                'w-full rounded-[999px] bg-[linear-gradient(180deg,#f2c890,#9ed8cf_58%,#b8bbff)] shadow-[0_14px_24px_rgba(121,140,176,0.14)]',
                barHeightClass(value),
                barClassName,
              )}
            />
            {labels?.[index] ? (
              <span className="text-[11px] font-medium text-[#8a98ae]">{labels[index]}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MiniLineChartProps {
  values: number[];
  labels?: string[];
  className?: string;
}

export function MiniLineChart({ values, labels, className }: MiniLineChartProps) {
  const max = Math.max(...values, 1);
  const width = 360;
  const height = 140;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = step * index;
    const y = height - (value / max) * (height - 18) - 9;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className={cn('space-y-3', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible">
        <defs>
          <linearGradient id="workspace-line-fill" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#8fc1ff" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#8fc1ff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#workspace-line-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#465ed3"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#fff"
            stroke="#465ed3"
            strokeWidth="3"
          />
        ))}
      </svg>
      {labels?.length ? (
        <div className="grid grid-cols-6 gap-2 text-[11px] font-medium text-[#8a98ae]">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ProgressDonutProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function ProgressDonut({
  value,
  size = 132,
  strokeWidth = 12,
  className,
  label,
}: ProgressDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="workspace-donut" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd09b" />
            <stop offset="55%" stopColor="#78c7c7" />
            <stop offset="100%" stopColor="#7d84ff" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(188,201,225,0.45)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#workspace-donut)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-semibold tracking-[-0.04em] text-[#212734]">{value}%</p>
        {label ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#91a0b6]">
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
