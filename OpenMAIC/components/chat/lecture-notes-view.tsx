'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Copy, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import type { Scene } from '@/lib/types/stage';
import type { SpeechAction } from '@/lib/types/action';
import type {
  PPTElement,
  PPTLatexElement,
  PPTShapeElement,
  PPTTableElement,
  PPTTextElement,
} from '@/lib/types/slides';
import { removeKnowledgeCardNote, upsertKnowledgeCardNote } from '@/lib/notebook/storage';

const STORAGE_PREFIX = 'anotherme:classroom:saved-knowledge-cards:v1';

interface LectureNotesViewProps {
  scenes: Scene[];
  currentSceneId?: string | null;
  stageId?: string | null;
}

interface KnowledgeSection {
  sceneId: string;
  title: string;
  bullets: string[];
}

interface SavedKnowledgeCards {
  [sceneId: string]: {
    saved: boolean;
    savedAt: number;
    noteId?: string;
  };
}

function stripHtml(value: string): string {
  if (!value) return '';

  if (typeof window === 'undefined') {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .trim();
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${value}</div>`, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

function normalizeText(value: string): string {
  return stripHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:;!?])/g, '$1')
    .trim();
}

function countPunctuation(value: string): number {
  const matches = value.match(/[，,。！？!?；;]/g);
  return matches ? matches.length : 0;
}

function simplifyKnowledgeLine(value: string): string {
  const line = normalizeText(value);
  if (!line) return '';
  if (line.length <= 42) return line;

  const firstSentence = line.split(/[。！？!?；;]/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 6 && firstSentence.length <= 42) {
    return firstSentence;
  }

  return `${line.slice(0, 40).trimEnd()}…`;
}

function isUsefulLine(value: string): boolean {
  const line = normalizeText(value);
  if (!line || line.length < 2) return false;
  if (line.length > 120) return false;
  if (countPunctuation(line) > 4) return false;
  if (/^[\d\s()./-]+$/.test(line)) return false;
  return true;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of lines) {
    const line = simplifyKnowledgeLine(raw);
    const key = line.toLowerCase();
    if (!isUsefulLine(line) || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result;
}

function extractSpeechKnowledge(scene: Scene): string[] {
  const speechLines = (scene.actions ?? [])
    .filter((action): action is SpeechAction => {
      return (
        action.type === 'speech' &&
        typeof (action as { text?: unknown }).text === 'string' &&
        Boolean((action as { text?: string }).text)
      );
    })
    .flatMap((action) => action.text.split(/[\n。！？!?；;]/))
    .map(simplifyKnowledgeLine);

  return dedupeLines(speechLines).slice(0, 4);
}

function extractElementText(element: PPTElement): string[] {
  switch (element.type) {
    case 'text': {
      const text = element as PPTTextElement;
      if (
        text.textType === 'partNumber' ||
        text.textType === 'itemNumber' ||
        text.textType === 'footer'
      ) {
        return [];
      }
      return text.content.split(/\n+/).map(normalizeText).filter(Boolean);
    }
    case 'shape': {
      const shape = element as PPTShapeElement;
      return shape.text?.content ? shape.text.content.split(/\n+/).map(normalizeText).filter(Boolean) : [];
    }
    case 'table': {
      const table = element as PPTTableElement;
      return table.data
        .map((row) => row.map((cell) => normalizeText(cell.text)).filter(Boolean).join(' | '))
        .filter(Boolean);
    }
    case 'latex': {
      const latex = element as PPTLatexElement;
      return latex.latex ? [`公式：${latex.latex}`] : [];
    }
    default:
      return [];
  }
}

function extractKnowledge(scene: Scene): string[] {
  if (scene.content.type === 'slide') {
    const title = normalizeText(scene.title).toLowerCase();
    const lines = scene.content.canvas.elements
      .slice()
      .sort((a, b) => a.top - b.top || a.left - b.left)
      .flatMap(extractElementText)
      .filter((line) => normalizeText(line).toLowerCase() !== title);

    const deduped = dedupeLines(lines);
    const concise = deduped.filter(
      (line) => line.length <= 36 || /^[^\s]{1,18}[:：]/.test(line),
    );
    const selected = concise.length >= 3 ? concise : deduped.filter((line) => line.length <= 60);

    const fromSlide = selected.slice(0, 6);
    if (fromSlide.length > 0) {
      return fromSlide;
    }

    return extractSpeechKnowledge(scene);
  }

  if (scene.content.type === 'quiz') {
    const fromQuiz = dedupeLines(
      scene.content.questions.flatMap((question, index) => [
        `题目 ${index + 1}：${question.question}`,
        question.analysis ? `解析：${question.analysis}` : '',
      ]),
    ).slice(0, 5);

    if (fromQuiz.length > 0) {
      return fromQuiz;
    }

    return extractSpeechKnowledge(scene);
  }

  if (scene.content.type === 'interactive') {
    const fromInteractive = dedupeLines([
      scene.title,
      scene.content.url ? `互动页面：${scene.content.url}` : '',
      scene.content.html ? stripHtml(scene.content.html).slice(0, 120) : '',
    ]).slice(0, 4);

    if (fromInteractive.length > 0) {
      return fromInteractive;
    }

    return extractSpeechKnowledge(scene);
  }

  if (scene.content.type === 'pbl') {
    const fromPbl = dedupeLines([
      scene.content.projectConfig.projectInfo.title,
      scene.content.projectConfig.projectInfo.description,
      ...scene.content.projectConfig.issueboard.issues
        .slice(0, 3)
        .map((issue, index) => `任务 ${index + 1}：${issue.title}`),
    ]).slice(0, 5);

    if (fromPbl.length > 0) {
      return fromPbl;
    }

    return extractSpeechKnowledge(scene);
  }

  return extractSpeechKnowledge(scene);
}

function buildKnowledgeSections(scenes: Scene[]): KnowledgeSection[] {
  return scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      sceneId: scene.id,
      title: scene.title,
      bullets: extractKnowledge(scene),
    }))
    .filter((section) => section.bullets.length > 0);
}

function readSavedCardsFromStorage(storageKey: string | null): SavedKnowledgeCards {
  if (!storageKey || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedKnowledgeCards;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function LectureNotesView({ scenes, currentSceneId, stageId }: LectureNotesViewProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const storageKey = useMemo(
    () => (stageId ? `${STORAGE_PREFIX}:${stageId}` : null),
    [stageId],
  );
  const [savedCards, setSavedCards] = useState<SavedKnowledgeCards>(() =>
    readSavedCardsFromStorage(storageKey),
  );
  const referenceRef = useRef<HTMLDivElement>(null);

  const knowledgeSections = useMemo(() => buildKnowledgeSections(scenes), [scenes]);

  // Load saved cards from localStorage
  useEffect(() => {
    if (!storageKey) return;
    const timer = window.setTimeout(() => {
      setSavedCards(readSavedCardsFromStorage(storageKey));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  // Save cards to localStorage
  useEffect(() => {
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(savedCards));
    } catch {
      // Ignore save errors
    }
  }, [savedCards, storageKey]);

  // Scroll to current scene
  useEffect(() => {
    if (!currentSceneId || !referenceRef.current) return;
    const el = referenceRef.current.querySelector(`[data-scene-id="${currentSceneId}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentSceneId]);

  // Toggle save state for a card
  const toggleSave = (sceneId: string) => {
    const target = knowledgeSections.find((section) => section.sceneId === sceneId);
    if (!target) return;

    const stageKey = stageId || 'unknown-stage';
    const wasSaved = Boolean(savedCards[sceneId]?.saved);

    if (wasSaved) {
      removeKnowledgeCardNote(stageKey, sceneId);
      setSavedCards((prev) => ({
        ...prev,
        [sceneId]: {
          ...prev[sceneId],
          saved: false,
          savedAt: Date.now(),
        },
      }));
      return;
    }

    const note = upsertKnowledgeCardNote({
      stageId: stageKey,
      sceneId,
      title: target.title,
      bullets: target.bullets,
    });

    setSavedCards((prev) => ({
      ...prev,
      [sceneId]: {
        saved: true,
        savedAt: Date.now(),
        noteId: note.id,
      },
    }));
  };

  const handleCopyCard = async (section: KnowledgeSection) => {
    const text = [`${section.title}`, ...section.bullets.map((bullet) => `- ${bullet}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSceneId(section.sceneId);
    } catch {
      setCopiedSceneId(null);
    }
  };

  // Copy all knowledge
  const handleCopyAll = async () => {
    const text = knowledgeSections
      .map((section, index) => {
        const lines = [`${index + 1}. ${section.title}`];
        section.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
        return lines.join('\n');
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!copiedSceneId) return;
    const timer = window.setTimeout(() => setCopiedSceneId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [copiedSceneId]);

  if (knowledgeSections.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-3 text-purple-300 dark:text-purple-600 ring-1 ring-purple-100 dark:ring-purple-800/30">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('chat.lectureNotes.empty')}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          {t('chat.lectureNotes.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 scrollbar-hide">
      <div className="mb-3 rounded-xl border border-purple-100/80 bg-purple-50/60 px-3 py-2 dark:border-purple-900/40 dark:bg-purple-950/20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
              课堂知识点
            </p>
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              共 {knowledgeSections.length} 个知识点，收藏后会同步到笔记本
            </p>
          </div>

          <button
            onClick={handleCopyAll}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-purple-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制全部'}
          </button>
        </div>
      </div>

      <div
        ref={referenceRef}
        className="space-y-2"
      >
        {knowledgeSections.map((section, index) => {
          const isCurrent = section.sceneId === currentSceneId;
          const isSaved = savedCards[section.sceneId]?.saved;

          return (
            <div
              key={section.sceneId}
              data-scene-id={section.sceneId}
              className={cn(
                'rounded-xl border border-gray-200/80 bg-white/80 px-4 py-3 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900/60',
                isCurrent
                  ? 'ring-2 ring-purple-300 dark:ring-purple-700'
                  : 'hover:border-purple-200/80 hover:bg-purple-50/40 dark:hover:border-purple-700/40 dark:hover:bg-purple-950/20',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isCurrent
                        ? 'bg-purple-500 dark:bg-purple-400'
                        : 'bg-gray-300 dark:bg-gray-600',
                    )}
                  />
                  <span className="text-[10px] font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                    PPT {index + 1}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                      当前页
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyCard(section)}
                    className={cn(
                      'rounded-lg p-1.5 transition-colors',
                      copiedSceneId === section.sceneId
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800',
                    )}
                    title={copiedSceneId === section.sceneId ? '已复制' : '复制卡片内容'}
                  >
                    {copiedSceneId === section.sceneId ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSave(section.sceneId)}
                    className={cn(
                      'rounded-lg p-1.5 transition-colors',
                      isSaved
                        ? 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800',
                    )}
                    title={isSaved ? '取消收藏' : '收藏到笔记本'}
                  >
                    {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-100 mb-2 pl-4">
                {section.title}
              </h4>

              <div className="pl-4 space-y-1.5">
                {section.bullets.map((bullet) => (
                  <div
                    key={`${section.sceneId}-${bullet}`}
                    className="text-[12px] leading-[1.8] text-gray-700 dark:text-gray-300"
                  >
                    <span className="mr-1">•</span>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                      }}
                    >
                      {bullet}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
