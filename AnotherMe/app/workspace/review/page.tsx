'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Brain, CalendarDays, Loader2, TrendingUp, Zap } from 'lucide-react';
import {
  MiniBarChart,
  WorkspaceHero,
  WorkspaceMetricCard,
  WorkspacePanel,
  WorkspaceProfilePanel,
  workspaceToneClass,
} from '@/components/workspace/workspace-dashboard';
import { useUserProfileStore } from '@/lib/store/user-profile';
import { cn } from '@/lib/utils';

interface ReviewItem {
  id: string;
  title: string;
  subject: string;
  lastReviewed: number;
  reviewCount: number;
  nextReview: number;
}

const REVIEW_STORAGE_KEY = 'workspace:review:items';

const LEGACY_MOCK_REVIEW_TITLES = new Set(['一次函数基础概念', '光合作用实验原理', '勾股定理应用']);

function isReviewItem(value: unknown): value is ReviewItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ReviewItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.subject === 'string' &&
    typeof item.lastReviewed === 'number' &&
    typeof item.reviewCount === 'number' &&
    typeof item.nextReview === 'number'
  );
}

function isLegacyMockReviewItems(items: ReviewItem[]): boolean {
  return items.length === 3 && items.every((item) => LEGACY_MOCK_REVIEW_TITLES.has(item.title));
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [referenceNow] = useState(() => Date.now());
  const avatar = useUserProfileStore((state) => state.avatar);
  const nickname = useUserProfileStore((state) => state.nickname);
  const bio = useUserProfileStore((state) => state.bio);

  useEffect(() => {
    const saved = localStorage.getItem(REVIEW_STORAGE_KEY);
    const nextItems = (() => {
      if (!saved) return [];

      try {
        const parsed = JSON.parse(saved);
        const normalized = Array.isArray(parsed) ? parsed.filter(isReviewItem) : [];
        if (isLegacyMockReviewItems(normalized)) {
          localStorage.removeItem(REVIEW_STORAGE_KEY);
          return [];
        }
        return normalized;
      } catch {
        localStorage.removeItem(REVIEW_STORAGE_KEY);
        return [];
      }
    })();

    const frame = window.requestAnimationFrame(() => {
      setItems(nextItems);
      setIsLoading(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(items));
    }
  }, [isLoading, items]);

  const stats = useMemo(() => {
    const total = items.length;
    const dueToday = items.filter((item) => item.nextReview <= referenceNow).length;
    const reviewedToday = items.filter(
      (item) =>
        new Date(item.lastReviewed).toDateString() === new Date(referenceNow).toDateString(),
    ).length;
    return { total, dueToday, reviewedToday };
  }, [items, referenceNow]);

  const cadenceValues = useMemo(() => {
    return items.map((item) => Math.max(item.reviewCount, 1));
  }, [items]);

  function markReviewed(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              lastReviewed: Date.now(),
              reviewCount: item.reviewCount + 1,
              nextReview: Date.now() + 86400000 * (item.reviewCount + 1),
            }
          : item,
      ),
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6d7a92]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <WorkspaceHero
          eyebrow="Review Loop"
          title="把课堂回放和复习提醒做成更有节奏的回顾面板。"
          description="参考第二、第三张图的 dashboard 结构，把复习数量、待复习项目和建议分成多个模块，减少现在这种一页一个大色块的压迫感。"
          badges={[
            `${stats.total} 个复习项目`,
            `${stats.dueToday} 个今日待复习`,
            `${stats.reviewedToday} 个今日已回顾`,
          ]}
          tone="sky"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceMetricCard
              label="今日应做"
              value={`${stats.dueToday}`}
              note="到期内容优先展示，便于快速回到待复习知识点。"
              tone="rose"
              icon={CalendarDays}
            />
            <WorkspaceMetricCard
              label="回顾次数"
              value={`${items.reduce((sum, item) => sum + item.reviewCount, 0)}`}
              note="多轮复习会提高右侧条形图的整体密度。"
              tone="mint"
              icon={TrendingUp}
            />
          </div>
        </WorkspaceHero>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <WorkspacePanel
            title="复习清单"
            subtitle="每条项目拆成信息卡：学科、最近复习、下次复习时间和快速标记动作都放在同一层级。"
            icon={Brain}
            tone="sun"
            className="min-h-[560px]"
          >
            <div className="grid max-h-[470px] gap-3 overflow-auto pr-1">
              {items.length ? (
                items.map((item, index) => {
                  const isDue = item.nextReview <= referenceNow;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                        workspaceToneClass(isDue ? 'rose' : index % 2 === 0 ? 'peach' : 'violet'),
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-[#51627d]">
                              {item.subject}
                            </span>
                            <span
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                isDue
                                  ? 'border-[#ffd8d6] bg-white/86 text-[#c34f45]'
                                  : 'border-white/80 bg-white/86 text-[#64758e]',
                              )}
                            >
                              {isDue ? '今日待复习' : '已排入后续'}
                            </span>
                          </div>
                          <p className="mt-3 text-base font-semibold text-[#212734]">
                            {item.title}
                          </p>
                          <div className="mt-3 grid gap-2 text-sm text-[#5f6d84] sm:grid-cols-2">
                            <p>
                              最近复习：
                              {new Date(item.lastReviewed).toLocaleDateString('zh-CN')}
                            </p>
                            <p>
                              下次复习：
                              {new Date(item.nextReview).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => markReviewed(item.id)}
                          className="rounded-full bg-[#20232b] px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_28px_rgba(31,35,43,0.18)] transition hover:-translate-y-0.5"
                        >
                          标记复习
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="workspace-empty-box flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <BookOpen className="h-10 w-10 text-[#97a6bb]" />
                  <div>
                    <p className="font-semibold text-[#53627b]">还没有复习项目</p>
                    <p className="mt-1 text-sm text-[#74839a]">生成课堂后，会逐渐形成回顾清单。</p>
                  </div>
                </div>
              )}
            </div>
          </WorkspacePanel>
        </motion.div>

        <div className="grid gap-4">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <WorkspaceProfilePanel avatar={avatar} nickname={nickname} bio={bio} tone="peach" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <WorkspacePanel
              title="复习频率"
              subtitle="复习次数越多，条形图越高。它比纯数字更容易让人感知节奏。"
              icon={TrendingUp}
              tone="mint"
            >
              <MiniBarChart
                values={cadenceValues.length ? cadenceValues : [1]}
                labels={items.length ? items.map((_, index) => `#${index + 1}`) : ['空']}
              />
            </WorkspacePanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WorkspacePanel
              title="复习建议"
              subtitle="这里不再只是三块并列文本，而是更精致的建议组件组。"
              icon={Zap}
              tone="violet"
            >
              <div className="space-y-3">
                {[
                  {
                    title: '先做今日到期',
                    note: '优先处理已经到期的内容，避免遗忘曲线陡降。',
                    tone: 'rose',
                  },
                  {
                    title: '把课堂回放和笔记联动',
                    note: '回放中遇到卡点时，直接回到错题本补充关键词。',
                    tone: 'sun',
                  },
                  {
                    title: '缩短单次复习跨度',
                    note: '宁可多次轻量回顾，也不要一次拖得过长。',
                    tone: 'teal',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className={cn(
                      'rounded-[1.35rem] border p-4 shadow-[0_12px_26px_rgba(89,90,110,0.05)]',
                      workspaceToneClass(card.tone as 'rose' | 'sun' | 'teal'),
                    )}
                  >
                    <p className="text-sm font-semibold text-[#212734]">{card.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#5f6d84]">{card.note}</p>
                  </div>
                ))}
              </div>
            </WorkspacePanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
