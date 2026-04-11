'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, FileUp, Languages, Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { listStages, type StageListItem } from '@/lib/utils/stage-storage';
import { storePdfBlob } from '@/lib/utils/image-storage';
import { useUserProfileStore } from '@/lib/store/user-profile';

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
  '用生活案例讲清一次函数，并设计课堂互动提问',
  '把光合作用做成实验导向课，包含课堂演示与讨论',
  '用动画思路讲解勾股定理，配两道分层练习题',
];

const outputHighlights = [
  '自动拆解教学目标、难点与课堂节奏',
  '生成可继续编辑的 PPT 课程骨架',
  '补充互动提问、练习题与案例延展',
];

const workflowSteps = ['写清主题与目标', '生成课堂首版', '进入教室继续打磨'];

export default function InteractiveWorkspacePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [recentStages, setRecentStages] = useState<StageListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topicLength = form.topic.trim().length;

  useEffect(() => {
    let mounted = true;

    listStages().then((items) => {
      if (!mounted) return;
      setRecentStages(items.slice(0, 5));
    });

    return () => {
      mounted = false;
    };
  }, []);

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
          userNickname: profile.nickname || undefined,
          userBio: profile.bio || undefined,
          webSearch: form.withWebSearch,
        },
        pdfText: '',
        pdfImages: [],
        imageStorageIds: [],
        pdfStorageKey,
        pdfFileName,
        pdfProviderId: undefined,
        pdfProviderConfig: undefined,
        sceneOutlines: null,
        currentStep: 'generating' as const,
      };

      sessionStorage.setItem('generationSession', JSON.stringify(generationSession));
      router.push('/workspace/generation-preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动课程生成失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="workspace-cn-font space-y-6 text-[#2e2822]">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="workspace-hero-card"
      >
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr] lg:items-end">
          <div>
            <p className="workspace-eyebrow">互动课堂工作台</p>
            <h1 className="workspace-title">把一个主题打磨成一节能直接上课的中文课堂。</h1>
            <p className="workspace-subtitle">
              你只需要描述学生要学会什么、课堂想怎么展开，系统会先帮你生成结构清晰的课件骨架，再进入教室继续精修内容、动作和讲解节奏。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="workspace-chip">中文界面</span>
              <span className="workspace-chip-muted">暖纸感视觉</span>
              <span className="workspace-chip-muted">支持参考 PDF</span>
            </div>
          </div>

          <div className="workspace-panel">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#8b7864]">本页节奏</p>
            <div className="mt-3 space-y-2.5">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2d2722] text-xs font-semibold text-[#faf5ee]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium text-[#4c433a]">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 border-t border-[#ece1d3] pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[#8e7d6d]">生成时长</p>
                <p className="mt-1 text-lg font-semibold text-[#2c251f]">约 3-5 分钟</p>
              </div>
              <div>
                <p className="text-xs text-[#8e7d6d]">适合场景</p>
                <p className="mt-1 text-lg font-semibold text-[#2c251f]">备课 / 试讲 / 复盘</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.36 }}
          className="workspace-panel p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#26201b]">课程输入</h2>
              <p className="mt-1 text-sm text-[#786d62]">用完整句描述目标、对象和课堂方式，首版结果会明显更稳。</p>
            </div>
            <span className="workspace-chip">智能结构生成</span>
          </div>

          <div className="mt-5 space-y-5 border-t border-[#eee3d6] pt-5">
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="workspace-label mb-0">学习主题</span>
                <span className="text-xs font-medium text-[#938679]">{topicLength} 字</span>
              </div>
              <textarea
                value={form.topic}
                onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                placeholder="例如：面向初二学生，用超市打折与路程变化案例讲解一次函数，并设计 2 个递进式互动问题。"
                className="workspace-textarea min-h-[180px]"
                rows={6}
              />
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#8b7864]">推荐写法</p>
              <div className="flex flex-wrap gap-2">
                {topicTemplates.map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, topic: template }))}
                    className="rounded-full border border-[#e0d3c2] bg-[#f8f2ea] px-3 py-1.5 text-xs font-medium text-[#62574c] transition-colors hover:border-[#cdb08d] hover:bg-[#f4eadf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7aa84]"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border-t border-[#eee3d6] pt-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-[#4a413a]">
                  <Languages className="h-3.5 w-3.5" />
                  输出语言
                </span>
                <select
                  value={form.language}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      language: event.target.value as 'zh-CN' | 'en-US',
                    }))
                  }
                  className="workspace-input h-11"
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">英文</option>
                </select>
              </label>

              <div className="block">
                <span className="mb-1.5 inline-flex text-sm font-medium text-[#4a413a]">参考资料</span>
                <div className="relative">
                  <input
                    id="lesson-reference-pdf"
                    type="file"
                    accept="application/pdf"
                    className="peer sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setForm((prev) => ({ ...prev, pdfFile: file }));
                    }}
                  />
                  <label htmlFor="lesson-reference-pdf" className="workspace-upload-label h-11">
                    <FileUp className="h-4 w-4 shrink-0" />
                    <span className="truncate">{form.pdfFile?.name ?? '上传课堂参考 PDF（可选）'}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="workspace-setting-row">
              <div>
                <p className="font-semibold text-[#3d342c]">启用网页搜索</p>
                <p className="mt-1 text-sm text-[#7d7164]">补充更新的案例、新闻素材和背景信息。</p>
              </div>
              <input
                type="checkbox"
                checked={form.withWebSearch}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, withWebSearch: event.target.checked }))
                }
                className="h-4 w-4 rounded border-[#cdbba4] text-[#8b653a]"
              />
            </div>

            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

            <button
              type="button"
              onClick={handleGenerateLesson}
              disabled={submitting}
              className="workspace-primary-btn h-12 w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在准备课堂内容
                </>
              ) : (
                <>
                  开始生成互动课堂
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.36 }}
          className="space-y-5"
        >
          <div className="workspace-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#26201b]">最近课堂</h2>
              <BookOpen className="h-4 w-4 text-[#7b6550]" />
            </div>

            <div className="mt-4 space-y-3">
              {recentStages.length ? (
                recentStages.map((stage) => (
                  <Link key={stage.id} href={`/workspace/classroom/${stage.id}`} className="workspace-list-item">
                    <p className="text-sm font-semibold text-[#3d352e]">{stage.name}</p>
                    <p className="mt-1 text-xs text-[#7a7067]">
                      {stage.sceneCount} 个场景 ·{' '}
                      {new Intl.DateTimeFormat('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                      }).format(new Date(stage.updatedAt))}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="workspace-empty-box">还没有历史课堂，生成后会自动出现在这里。</div>
              )}
            </div>
          </div>

          <div className="workspace-panel p-5">
            <h3 className="text-lg font-semibold text-[#26201b]">本次会生成</h3>
            <div className="mt-3 space-y-2 border-t border-[#ede3d6] pt-3">
              {outputHighlights.map((item) => (
                <div key={item} className="flex items-start gap-2.5 py-2.5">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#9b7449]" />
                  <p className="text-sm leading-7 text-[#4f463f]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-panel p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#8b7864]">小提示</p>
            <p className="mt-2 text-base font-semibold text-[#2d251f]">
              先写“学生是谁、要学会什么、希望课堂怎么展开”，再写素材要求。
            </p>
            <p className="mt-2 text-sm leading-7 text-[#776b5f]">
              这种写法比只写一个知识点更容易生成出层次清楚、节奏稳定的课堂结构。
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
