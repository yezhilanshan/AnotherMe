'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock3,
  Moon,
  Palette,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  ProgressDonut,
  WorkspaceHero,
  WorkspaceMetricCard,
  WorkspacePanel,
  WorkspaceProfilePanel,
  workspaceToneClass,
} from '@/components/workspace/workspace-dashboard';
import { SettingsDialog } from '@/components/settings';
import { useUserProfileStore } from '@/lib/store/user-profile';
import { useTheme } from '@/lib/hooks/use-theme';
import { cn } from '@/lib/utils';

const PREF_KEY = 'anotherme:workspace:preferences';

interface WorkspacePreferences {
  reducedMotion: boolean;
  autoSaveNotebook: boolean;
  focusTimerMinutes: number;
}

const defaultPreferences: WorkspacePreferences = {
  reducedMotion: false,
  autoSaveNotebook: true,
  focusTimerMinutes: 25,
};

export default function WorkspaceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const avatar = useUserProfileStore((state) => state.avatar);
  const nickname = useUserProfileStore((state) => state.nickname);
  const bio = useUserProfileStore((state) => state.bio);
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;

    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (!raw) return defaultPreferences;
      return { ...defaultPreferences, ...(JSON.parse(raw) as WorkspacePreferences) };
    } catch {
      return defaultPreferences;
    }
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle('workspace-reduced-motion', prefs.reducedMotion);
  }, [prefs]);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <WorkspaceHero
          eyebrow="Preferences"
          title="把设置页改成一块真正能预览状态的控制面板。"
          description="不再只是堆放开关，而是把主题、动效、自动保存和高级入口拆成清晰卡片，并增加节奏可视化组件。"
          badges={[
            theme === 'dark' ? '深色模式' : '浅色模式',
            prefs.reducedMotion ? '减少动效已开启' : '保留过渡动效',
            `专注时长 ${prefs.focusTimerMinutes} 分钟`,
          ]}
          tone="sky"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkspaceMetricCard
              label="当前主题"
              value={theme === 'dark' ? 'Dark' : 'Light'}
              note="主题切换会同步影响整个学习工作区。"
              tone="sun"
              icon={Palette}
            />
            <WorkspaceMetricCard
              label="工作流"
              value={prefs.autoSaveNotebook ? '自动保存' : '手动整理'}
              note="根据你的学习习惯决定错题是否自动沉淀。"
              tone="peach"
              icon={Shield}
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
            title="基础偏好"
            subtitle="现在每个选项都有自己的组件容器和材质层级，设置页不会再像一堆贴在页面上的平面块。"
            icon={Settings2}
            tone="sun"
            className="min-h-[560px]"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.45rem] border border-white/80 bg-white/90 p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#6c7893]" />
                  <p className="text-sm font-semibold text-[#243041]">主题外观</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f6d84]">
                  参考图的做法，主题按钮本身也做成可区分的组件块。
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                      'rounded-[1.2rem] border p-4 text-left shadow-[0_12px_24px_rgba(89,90,110,0.05)] transition',
                      theme === 'light'
                        ? 'border-[#2d3645] bg-[#2d3645] text-white'
                        : 'border-[#e8dfd4] bg-[#fffdf9] text-[#364153]',
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    <p className="mt-3 text-sm font-semibold">浅色舞台</p>
                    <p className="mt-1 text-xs opacity-80">更适合当前 pastel 设计语言</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'rounded-[1.2rem] border p-4 text-left shadow-[0_12px_24px_rgba(89,90,110,0.05)] transition',
                      theme === 'dark'
                        ? 'border-[#2d3645] bg-[#2d3645] text-white'
                        : 'border-[#e8dfd4] bg-[#fffdf9] text-[#364153]',
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    <p className="mt-3 text-sm font-semibold">深色舞台</p>
                    <p className="mt-1 text-xs opacity-80">适合夜间连续学习</p>
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                  workspaceToneClass('mint'),
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#617086]" />
                      <p className="text-sm font-semibold text-[#243041]">减少动效</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6d84]">
                      长时间学习时可以收敛动画，减少视线干扰。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPrefs((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }))
                    }
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full border transition',
                      prefs.reducedMotion
                        ? 'border-[#7db59f] bg-[#7db59f]'
                        : 'border-[#d9ddd7] bg-white/80',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 rounded-full bg-white shadow transition',
                        prefs.reducedMotion ? 'translate-x-[22px]' : 'translate-x-[3px]',
                      )}
                    />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                  workspaceToneClass('peach'),
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#617086]" />
                      <p className="text-sm font-semibold text-[#243041]">自动保存到错题本</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6d84]">
                      生成完成后自动沉淀到错题本，方便后续回顾。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPrefs((prev) => ({
                        ...prev,
                        autoSaveNotebook: !prev.autoSaveNotebook,
                      }))
                    }
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full border transition',
                      prefs.autoSaveNotebook
                        ? 'border-[#efb6a1] bg-[#efb6a1]'
                        : 'border-[#d9ddd7] bg-white/80',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 rounded-full bg-white shadow transition',
                        prefs.autoSaveNotebook ? 'translate-x-[22px]' : 'translate-x-[3px]',
                      )}
                    />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)]',
                  workspaceToneClass('violet'),
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#617086]" />
                  <p className="text-sm font-semibold text-[#243041]">专注时长（分钟）</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f6d84]">
                  将这个数字作为默认学习周期，页面右侧会同步更新圆环。
                </p>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={prefs.focusTimerMinutes}
                  onChange={(event) =>
                    setPrefs((prev) => ({
                      ...prev,
                      focusTimerMinutes:
                        Number(event.target.value) || defaultPreferences.focusTimerMinutes,
                    }))
                  }
                  className="mt-4 h-12 w-full rounded-[1.1rem] border border-white/80 bg-white/88 px-4 text-sm text-[#364153] outline-none"
                />
              </div>

              <div
                className={cn(
                  'rounded-[1.45rem] border p-4 shadow-[0_14px_30px_rgba(89,90,110,0.06)] md:col-span-2',
                  workspaceToneClass('teal'),
                )}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-[#617086]" />
                      <p className="text-sm font-semibold text-[#243041]">高级设置</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f6d84]">
                      模型、语音、视频、图片等能力继续放在弹窗里，但入口做成更明确的控制卡。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[1.1rem] bg-[#20232b] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(31,35,43,0.18)] transition hover:-translate-y-0.5"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    打开高级设置
                  </button>
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
            <WorkspaceProfilePanel avatar={avatar} nickname={nickname} bio={bio} tone="peach" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <WorkspacePanel
              title="专注刻度"
              subtitle="将默认学习时长做成中心组件，比单纯数字更像仪表盘。"
              icon={Clock3}
              tone="mint"
            >
              <div className="flex items-center justify-center">
                <ProgressDonut
                  value={Math.min(100, Math.round((prefs.focusTimerMinutes / 90) * 100))}
                  label="Focus"
                />
              </div>
            </WorkspacePanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WorkspacePanel
              title="当前摘要"
              subtitle="把设置状态集中成一组可扫读的信息卡。"
              icon={Sparkles}
              tone="violet"
            >
              <div className="space-y-3">
                {[
                  {
                    label: '主题模式',
                    value: theme === 'dark' ? '深色' : '浅色',
                    tone: 'sun',
                  },
                  {
                    label: '减少动效',
                    value: prefs.reducedMotion ? '已开启' : '未开启',
                    tone: 'mint',
                  },
                  {
                    label: '自动保存',
                    value: prefs.autoSaveNotebook ? '已开启' : '未开启',
                    tone: 'peach',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'rounded-[1.3rem] border px-4 py-3 shadow-[0_12px_26px_rgba(89,90,110,0.05)]',
                      workspaceToneClass(item.tone as 'sun' | 'mint' | 'peach'),
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d9ab0]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#212734]">{item.value}</p>
                  </div>
                ))}
              </div>
            </WorkspacePanel>
          </motion.div>
        </div>
      </div>

      <SettingsDialog open={advancedOpen} onOpenChange={setAdvancedOpen} />
    </div>
  );
}
