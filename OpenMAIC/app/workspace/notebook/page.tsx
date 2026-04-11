'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PlayCircle, Search, Trash2 } from 'lucide-react';
import {
  deleteNotebookRecord,
  loadNotebookRecords,
  type NotebookRecord,
} from '@/lib/workspace/problem-notebook';
import { shiftLocalDateKey, toLocalDateKey } from '@/lib/workspace/date-utils';

export default function NotebookPage() {
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<NotebookRecord[]>([]);

  async function refreshNotebook() {
    const nextRecords = await loadNotebookRecords();
    setRecords(nextRecords);
  }

  useEffect(() => {
    let mounted = true;

    loadNotebookRecords().then((nextRecords) => {
      if (!mounted) return;
      setRecords(nextRecords);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return records;

    return records.filter((item) => {
      const haystack = [item.question, item.explanation, ...(item.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [query, records]);

  const tagStats = useMemo(() => {
    const counter = new Map<string, number>();
    for (const record of records) {
      for (const tag of record.tags || []) {
        const key = tag.trim();
        if (!key) continue;
        counter.set(key, (counter.get(key) || 0) + 1);
      }
    }

    return Array.from(counter.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  const learningCurve = useMemo(() => {
    const days = 14;
    const dayMap = new Map<string, number>();
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      dayMap.set(shiftLocalDateKey(today, -i), 0);
    }

    for (const record of records) {
      const key = toLocalDateKey(record.createdAt);
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      }
    }

    return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
  }, [records]);

  const maxCurveCount = Math.max(...learningCurve.map((point) => point.count), 1);
  const statusLabelMap: Record<string, string> = {
    generated: '已生成',
    processing: '处理中',
  };

  const getCurveHeightClass = (count: number) => {
    const ratio = count / maxCurveCount;
    if (ratio >= 0.9) return 'h-full';
    if (ratio >= 0.8) return 'h-[88%]';
    if (ratio >= 0.7) return 'h-[76%]';
    if (ratio >= 0.6) return 'h-[64%]';
    if (ratio >= 0.5) return 'h-[52%]';
    if (ratio >= 0.4) return 'h-[40%]';
    if (ratio >= 0.3) return 'h-[30%]';
    if (ratio >= 0.2) return 'h-[22%]';
    if (ratio >= 0.1) return 'h-[14%]';
    return 'h-[6%]';
  };

  return (
    <div className="workspace-cn-font space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="workspace-hero-card"
      >
        <p className="workspace-eyebrow">错题本</p>
        <h1 className="workspace-title">把拍过的题、生成过的讲解和复盘线索都沉淀下来。</h1>
        <p className="workspace-subtitle">
          这里不是简单的文件夹，而是你自己的题目资料库，可以按关键词、标签和时间重新回看。
        </p>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="workspace-panel">
          <h2 className="text-base font-semibold text-[#2b241e]">近 14 天记录曲线</h2>
          <p className="mt-1 text-xs text-[#7a6d61]">每天新增的题目记录数量</p>

          <div className="mt-4 flex h-40 items-end gap-1.5 rounded-[1.2rem] border border-[#e7ddcf] bg-[#f8f2ea] px-3 py-2">
            {learningCurve.map((point) => (
              <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className={`w-full rounded-t-md bg-gradient-to-t from-[#8e6236] to-[#d4b18a] ${getCurveHeightClass(point.count)}`}
                  title={`${point.date}: ${point.count}`}
                />
                <span className="text-[10px] text-[#7a6d61]">{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="workspace-panel">
          <h2 className="text-base font-semibold text-[#2b241e]">标签热度</h2>
          <p className="mt-1 text-xs text-[#7a6d61]">最常出现的题型与知识点</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tagStats.length ? (
              tagStats.map((item) => (
                <span key={item.tag} className="workspace-chip">
                  {item.tag} · {item.count}
                </span>
              ))
            ) : (
              <div className="workspace-empty-box w-full">还没有标签，生成并保存记录后会逐渐形成你的知识地图。</div>
            )}
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <label className="workspace-input flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="按题目、讲解内容或标签搜索"
          />
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filtered.length ? (
            filtered.map((record) => (
              <article key={record.id} className="workspace-note-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-[0.14em] text-[#9a8d7f]">
                      {statusLabelMap[record.status] ?? record.status}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-[#3c332b]">{record.question}</h3>
                  </div>
                  <button
                    type="button"
                    className="workspace-icon-btn"
                    onClick={async () => {
                      await deleteNotebookRecord(record.id);
                      await refreshNotebook();
                    }}
                    aria-label="删除记录"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {record.imageDataUrl ? (
                  <img src={record.imageDataUrl} alt="题目" className="mt-3 h-32 w-full rounded-xl object-cover" />
                ) : null}

                <p className="mt-3 text-sm leading-7 text-[#6d6156]">{record.explanation}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(record.tags || []).map((tag) => (
                    <span key={`${record.id}-${tag}`} className="workspace-chip-muted">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#7a6d61]">
                  <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                  {record.videoUrl ? (
                    <a
                      href={record.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-[#7a5d3e]"
                    >
                      <PlayCircle className="h-4 w-4" />
                      查看视频
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="workspace-empty-box lg:col-span-2">还没有找到记录，可以先去题目视频页面生成一条。</div>
          )}
        </div>
      </section>
    </div>
  );
}
