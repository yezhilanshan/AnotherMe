'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Loader2, PlayCircle, Save } from 'lucide-react';
import { nanoid } from 'nanoid';
import { addNotebookRecord } from '@/lib/workspace/problem-notebook';
import { useSettingsStore } from '@/lib/store/settings';

export default function ProblemVideoPage() {
  const [question, setQuestion] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const canGenerate = useMemo(() => question.trim().length > 3, [question]);

  function shouldAutoSaveNotebook() {
    try {
      const raw = window.localStorage.getItem('openmaic:workspace:preferences');
      if (!raw) return true;
      const parsed = JSON.parse(raw) as { autoSaveNotebook?: boolean };
      return parsed.autoSaveNotebook ?? true;
    } catch {
      return true;
    }
  }

  function inferTags(text: string) {
    const tags: string[] = ['拍题', '视频'];
    const value = text.toLowerCase();
    if (value.includes('equation') || value.includes('方程')) tags.push('方程');
    if (value.includes('geometry') || value.includes('几何')) tags.push('几何');
    if (value.includes('function') || value.includes('函数')) tags.push('函数');
    return tags;
  }

  async function handleGenerate() {
    if (!canGenerate) {
      setError('请先补充清楚题目描述。');
      return;
    }

    setError(null);
    setSavedMessage(null);
    setLoading(true);
    setVideoUrl(undefined);

    try {
      const settings = useSettingsStore.getState();
      const providerConfig = settings.videoProvidersConfig?.[settings.videoProviderId];

      const prompt = [
        'You are a patient middle-school teacher.',
        `Problem: ${question.trim()}`,
        'Create a short teaching video script with step-by-step explanation and one quick recap.',
      ].join(' ');

      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-video-provider': settings.videoProviderId || 'seedance',
          'x-video-model': settings.videoModelId || '',
          'x-api-key': providerConfig?.apiKey || '',
          'x-base-url': providerConfig?.baseUrl || '',
        },
        body: JSON.stringify({
          prompt,
          duration: 8,
          aspectRatio: '16:9',
          resolution: '720p',
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { result?: { url?: string } };
      };

      if (!response.ok || !json.success || !json.data?.result?.url) {
        throw new Error(json.error || '视频生成失败，请先检查视频模型和密钥配置。');
      }

      setVideoUrl(json.data.result.url);

      if (shouldAutoSaveNotebook()) {
        await addNotebookRecord({
          id: nanoid(),
          question: question.trim(),
          explanation: '系统自动生成的题目讲解视频，可用于课后复盘或错题回看。',
          createdAt: Date.now(),
          imageDataUrl,
          videoUrl: json.data.result.url,
          tags: inferTags(question),
          status: 'generated',
        });
        setSavedMessage('已自动保存到错题本。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成过程中出现异常，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveManually() {
    await addNotebookRecord({
      id: nanoid(),
      question: question.trim() || '未命名题目',
      explanation: '从题目视频页面手动保存的记录。',
      createdAt: Date.now(),
      imageDataUrl,
      videoUrl,
      tags: [...inferTags(question), '手动保存'],
      status: videoUrl ? 'generated' : 'processing',
    });
    setSavedMessage('已保存到错题本。');
  }

  return (
    <div className="workspace-cn-font space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="workspace-hero-card"
      >
        <p className="workspace-eyebrow">题目视频</p>
        <h1 className="workspace-title">把一道题的图片和描述整理成可复看的讲解短视频。</h1>
        <p className="workspace-subtitle">
          适合整理典型题、错题和课堂演示片段。上传图片后，再补一句面向谁来讲、重点讲什么，效果会更稳定。
        </p>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="workspace-panel">
          <h2 className="text-lg font-semibold text-[#2b241e]">题目输入</h2>

          <div className="mt-4 space-y-4">
            <label className="workspace-upload-dropzone">
              <Camera className="h-5 w-5 text-[#8a6845]" />
              <span className="text-sm font-semibold text-[#3b322a]">
                {imageDataUrl ? '重新上传题目图片' : '上传题目图片'}
              </span>
              <span className="text-xs text-[#7a6d62]">支持 PNG / JPG，尽量保持画面清晰、居中</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                      setImageDataUrl(result);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>

            <label className="block">
              <span className="workspace-label">题目说明</span>
              <textarea
                rows={5}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：面向八年级学生，讲清 3x + 5 = 20 的移项思路，并提醒最容易出错的步骤。"
                className="workspace-textarea"
              />
            </label>

            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            {savedMessage ? <p className="text-sm font-medium text-emerald-700">{savedMessage}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="workspace-primary-btn"
                disabled={loading}
                onClick={handleGenerate}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成视频
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    生成讲解视频
                  </>
                )}
              </button>

              <button type="button" className="workspace-secondary-btn" onClick={handleSaveManually}>
                <Save className="h-4 w-4" />
                保存到错题本
              </button>
            </div>
          </div>
        </section>

        <section className="workspace-panel">
          <h2 className="text-lg font-semibold text-[#2b241e]">预览区</h2>

          <div className="mt-4 space-y-4">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="题目预览" className="workspace-preview-image" />
            ) : (
              <div className="workspace-empty-box">上传后的题目图片会显示在这里。</div>
            )}

            {videoUrl ? (
              <video src={videoUrl} controls className="workspace-preview-video" />
            ) : (
              <div className="workspace-empty-box">生成完成后，讲解视频会显示在这里。</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
