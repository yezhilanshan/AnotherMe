'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Moon, SlidersHorizontal, Sparkles, Sun } from 'lucide-react';
import { SettingsDialog } from '@/components/settings';
import { useTheme } from '@/lib/hooks/use-theme';

const PREF_KEY = 'openmaic:workspace:preferences';

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
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;

    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (!raw) return defaultPreferences;
      const parsed = JSON.parse(raw) as WorkspacePreferences;
      return { ...defaultPreferences, ...parsed };
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
    <div className="workspace-cn-font space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="workspace-hero-card"
      >
        <p className="workspace-eyebrow">设置中心</p>
        <h1 className="workspace-title">把界面节奏、模型能力和你的使用习惯统一在一个地方。</h1>
        <p className="workspace-subtitle">
          日常偏好放在外层页面，高级模型、语音和多媒体能力放进配置面板，结构更清楚。
        </p>
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="workspace-panel space-y-5">
          <h2 className="text-lg font-semibold text-[#2b241e]">工作台偏好</h2>

          <div className="workspace-setting-row">
            <div>
              <p className="font-semibold text-[#3f352c]">主题外观</p>
              <p className="text-sm text-[#7a6d61]">在浅色与深色界面之间切换。</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`workspace-secondary-btn ${theme === 'light' ? 'ring-2 ring-[#d1b18b]' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
                浅色
              </button>
              <button
                type="button"
                className={`workspace-secondary-btn ${theme === 'dark' ? 'ring-2 ring-[#d1b18b]' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
                深色
              </button>
            </div>
          </div>

          <label className="workspace-setting-row">
            <div>
              <p className="font-semibold text-[#3f352c]">减少动效</p>
              <p className="text-sm text-[#7a6d61]">关闭大部分动画，让界面更安静。</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.reducedMotion}
              onChange={(event) =>
                setPrefs((prev) => ({ ...prev, reducedMotion: event.target.checked }))
              }
              className="h-5 w-5 rounded border-slate-300"
            />
          </label>

          <label className="workspace-setting-row">
            <div>
              <p className="font-semibold text-[#3f352c]">自动保存到错题本</p>
              <p className="text-sm text-[#7a6d61]">生成题目视频后，自动沉淀为复盘记录。</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.autoSaveNotebook}
              onChange={(event) =>
                setPrefs((prev) => ({ ...prev, autoSaveNotebook: event.target.checked }))
              }
              className="h-5 w-5 rounded border-slate-300"
            />
          </label>

          <label className="block">
            <span className="workspace-label">专注时长（分钟）</span>
            <input
              type="number"
              min={10}
              max={90}
              value={prefs.focusTimerMinutes}
              onChange={(event) =>
                setPrefs((prev) => ({
                  ...prev,
                  focusTimerMinutes: Number(event.target.value) || defaultPreferences.focusTimerMinutes,
                }))
              }
              className="workspace-input"
            />
          </label>
        </div>

        <div className="workspace-panel">
          <h2 className="text-lg font-semibold text-[#2b241e]">高级能力配置</h2>
          <p className="mt-2 text-sm text-[#7a6d61]">
            模型、图片、视频、语音和网页搜索都集中在高级面板里管理。
          </p>

          <div className="workspace-side-card mt-5">
            <p className="text-sm font-semibold text-[#3f352c]">提供商控制台</p>
            <p className="mt-1 text-sm text-[#7a6d61]">
              统一连接 OpenAI 兼容接口，并为课堂、视频和语音生成指定对应能力。
            </p>
            <button type="button" className="workspace-primary-btn mt-4" onClick={() => setAdvancedOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              打开高级设置
            </button>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-[#eadbc7] bg-[#f8f1e7] p-4 text-sm text-[#6d5a45]">
            <p className="inline-flex items-center gap-2 font-semibold text-[#4e3f30]">
              <Sparkles className="h-4 w-4" />
              使用提醒
            </p>
            <p className="mt-1">
              如果你要使用题目视频或语音能力，请先在高级设置里把对应提供商与密钥补齐。
            </p>
          </div>
        </div>
      </section>

      <SettingsDialog open={advancedOpen} onOpenChange={setAdvancedOpen} />
    </div>
  );
}
