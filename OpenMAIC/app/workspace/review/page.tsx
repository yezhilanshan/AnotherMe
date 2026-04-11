'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock3, PlayCircle, Search } from 'lucide-react';
import { listStages, type StageListItem } from '@/lib/utils/stage-storage';

export default function ReviewPage() {
  const [keyword, setKeyword] = useState('');
  const [stages, setStages] = useState<StageListItem[]>([]);
  const [snapshotNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    listStages().then((items) => {
      if (!mounted) return;
      setStages(items);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return stages;
    return stages.filter((item) => {
      return [item.name, item.description || ''].join(' ').toLowerCase().includes(q);
    });
  }, [keyword, stages]);

  const totalScenes = useMemo(() => stages.reduce((sum, item) => sum + item.sceneCount, 0), [stages]);
  const recentWeekCount = useMemo(() => {
    return stages.filter((item) => snapshotNow - item.updatedAt < 7 * 24 * 60 * 60 * 1000).length;
  }, [snapshotNow, stages]);

  return (
    <div className="workspace-cn-font space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="workspace-hero-card"
      >
        <p className="workspace-eyebrow">课堂回看</p>
        <h1 className="workspace-title">把已经生成过的课堂重新拉回到眼前。</h1>
        <p className="workspace-subtitle">
          这里适合课前回顾、试讲前检查节奏，或者快速定位某个历史主题继续完善。
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">累计课堂</p>
          <p className="workspace-stat-value">{stages.length}</p>
        </div>
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">累计场景</p>
          <p className="workspace-stat-value">{totalScenes}</p>
        </div>
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">最近七天</p>
          <p className="workspace-stat-value">{recentWeekCount}</p>
        </div>
      </section>

      <section className="workspace-panel">
        <label className="workspace-input flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="按主题名称或描述搜索"
          />
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filtered.length ? (
            filtered.map((stage) => (
              <article key={stage.id} className="workspace-review-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#302821]">{stage.name}</h3>
                    {stage.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-[#7b6f63]">{stage.description}</p>
                    ) : null}
                  </div>
                  <span className="workspace-chip-muted">{stage.sceneCount} 个场景</span>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#7b6f63]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    最近更新于 {new Date(stage.updatedAt).toLocaleDateString('zh-CN')}
                  </span>

                  <Link
                    href={`/workspace/classroom/${stage.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7a5d3e]"
                  >
                    <PlayCircle className="h-4 w-4" />
                    打开课堂
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="workspace-empty-box lg:col-span-2">还没有匹配的课堂记录。</div>
          )}
        </div>
      </section>
    </div>
  );
}
