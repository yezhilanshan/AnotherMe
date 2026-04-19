'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock3,
  ListChecks,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  MiniLineChart,
  ProgressDonut,
  WorkspaceHero,
  WorkspaceMetricCard,
  WorkspacePanel,
  WorkspaceProfilePanel,
  workspaceToneClass,
} from '@/components/workspace/workspace-dashboard';
import { useUserProfileStore } from '@/lib/store/user-profile';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

const TASKS_STORAGE_KEY = 'workspace:plan:tasks';

export default function PlanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const avatar = useUserProfileStore((state) => state.avatar);
  const nickname = useUserProfileStore((state) => state.nickname);
  const bio = useUserProfileStore((state) => state.bio);

  useEffect(() => {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    const nextTasks = (() => {
      if (!saved) return [];

      try {
        return JSON.parse(saved) as Task[];
      } catch {
        return [];
      }
    })();

    const frame = window.requestAnimationFrame(() => {
      setTasks(nextTasks);
      setIsLoading(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [isLoading, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, progress };
  }, [tasks]);

  const trendValues = useMemo(() => {
    const dailyBuckets = Array.from({ length: 6 }, (_, index) => {
      return tasks.filter((task) => {
        const day = new Date();
        day.setDate(day.getDate() - (5 - index));
        return new Date(task.createdAt).toDateString() === day.toDateString();
      }).length;
    });
    return dailyBuckets.map((value, index) => Math.max(value, index === 5 ? stats.pending : 1));
  }, [stats.pending, tasks]);

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function clearCompleted() {
    setTasks((prev) => prev.filter((task) => !task.completed));
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
          eyebrow="Study Planner"
          title="把今日任务做成一块更有节奏感的进度面板。"
          description="参考仪表盘型布局，把输入、任务进度和学习节奏拆成不同层级的卡片，不再只有单调的待办列表。"
          badges={[
            `${stats.completed}/${stats.total} 已完成`,
            `剩余 ${stats.pending} 项`,
            `当前进度 ${stats.progress}%`,
          ]}
          tone="sky"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceMetricCard
              label="今日推进"
              value={`${stats.progress}%`}
              note="完成率越高，右侧圆环和趋势曲线越完整。"
              tone="sun"
              icon={TrendingUp}
            />
            <WorkspaceMetricCard
              label="待处理"
              value={`${stats.pending}`}
              note="将大目标拆成几条清晰任务，减少临时切换成本。"
              tone="peach"
              icon={Target}
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
            title="今日任务板"
            subtitle="保留原有的本地待办能力，但重做了输入区、任务卡片和清理动作的视觉关系。"
            icon={ListChecks}
            tone="sun"
            className="min-h-[560px]"
          >
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-[1fr_130px]">
                <input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addTask();
                  }}
                  placeholder="添加一个今天必须完成的学习动作..."
                  className="h-12 rounded-[1.2rem] border border-[#dde6f3] bg-white/92 px-4 text-sm text-[#263247] outline-none transition focus:border-[#9cb9ff] focus:ring-4 focus:ring-[#9cb9ff]/15"
                />
                <button
                  type="button"
                  onClick={addTask}
                  disabled={!newTaskTitle.trim()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-[#20232b] px-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(31,35,43,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Plus className="h-4 w-4" />
                  添加
                </button>
              </div>

              <div className="grid max-h-[420px] gap-3 overflow-auto pr-1">
                {tasks.length ? (
                  tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={cn(
                        'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                        workspaceToneClass(
                          task.completed ? 'mint' : index % 2 === 0 ? 'peach' : 'violet',
                        ),
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
                            task.completed
                              ? 'border-[#4eb38c] bg-[#4eb38c] text-white'
                              : 'border-white/90 bg-white/90 text-[#8ea0ba]',
                          )}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#c3cad8]" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              task.completed ? 'text-[#6b7a8f] line-through' : 'text-[#212734]',
                            )}
                          >
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-[#75839a]">
                            {new Date(task.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="rounded-full border border-white/85 bg-white/82 px-3 py-1.5 text-xs font-semibold text-[#7b6c62] transition hover:bg-white"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="workspace-empty-box flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <Sparkles className="h-10 w-10 text-[#97a6bb]" />
                    <div>
                      <p className="font-semibold text-[#53627b]">还没有今日任务</p>
                      <p className="mt-1 text-sm text-[#74839a]">先加 1-3 条最关键的学习动作。</p>
                    </div>
                  </div>
                )}
              </div>

              {stats.completed > 0 ? (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] border border-[#e2d7cb] bg-white/84 px-4 text-sm font-semibold text-[#685d52] transition hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  清除已完成任务
                </button>
              ) : null}
            </div>
          </WorkspacePanel>
        </motion.div>

        <div className="grid gap-4">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <WorkspaceProfilePanel
              avatar={avatar}
              nickname={nickname}
              bio={bio}
              tone="peach"
              footer={
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.15rem] border border-white/80 bg-white/84 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa8bd]">
                      今日新增
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#1f2430]">{tasks.length}</p>
                    <p className="mt-1 text-xs text-[#6c7a91]">任务总量</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/80 bg-white/84 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa8bd]">
                      节奏
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#1f2430]">
                      {stats.progress >= 70 ? '稳' : '调'}
                    </p>
                    <p className="mt-1 text-xs text-[#6c7a91]">根据完成率判断</p>
                  </div>
                </div>
              }
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <WorkspacePanel
              title="完成圆环"
              subtitle="把原来的单色进度环升级成更像仪表盘的中心组件。"
              icon={Clock3}
              tone="mint"
            >
              <div className="flex items-center justify-center">
                <ProgressDonut value={stats.progress} label="完成度" />
              </div>
            </WorkspacePanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WorkspacePanel
              title="任务节奏"
              subtitle="用折线展示最近几天的任务输入节奏，页面更有数据感。"
              icon={TrendingUp}
              tone="violet"
            >
              <MiniLineChart values={trendValues} labels={['-5', '-4', '-3', '-2', '-1', '今']} />
            </WorkspacePanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
