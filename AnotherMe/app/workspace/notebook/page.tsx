'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, FileText, Loader2, Search, Tag, TrendingUp } from 'lucide-react';
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

interface NoteItem {
  id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  createdAt: number;
}

const NOTES_STORAGE_KEY = 'workspace:notebook:items';

const LEGACY_MOCK_NOTE_TITLES = new Set(['一次函数笔记', '光合作用要点', '勾股定理总结']);

function isNoteItem(value: unknown): value is NoteItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<NoteItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.content === 'string' &&
    typeof item.subject === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === 'string') &&
    typeof item.createdAt === 'number'
  );
}

function isLegacyMockNotes(items: NoteItem[]): boolean {
  return items.length === 3 && items.every((item) => LEGACY_MOCK_NOTE_TITLES.has(item.title));
}

export default function NotebookPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const avatar = useUserProfileStore((state) => state.avatar);
  const nickname = useUserProfileStore((state) => state.nickname);
  const bio = useUserProfileStore((state) => state.bio);

  useEffect(() => {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY);
    const nextNotes = (() => {
      if (!saved) return [];

      try {
        const parsed = JSON.parse(saved);
        const normalized = Array.isArray(parsed) ? parsed.filter(isNoteItem) : [];
        if (isLegacyMockNotes(normalized)) {
          localStorage.removeItem(NOTES_STORAGE_KEY);
          return [];
        }
        return normalized;
      } catch {
        localStorage.removeItem(NOTES_STORAGE_KEY);
        return [];
      }
    })();

    const frame = window.requestAnimationFrame(() => {
      setNotes(nextNotes);
      setIsLoading(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  }, [isLoading, notes]);

  const subjects = useMemo(() => {
    const allSubjects = notes.map((note) => note.subject);
    return ['all', ...Array.from(new Set(allSubjects))];
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, selectedSubject]);

  const subjectSummary = useMemo(() => {
    return subjects
      .filter((subject) => subject !== 'all')
      .map((subject) => ({
        label: subject,
        count: notes.filter((note) => note.subject === subject).length,
      }));
  }, [notes, subjects]);

  const tagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    notes
      .flatMap((note) => note.tags)
      .forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
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
          eyebrow="Notebook Hub"
          title="把错题本做成可检索、可观察的学习资料库。"
          description="不再只是平铺列表，而是增加主题分布、标签热度和最近笔记卡片，让你一眼看到知识积累的结构。"
          badges={[
            `${notes.length} 条笔记`,
            `${Math.max(subjects.length - 1, 0)} 个科目`,
            `${tagSummary.length} 个标签`,
          ]}
          tone="sky"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceMetricCard
              label="检索结果"
              value={`${filteredNotes.length}`}
              note="搜索与科目筛选会同步更新下面的笔记列表。"
              tone="mint"
              icon={Search}
            />
            <WorkspaceMetricCard
              label="知识沉淀"
              value={`${tagSummary.length}`}
              note="标签数量越清晰，复习时越容易找到薄弱点。"
              tone="violet"
              icon={Tag}
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
            title="笔记索引"
            subtitle="用更清晰的白底索引区承接搜索，再用 pastel 卡片承接内容，避免页面和卡片混成一片。"
            icon={FileText}
            tone="sun"
            className="min-h-[560px]"
          >
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c99af]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="搜索标题、内容或关键知识点..."
                    className="h-12 w-full rounded-[1.2rem] border border-[#dde6f3] bg-white/90 pl-11 pr-4 text-sm text-[#263247] outline-none transition focus:border-[#9cb9ff] focus:ring-4 focus:ring-[#9cb9ff]/15"
                  />
                </div>
                <select
                  aria-label="按科目筛选笔记"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                  className="h-12 rounded-[1.2rem] border border-[#ece2f9] bg-white/86 px-4 text-sm text-[#39465f] outline-none"
                >
                  <option value="all">全部科目</option>
                  {subjects
                    .filter((subject) => subject !== 'all')
                    .map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid max-h-[430px] gap-3 overflow-auto pr-1">
                {filteredNotes.length ? (
                  filteredNotes.map((note, index) => (
                    <div
                      key={note.id}
                      className={cn(
                        'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                        workspaceToneClass(
                          index % 3 === 0 ? 'peach' : index % 3 === 1 ? 'violet' : 'teal',
                        ),
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-[#51627d]">
                              {note.subject}
                            </span>
                            <span className="text-[11px] text-[#7c8aa1]">
                              {new Date(note.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p className="mt-3 text-base font-semibold text-[#212734]">
                            {note.title}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[#5f6d84]">{note.content}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/85 bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-[#596a86]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          className="rounded-full border border-white/85 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#7b6c62] transition hover:bg-white"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="workspace-empty-box flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                    <BookOpen className="h-10 w-10 text-[#97a6bb]" />
                    <div>
                      <p className="font-semibold text-[#53627b]">没有找到符合条件的笔记</p>
                      <p className="mt-1 text-sm text-[#74839a]">
                        可以换个关键词，或者切回全部科目。
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
              title="资料拥有者"
              tone="peach"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <WorkspacePanel
              title="科目分布"
              subtitle="通过柱状分布看出笔记集中在哪些学科，补薄弱项会更直观。"
              icon={TrendingUp}
              tone="mint"
            >
              <MiniBarChart
                values={subjectSummary.map((item) => item.count || 1)}
                labels={subjectSummary.map((item) => item.label)}
              />
            </WorkspacePanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WorkspacePanel
              title="标签热度"
              subtitle="保留了标签功能，但把它做成了更细致的组件分组。"
              icon={Tag}
              tone="violet"
            >
              <div className="flex flex-wrap gap-2">
                {tagSummary.length ? (
                  tagSummary.map(([tag, count], index) => (
                    <span
                      key={tag}
                      className={cn(
                        'rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_12px_22px_rgba(89,90,110,0.05)]',
                        workspaceToneClass(index % 2 === 0 ? 'sun' : 'rose'),
                      )}
                    >
                      #{tag} · {count}
                    </span>
                  ))
                ) : (
                  <div className="workspace-empty-box w-full">还没有标签数据。</div>
                )}
              </div>
            </WorkspacePanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
