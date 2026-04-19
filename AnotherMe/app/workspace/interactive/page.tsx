'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  FileUp,
  Languages,
  Loader2,
  Search,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  MiniBarChart,
  WorkspaceHero,
  WorkspaceMetricCard,
  WorkspacePanel,
  WorkspaceProfilePanel,
  workspaceToneClass,
} from '@/components/workspace/workspace-dashboard';
import { storePdfBlob } from '@/lib/utils/image-storage';
import { listStages, type StageListItem } from '@/lib/utils/stage-storage';
import { useUserProfileStore } from '@/lib/store/user-profile';
import { cn } from '@/lib/utils';

interface FormState {
  topic: string;
  language: 'zh-CN' | 'en-US';
  withWebSearch: boolean;
  pdfFile: File | null;
}

const initialForm: FormState = {
  topic: '',
  language: 'zh-CN',
  withWebSearch: true,
  pdfFile: null,
};

const topicTemplates = [
  {
    title: '一次函数入门',
    note: '概念 + 图像 + 2 道基础题',
    value: '初二数学：一次函数，先讲概念，再做2道基础题和1道应用题',
    tone: 'peach',
  },
  {
    title: '光合作用实验',
    note: '实验观察 + 总结结论',
    value: '初中生物：光合作用，通过实验观察并总结光反应与暗反应',
    tone: 'mint',
  },
  {
    title: '勾股定理强化',
    note: '证明 + 例题 + 练习',
    value: '初二几何：勾股定理，配1道证明题、1道例题和1道练习',
    tone: 'violet',
  },
] as const;

const scenePills = ['课堂生成', '题目讲解', '错题复习', '学习计划'];

export default function InteractiveWorkspacePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [recentStages, setRecentStages] = useState<StageListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatar = useUserProfileStore((state) => state.avatar);
  const nickname = useUserProfileStore((state) => state.nickname);
  const bio = useUserProfileStore((state) => state.bio);

  useEffect(() => {
    let mounted = true;

    listStages().then((items) => {
      if (mounted) {
        setRecentStages(items.slice(0, 5));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const topicLength = form.topic.trim().length;

  const activityBars = useMemo(() => {
    const base = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const values = base.map((_, index) =>
      Math.max(2, (recentStages[index]?.sceneCount ?? 0) + index + 1),
    );
    return { labels: base, values };
  }, [recentStages]);

  async function handleGenerateLesson() {
    if (!form.topic.trim()) {
      setError('请先输入学习主题。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const profile = useUserProfileStore.getState();

      let pdfStorageKey: string | undefined;
      let pdfFileName: string | undefined;

      if (form.pdfFile) {
        pdfStorageKey = await storePdfBlob(form.pdfFile);
        pdfFileName = form.pdfFile.name;
      }

      const generationSession = {
        sessionId: nanoid(),
        requirements: {
          requirement: form.topic,
          language: form.language,
          webSearch: form.withWebSearch,
          userNickname: profile.nickname || undefined,
          userBio: profile.bio || undefined,
        },
        pdfText: '',
        currentStep: 'generating' as const,
        pdfStorageKey,
        pdfFileName,
      };

      sessionStorage.setItem('generationSession', JSON.stringify(generationSession));
      router.push('/workspace/generation-preview');
    } catch {
      setError('准备生成时出错，请重试。');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <WorkspaceHero
          eyebrow="Lesson Studio"
          title="像搭积木一样，快速拼出下一节课堂。"
          description="借鉴模板中的圆角卡片、主副分区与柔和配色，把输入流程聚焦在一个主舞台里。你只要填核心信息，系统会把后续生成链路自动接起来。"
          badges={[
            'Pastel 主舞台',
            '支持 PDF 参考资料',
            form.withWebSearch ? '已启用联网搜索' : '本次关闭联网搜索',
          ]}
          tone="sky"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceMetricCard
              label="当前草稿"
              value={topicLength ? `${topicLength} 字` : '待输入'}
              note="先把目标说明清楚，再决定语言和资料来源。"
              tone="sun"
              icon={Target}
            />
            <WorkspaceMetricCard
              label="课堂库存"
              value={`${recentStages.length}`}
              note="最近生成的课堂会继续显示在侧栏和回放区。"
              tone="peach"
              icon={BookOpenCheck}
            />
          </div>
        </WorkspaceHero>
      </motion.div>

      <div className="flex flex-wrap gap-2.5">
        {scenePills.map((pill, index) => (
          <span
            key={pill}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_10px_22px_rgba(96,93,107,0.08)]',
              index === 0
                ? 'border-[#252a33] bg-[#252a33] text-white'
                : 'border-[#eadfce] bg-white/88 text-[#6b675f]',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                index === 0 ? 'bg-[#f8d08f]' : 'bg-[#b7bfce]',
              )}
            />
            {pill}
          </span>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.28fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <WorkspacePanel
            title="课堂配置台"
            subtitle="左侧输入真实需求，右侧给你快速起步模板和生成流程。卡片背景与页面舞台分离之后，输入区和辅助区的层级会更清楚。"
            icon={Wand2}
            tone="sun"
            className="min-h-[600px]"
          >
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#3f4a60]">学习主题</span>
                  <textarea
                    value={form.topic}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, topic: event.target.value }))
                    }
                    placeholder="例如：初二数学一次函数，先讲概念，再做2道基础题和1道提升题。"
                    className="min-h-[260px] w-full resize-none rounded-[1.7rem] border border-[#dfd4c5] bg-white/92 px-4 py-4 text-sm leading-7 text-[#2a3345] outline-none transition focus:border-[#93b6ff] focus:ring-4 focus:ring-[#93b6ff]/15"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="rounded-[1.35rem] border border-[#ddd5f7] bg-white/84 p-4 shadow-[0_16px_34px_rgba(89,90,110,0.06)]">
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#444e62]">
                      <Languages className="h-4 w-4 text-[#64748b]" />
                      输出语言
                    </span>
                    <select
                      value={form.language}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          language: event.target.value as FormState['language'],
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#e7def9] bg-[#faf8ff] px-3 text-sm text-[#44516b] outline-none"
                    >
                      <option value="zh-CN">中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </label>

                  <label className="rounded-[1.35rem] border border-[#d5e8dc] bg-white/84 p-4 shadow-[0_16px_34px_rgba(89,90,110,0.06)]">
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#444e62]">
                      <Search className="h-4 w-4 text-[#64748b]" />
                      搜索策略
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, withWebSearch: !prev.withWebSearch }))
                      }
                      className={cn(
                        'flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold transition',
                        form.withWebSearch
                          ? 'border-[#d4efe5] bg-[#eefaf5] text-[#2f6d5c]'
                          : 'border-[#e9e1d8] bg-[#fbf8f3] text-[#806f61]',
                      )}
                    >
                      <span>{form.withWebSearch ? '已开启联网搜索' : '当前仅使用本地输入'}</span>
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          form.withWebSearch ? 'bg-[#4ac39d]' : 'bg-[#d2b899]',
                        )}
                      />
                    </button>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d9e4ff] bg-white/90 px-4 py-2 text-sm font-semibold text-[#50627e] shadow-[0_12px_30px_rgba(94,97,111,0.06)]">
                    <FileUp className="h-4 w-4" />
                    {form.pdfFile ? form.pdfFile.name : '上传 PDF 作为参考资料'}
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setForm((prev) => ({ ...prev, pdfFile: file }));
                        }
                      }}
                    />
                  </label>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[#f0e0cf] bg-white/80 px-4 py-2 text-sm text-[#7b6b5c]">
                    <Clock3 className="h-4 w-4" />
                    预计生成耗时 10-20 秒
                  </div>
                </div>

                {error ? <p className="text-sm font-medium text-[#cc4a43]">{error}</p> : null}

                <button
                  type="button"
                  onClick={handleGenerateLesson}
                  disabled={submitting || topicLength === 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[1.2rem] bg-[#20232b] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(31,35,43,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在准备生成
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      生成课堂
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.45rem] border border-white/75 bg-white/86 p-4 shadow-[0_16px_34px_rgba(89,90,110,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa8bd]">
                    一键示例
                  </p>
                  <div className="mt-4 space-y-3">
                    {topicTemplates.map((template) => (
                      <button
                        key={template.title}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, topic: template.value }))}
                        className={cn(
                          'w-full rounded-[1.35rem] border p-4 text-left shadow-[0_16px_30px_rgba(89,90,110,0.06)] transition hover:-translate-y-0.5',
                          workspaceToneClass(template.tone),
                        )}
                      >
                        <p className="text-sm font-semibold text-[#222936]">{template.title}</p>
                        <p className="mt-1 text-xs text-[#68788f]">{template.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.45rem] border border-white/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(244,247,255,0.82))] p-4 shadow-[0_16px_34px_rgba(89,90,110,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9aa8bd]">
                    生成流程
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      '分析学习目标与难度',
                      '结合资料与联网结果补充上下文',
                      '进入生成预览并继续生成课堂',
                    ].map((step, index) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-[1.2rem] border border-[#edf0f7] bg-white/86 px-3 py-3"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#20232b] text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-6 text-[#4f5f78]">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
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
              tone="peach"
              footer={
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.15rem] border border-white/80 bg-white/84 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa8bd]">
                      本周
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#1f2430]">
                      {recentStages.length || 0}
                    </p>
                    <p className="mt-1 text-xs text-[#6c7a91]">已生成课堂</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/80 bg-white/84 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa8bd]">
                      搜索
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#1f2430]">
                      {form.withWebSearch ? 'ON' : 'OFF'}
                    </p>
                    <p className="mt-1 text-xs text-[#6c7a91]">资料补全模式</p>
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
              title="最近生成轨迹"
              subtitle="用更明确的条形图展示最近课堂数量，让页面不只是表单。"
              icon={Clock3}
              tone="violet"
            >
              <MiniBarChart values={activityBars.values} labels={activityBars.labels} />
            </WorkspacePanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WorkspacePanel
              title="继续学习"
              subtitle="从最近生成的课堂继续进入，不需要重新组织输入。"
              icon={BookOpenCheck}
              tone="mint"
            >
              <div className="space-y-3">
                {recentStages.length ? (
                  recentStages.map((stage, index) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => router.push(`/classroom/${stage.id}`)}
                      className={cn(
                        'w-full rounded-[1.35rem] border p-4 text-left shadow-[0_14px_30px_rgba(89,90,110,0.06)] transition hover:-translate-y-0.5',
                        workspaceToneClass(index % 2 === 0 ? 'sky' : 'coral'),
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#222936]">
                            {stage.name}
                          </p>
                          <p className="mt-1 text-xs text-[#6d7b91]">
                            {stage.sceneCount} 个场景 ·{' '}
                            {new Date(stage.updatedAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6f7f9d]" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="workspace-empty-box">
                    还没有课堂记录，先从左侧配置台生成第一节课。
                  </div>
                )}
              </div>
            </WorkspacePanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
