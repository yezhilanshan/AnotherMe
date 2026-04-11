'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { nanoid } from 'nanoid';
import { CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';
import {
  addStudyTask,
  deleteStudyTask,
  ensureDefaultTasks,
  listStudyTasks,
  toggleStudyTask,
} from '@/lib/workspace/study-plan';
import type { StudyTaskRecord } from '@/lib/workspace/workspace-db';
import { toLocalDateKey } from '@/lib/workspace/date-utils';

const CATEGORY_OPTIONS = [
  { value: 'review', label: '复盘' },
  { value: 'practice', label: '练习' },
  { value: 'preview', label: '预习' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
] as const;

export default function StudyPlanPage() {
  const [tasks, setTasks] = useState<StudyTaskRecord[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StudyTaskRecord['category']>('review');
  const [priority, setPriority] = useState<StudyTaskRecord['priority']>('medium');
  const [dueDate, setDueDate] = useState(() => toLocalDateKey(new Date()));

  async function refreshTasks() {
    const items = await listStudyTasks();
    setTasks(items);
  }

  useEffect(() => {
    ensureDefaultTasks().then(refreshTasks);
  }, []);

  const today = toLocalDateKey(new Date());
  const todayTasks = tasks.filter((task) => task.dueDate === today);
  const completedToday = todayTasks.filter((task) => task.completed).length;

  const completionRate = useMemo(() => {
    if (!todayTasks.length) return 0;
    return Math.round((completedToday / todayTasks.length) * 100);
  }, [completedToday, todayTasks.length]);

  const categoryLabelMap = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [item.value, item.label]));
  const priorityLabelMap = Object.fromEntries(PRIORITY_OPTIONS.map((item) => [item.value, item.label]));

  async function handleCreateTask() {
    if (!title.trim()) return;

    await addStudyTask({
      id: nanoid(),
      title: title.trim(),
      category,
      priority,
      dueDate,
      completed: false,
      description: '',
    });

    setTitle('');
    await refreshTasks();
  }

  return (
    <div className="workspace-cn-font space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="workspace-hero-card"
      >
        <p className="workspace-eyebrow">学习计划</p>
        <h1 className="workspace-title">把学习节奏拆成一件件今天就能完成的小任务。</h1>
        <p className="workspace-subtitle">
          与其列一张很长的愿望清单，不如把今天、这周和当前重点拆开安排，稳定推进。
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">今日任务</p>
          <p className="workspace-stat-value">{todayTasks.length}</p>
        </div>
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">已完成</p>
          <p className="workspace-stat-value">{completedToday}</p>
        </div>
        <div className="workspace-stat-card">
          <p className="workspace-stat-label">完成率</p>
          <p className="workspace-stat-value">{completionRate}%</p>
        </div>
      </section>

      <section className="workspace-panel space-y-4">
        <h2 className="text-base font-semibold text-[#2b241e]">添加任务</h2>

        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          <input
            className="workspace-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：复盘一次函数课堂中的互动环节"
          />

          <select
            className="workspace-input"
            value={category}
            onChange={(event) => setCategory(event.target.value as StudyTaskRecord['category'])}
            aria-label="任务类型"
            title="任务类型"
          >
            {CATEGORY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className="workspace-input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as StudyTaskRecord['priority'])}
            aria-label="任务优先级"
            title="任务优先级"
          >
            {PRIORITY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            className="workspace-input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="截止日期"
            title="截止日期"
          />

          <button type="button" className="workspace-primary-btn" onClick={handleCreateTask}>
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
      </section>

      <section className="workspace-panel space-y-3">
        <h2 className="text-base font-semibold text-[#2b241e]">任务看板</h2>

        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className="workspace-setting-row">
              <label className="inline-flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={async (event) => {
                    await toggleStudyTask(task.id, event.target.checked);
                    await refreshTasks();
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-semibold ${task.completed ? 'text-[#998d80] line-through' : 'text-[#40362d]'}`}
                  >
                    {task.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#7d7063]">
                    {categoryLabelMap[task.category]} · {priorityLabelMap[task.priority]} · 截止 {task.dueDate}
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2">
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Target className="h-4 w-4 text-amber-600" />
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await deleteStudyTask(task.id);
                    await refreshTasks();
                  }}
                  className="workspace-icon-btn"
                  aria-label="删除任务"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="workspace-empty-box">还没有任务，先给今天补一条最重要的安排。</div>
        )}
      </section>
    </div>
  );
}
