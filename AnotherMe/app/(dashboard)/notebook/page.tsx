'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  FileCode2,
  FileText,
  FolderTree,
  ImagePlus,
  ListTree,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import {
  deleteNotebookNote,
  NotebookNote,
  readNotebookNotes,
  upsertNotebookNote,
} from '@/lib/notebook/storage';
import { cn } from '@/lib/utils';

interface NoteDraft {
  title: string;
  subject: string;
  tags: string;
  content: string;
}

interface ThemeOption {
  id: 'paper' | 'academic' | 'night';
  label: string;
  canvasClass: string;
  articleClass: string;
  toneClass: string;
}

interface HeadingItem {
  level: number;
  text: string;
  slug: string;
}

interface SlashCommandItem {
  id: string;
  label: string;
  aliases: string[];
  snippet: string;
}

const NOTEBOOK_THEME_KEY = 'anotherme:notebook:theme:v1';
const EMPTY_DRAFT: NoteDraft = { title: '', subject: '综合', tags: '', content: '' };
const SLASH_COMMANDS: SlashCommandItem[] = [
  { id: 'h1', label: '一级标题', aliases: ['h1', 'title'], snippet: '# 标题' },
  { id: 'h2', label: '二级标题', aliases: ['h2', 'subtitle'], snippet: '## 小节' },
  { id: 'todo', label: '待办列表', aliases: ['todo', 'task'], snippet: '- [ ] 待办事项' },
  { id: 'quote', label: '引用', aliases: ['quote', 'blockquote'], snippet: '> 这里是引用内容' },
  {
    id: 'code',
    label: '代码块',
    aliases: ['code', '```'],
    snippet: '```ts\nconsole.log("hello")\n```',
  },
  {
    id: 'table',
    label: '表格',
    aliases: ['table', 'tbl'],
    snippet: '| 字段 | 说明 |\n| --- | --- |\n| 项目 | 描述 |',
  },
  {
    id: 'math',
    label: '公式块',
    aliases: ['math', 'latex'],
    snippet: '$$\nE = mc^2\n$$',
  },
];

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'paper',
    label: 'Paper',
    canvasClass: 'bg-[#f2f0eb]',
    articleClass: 'text-[#2f2a24]',
    toneClass: 'text-[#6f665c]',
  },
  {
    id: 'academic',
    label: 'Academic',
    canvasClass: 'bg-[#eef1f6]',
    articleClass: 'text-[#27364d]',
    toneClass: 'text-[#5f708c]',
  },
  {
    id: 'night',
    label: 'Night',
    canvasClass: 'bg-[#171c24]',
    articleClass: 'text-[#e5ebf6]',
    toneClass: 'text-[#8ea2c2]',
  },
];

function toDraft(note: NotebookNote): NoteDraft {
  return {
    title: note.title,
    subject: note.subject,
    tags: note.tags.join(', '),
    content: note.content,
  };
}

function splitTags(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitMarkdownBlocks(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim()) return [''];

  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let inCodeFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isFence = /^(```|~~~)/.test(trimmed);

    if (isFence) {
      inCodeFence = !inCodeFence;
      current.push(line);
      return;
    }

    if (!inCodeFence && trimmed === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
        current = [];
      }
      return;
    }

    current.push(line);
  });

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks.length > 0 ? blocks : [''];
}

function joinMarkdownBlocks(blocks: string[]): string {
  const compact = blocks.map((block) => block.replace(/\s+$/g, '')).filter((block) => block !== '');
  return compact.join('\n\n');
}

function getHeadingText(line: string): { level: number; text: string } | null {
  const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
  if (!match) return null;
  return { level: match[1].length, text: match[2].trim() };
}

function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractHeadings(markdown: string): HeadingItem[] {
  const counts = new Map<string, number>();
  return markdown
    .split('\n')
    .map(getHeadingText)
    .filter((item): item is { level: number; text: string } => item !== null)
    .map((item) => {
      const base = slugifyHeading(item.text) || 'section';
      const current = counts.get(base) || 0;
      counts.set(base, current + 1);
      const slug = current === 0 ? base : `${base}-${current + 1}`;
      return { ...item, slug };
    });
}

function flattenText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((item) => flattenText(item)).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return flattenText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

function buildExportHtml(title: string, articleHtml: string, theme: ThemeOption): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title || '笔记本导出'}</title>
  <style>
    body { margin: 0; padding: 32px; font-family: "PingFang SC","Microsoft YaHei UI",sans-serif; line-height: 1.8; }
    .doc { max-width: 860px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 28px; }
    h1,h2,h3,h4,h5,h6 { margin-top: 1.3em; margin-bottom: 0.5em; }
    pre { background: #111827; color: #e5e7eb; border-radius: 8px; padding: 14px; overflow: auto; }
    code { font-family: "Sarasa Mono SC","Consolas",monospace; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th,td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    blockquote { margin: 0; padding: 0 14px; border-left: 4px solid #9ca3af; color: #4b5563; }
    img { max-width: 100%; border-radius: 8px; }
    .meta { color: #6b7280; margin-bottom: 16px; font-size: 13px; }
    .theme { margin-left: 8px; }
  </style>
</head>
<body>
  <article class="doc">
    <div class="meta">导出自笔记本<span class="theme">主题：${theme.label}</span></div>
    ${articleHtml}
  </article>
</body>
</html>`;
}

function autoGrowTextarea(node: HTMLTextAreaElement | null): void {
  if (!node) return;
  node.style.height = '0px';
  node.style.height = `${Math.max(76, node.scrollHeight)}px`;
}

export default function DashboardNotebookPage() {
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
  const [search, setSearch] = useState('');
  const [themeId, setThemeId] = useState<ThemeOption['id']>('paper');
  const [showToc, setShowToc] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [statusText, setStatusText] = useState('本地模式 · 自动保存已开启');
  const [editingIndex, setEditingIndex] = useState(0);
  const [blockDraft, setBlockDraft] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const createNewNoteRef = useRef<() => void>(() => {});
  const forceSaveRef = useRef<() => void>(() => {});

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );
  const theme = useMemo(
    () => THEME_OPTIONS.find((item) => item.id === themeId) ?? THEME_OPTIONS[0],
    [themeId],
  );

  const blocks = useMemo(() => splitMarkdownBlocks(draft.content), [draft.content]);
  const liveBlocks = useMemo(() => {
    const next = [...blocks];
    if (next.length === 0) {
      return [blockDraft];
    }
    if (editingIndex >= 0 && editingIndex < next.length) {
      next[editingIndex] = blockDraft;
    }
    return next;
  }, [blocks, editingIndex, blockDraft]);
  const liveContent = useMemo(() => joinMarkdownBlocks(liveBlocks), [liveBlocks]);
  const headings = useMemo(() => extractHeadings(liveContent), [liveContent]);
  const slashQuery = useMemo(() => {
    const trimmed = blockDraft.trim();
    const match = /^\/([a-zA-Z0-9-]*)$/.exec(trimmed);
    return match ? match[1].toLowerCase() : null;
  }, [blockDraft]);
  const slashMatches = useMemo(() => {
    if (slashQuery === null) return [];
    if (!slashQuery) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (item) =>
        item.id.includes(slashQuery) ||
        item.label.toLowerCase().includes(slashQuery) ||
        item.aliases.some((alias) => alias.includes(slashQuery)),
    );
  }, [slashQuery]);

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return notes;
    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(keyword) ||
        note.subject.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword)
      );
    });
  }, [notes, search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hydratedNotes = readNotebookNotes();
    setNotes(hydratedNotes);

    if (hydratedNotes.length > 0) {
      const first = hydratedNotes[0];
      setSelectedId(first.id);
      setDraft(toDraft(first));
      setEditingIndex(0);
    } else {
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      setEditingIndex(0);
    }

    const storedTheme = window.localStorage.getItem(NOTEBOOK_THEME_KEY);
    if (storedTheme === 'academic' || storedTheme === 'night') {
      setThemeId(storedTheme);
    } else {
      setThemeId('paper');
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated) return;
    window.localStorage.setItem(NOTEBOOK_THEME_KEY, themeId);
  }, [hasHydrated, themeId]);

  useEffect(() => {
    const fallback = blocks[editingIndex] ?? '';
    setBlockDraft(fallback);
  }, [editingIndex, blocks]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      const saved = upsertNotebookNote({
        id: selectedId,
        title: draft.title,
        content: liveContent,
        subject: draft.subject,
        tags: splitTags(draft.tags),
        source: selectedNote?.source || 'manual',
        stageId: selectedNote?.stageId,
        sceneId: selectedNote?.sceneId,
      });
      const latest = readNotebookNotes();
      setNotes(latest);
      if (saved.id !== selectedId) setSelectedId(saved.id);
      setStatusText(`已自动保存 · ${new Date().toLocaleTimeString('zh-CN')}`);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    draft.subject,
    draft.tags,
    draft.title,
    liveContent,
    selectedId,
    selectedNote?.sceneId,
    selectedNote?.source,
    selectedNote?.stageId,
  ]);

  const refreshFromStorage = (nextSelectedId?: string | null) => {
    const latest = readNotebookNotes();
    setNotes(latest);
    const target = latest.find((item) => item.id === (nextSelectedId || latest[0]?.id));
    if (target) {
      setSelectedId(target.id);
      setDraft(toDraft(target));
      setEditingIndex(0);
      return;
    }
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setEditingIndex(0);
  };

  const switchNote = (note: NotebookNote) => {
    setSelectedId(note.id);
    setDraft(toDraft(note));
    setEditingIndex(0);
    setStatusText('已切换文稿');
  };

  const createNewNote = () => {
    const created = upsertNotebookNote({
      title: '未命名文稿',
      content: '',
      subject: '综合',
      tags: ['草稿'],
      source: 'manual',
    });
    refreshFromStorage(created.id);
    setStatusText('已创建新文稿');
  };

  const removeCurrentNote = () => {
    if (!selectedId) return;
    deleteNotebookNote(selectedId);
    refreshFromStorage();
    setStatusText('已删除文稿');
  };

  const commitBlock = (index: number, value: string) => {
    const nextBlocks = [...blocks];
    nextBlocks[index] = value;
    setDraft((prev) => ({ ...prev, content: joinMarkdownBlocks(nextBlocks) }));
  };

  const appendBlock = (value = '') => {
    const next = [...blocks, value];
    setDraft((prev) => ({ ...prev, content: joinMarkdownBlocks(next) }));
    setEditingIndex(next.length - 1);
    setBlockDraft(value);
  };

  const applySlashCommand = (command: SlashCommandItem) => {
    setBlockDraft(command.snippet);
    setStatusText(`已插入 /${command.id}`);
    requestAnimationFrame(() => {
      const textarea = editingTextareaRef.current;
      if (!textarea) return;
      autoGrowTextarea(textarea);
      textarea.focus();
      const cursor = command.snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const updateBlockDraftWithSelection = (
    transform: (value: string, start: number, end: number) => {
      nextValue: string;
      selectionStart: number;
      selectionEnd: number;
    },
  ) => {
    const textarea = editingTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const { nextValue, selectionStart, selectionEnd } = transform(blockDraft, start, end);
    setBlockDraft(nextValue);

    requestAnimationFrame(() => {
      const target = editingTextareaRef.current;
      if (!target) return;
      autoGrowTextarea(target);
      target.focus();
      target.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const toggleInlineWrap = (marker: string) => {
    updateBlockDraftWithSelection((value, start, end) => {
      const selected = value.slice(start, end);
      const wrapped = `${marker}${selected}${marker}`;
      return {
        nextValue: `${value.slice(0, start)}${wrapped}${value.slice(end)}`,
        selectionStart: start + marker.length,
        selectionEnd: end + marker.length,
      };
    });
  };

  const indentSelectedLines = (direction: 'in' | 'out') => {
    updateBlockDraftWithSelection((value, start, end) => {
      const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEnd = value.indexOf('\n', end);
      const safeLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const segment = value.slice(lineStart, safeLineEnd);
      const lines = segment.split('\n');
      const nextLines =
        direction === 'in'
          ? lines.map((line) => `  ${line}`)
          : lines.map((line) => (line.startsWith('  ') ? line.slice(2) : line.replace(/^ /, '')));
      const replaced = nextLines.join('\n');
      const nextValue = `${value.slice(0, lineStart)}${replaced}${value.slice(safeLineEnd)}`;
      const delta = replaced.length - segment.length;
      return {
        nextValue,
        selectionStart: start + (direction === 'in' ? 2 : Math.max(-2, delta)),
        selectionEnd: end + delta,
      };
    });
  };

  const insertImageMarkdown = (imageName: string, url: string) => {
    const line = `![${imageName || 'image'}](${url})`;
    if (liveBlocks.length === 0) {
      setDraft((prev) => ({ ...prev, content: line }));
      setEditingIndex(0);
      setBlockDraft(line);
      return;
    }

    const nextBlocks = [...liveBlocks];
    const targetIndex = Math.min(editingIndex, nextBlocks.length - 1);
    const prefix = nextBlocks[targetIndex] ? `${nextBlocks[targetIndex]}\n\n` : '';
    nextBlocks[targetIndex] = `${prefix}${line}`;
    setDraft((prev) => ({ ...prev, content: joinMarkdownBlocks(nextBlocks) }));
    setEditingIndex(targetIndex);
    setBlockDraft(nextBlocks[targetIndex]);
    setStatusText('已插入图片');
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setStatusText('图片插入失败');
        return;
      }
      insertImageMarkdown(file.name, result);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteFromClipboard = async () => {
    if (typeof navigator === 'undefined') return;

    if (navigator.clipboard && 'read' in navigator.clipboard) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `clipboard-${Date.now()}.png`, { type: imageType });
            handleImageFile(file);
            return;
          }
        }
      } catch {
        // fall through text read
      }
    }

    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
          setStatusText('剪贴板为空');
          return;
        }
        if (editingTextareaRef.current) {
          updateBlockDraftWithSelection((value, start, end) => ({
            nextValue: `${value.slice(0, start)}${text}${value.slice(end)}`,
            selectionStart: start + text.length,
            selectionEnd: start + text.length,
          }));
        } else {
          const nextBlocks = [...liveBlocks];
          const targetIndex = Math.min(editingIndex, nextBlocks.length - 1);
          if (targetIndex < 0) {
            setDraft((prev) => ({ ...prev, content: text }));
            setEditingIndex(0);
            setBlockDraft(text);
            return;
          }
          nextBlocks[targetIndex] = `${nextBlocks[targetIndex] || ''}${text}`;
          setDraft((prev) => ({ ...prev, content: joinMarkdownBlocks(nextBlocks) }));
          setEditingIndex(targetIndex);
          setBlockDraft(nextBlocks[targetIndex]);
        }
        setStatusText('已粘贴文本');
      } catch {
        setStatusText('读取剪贴板失败');
      }
    }
  };

  const forceSave = () => {
    const saved = upsertNotebookNote({
      id: selectedId || undefined,
      title: draft.title,
      content: liveContent,
      subject: draft.subject,
      tags: splitTags(draft.tags),
      source: selectedNote?.source || 'manual',
      stageId: selectedNote?.stageId,
      sceneId: selectedNote?.sceneId,
    });
    refreshFromStorage(saved.id);
    setStatusText('已手动保存');
  };

  createNewNoteRef.current = createNewNote;
  forceSaveRef.current = forceSave;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        forceSaveRef.current();
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        createNewNoteRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    autoGrowTextarea(editingTextareaRef.current);
  }, [blockDraft, editingIndex]);

  const exportHtml = () => {
    if (!articleRef.current) return;
    const content = buildExportHtml(draft.title, articleRef.current.innerHTML, theme);
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${draft.title || 'note'}.html`);
    setStatusText('已导出 HTML');
  };

  const exportWord = () => {
    if (!articleRef.current) return;
    const content = buildExportHtml(draft.title, articleRef.current.innerHTML, theme);
    const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
    saveAs(blob, `${draft.title || 'note'}.doc`);
    setStatusText('已导出 Word');
  };

  const exportPdf = async () => {
    if (!articleRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(articleRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${draft.title || 'note'}.pdf`);
      setStatusText('已导出 PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const fileToneClass = theme.id === 'night' ? 'text-[#8ea2c2]' : 'text-[#6f665c]';
  const asideBgClass =
    theme.id === 'night' ? 'bg-[#1a212c] border-[#2d3748] text-[#b9c8de]' : 'bg-[#ece9e3] border-[#d8d1c6] text-[#6b645a]';
  const toolbarButtonClass = cn(
    'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors',
    theme.id === 'night' ? 'text-[#b8c9e4] hover:text-white' : 'text-[#655e54] hover:text-[#1f1c18]',
  );
  const charCount = liveContent.trim().length;

  return (
    <div className={cn('-m-8 min-h-[calc(100vh-4rem)]', theme.canvasClass)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImageFile(file);
          event.currentTarget.value = '';
        }}
      />

      <div
        className={cn(
          'mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1440px]',
          focusMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[220px_1fr]',
        )}
      >
        {!focusMode && (
          <aside className={cn('border-r px-5 py-8', asideBgClass)}>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
              <FolderTree className="h-3.5 w-3.5" />
              文稿
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索"
              className={cn(
                'mb-4 h-8 w-full border-b bg-transparent px-0 text-xs outline-none',
                theme.id === 'night'
                  ? 'border-[#3a475b] text-[#d9e3f2] placeholder:text-[#8091ab]'
                  : 'border-[#cbc1b1] text-[#403a33] placeholder:text-[#928776]',
              )}
            />
            <div className="max-h-[34vh] space-y-0.5 overflow-y-auto">
              {filteredNotes.length > 0 ? (
                filteredNotes.map((note) => {
                  const active = note.id === selectedId;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => switchNote(note)}
                      className={cn(
                        'block w-full truncate px-2 py-1.5 text-left text-[12px] transition-colors',
                        active
                          ? theme.id === 'night'
                            ? 'bg-[#263245] text-[#edf3ff]'
                            : 'bg-[#e1dad0] text-[#1f1c18]'
                          : theme.id === 'night'
                            ? 'text-[#b7c5dc] hover:bg-[#232d3c]'
                            : 'text-[#5b544a] hover:bg-[#e7e2d9]',
                      )}
                    >
                      {note.title || '未命名文稿'}
                    </button>
                  );
                })
              ) : (
                <p className="px-2 py-1 text-[11px] opacity-75">暂无文稿</p>
              )}
            </div>

            <div className={cn('mt-8 border-t pt-4', theme.id === 'night' ? 'border-[#334156]' : 'border-[#d2c9ba]')}>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em]">
                <span className="inline-flex items-center gap-2">
                  <ListTree className="h-3.5 w-3.5" />
                  大纲
                </span>
                <button
                  type="button"
                  onClick={() => setShowToc((prev) => !prev)}
                  className="text-[10px] normal-case tracking-normal opacity-80"
                >
                  {showToc ? '隐藏' : '显示'}
                </button>
              </div>
              {showToc && (
                <div className="max-h-[34vh] space-y-0.5 overflow-y-auto">
                  {headings.length > 0 ? (
                    headings.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => {
                          const node = document.getElementById(item.slug);
                          node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={cn(
                          'block w-full truncate py-1 text-left text-[12px] opacity-90 transition-opacity hover:opacity-100',
                          theme.id === 'night' ? 'text-[#b8c8de]' : 'text-[#5f584d]',
                        )}
                        style={{ paddingLeft: `${(item.level - 1) * 12 + 6}px` }}
                      >
                        {item.text}
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1 text-[11px] opacity-75">使用 `#` / `##` 生成目录</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="min-w-0 px-6 py-8 md:px-14 md:py-10">
          <div className="mx-auto max-w-[820px]">
            <div className={cn('mb-5 flex items-center justify-between text-xs', fileToneClass)}>
              <div className="inline-flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Typora 模式 · 极简留白 · 本地写作
              </div>
              <span>{charCount} 字符</span>
            </div>

            <div
              className={cn(
                'mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-3',
                theme.id === 'night' ? 'border-[#344055]' : 'border-[#d4cbbe]',
              )}
            >
              <button type="button" onClick={forceSave} className={toolbarButtonClass}>
                <Save className="h-3.5 w-3.5" />
                保存
              </button>
              <button type="button" onClick={handlePasteFromClipboard} className={toolbarButtonClass}>
                <FileText className="h-3.5 w-3.5" />
                粘贴
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={toolbarButtonClass}>
                <ImagePlus className="h-3.5 w-3.5" />
                图片
              </button>
              <button type="button" onClick={createNewNote} className={toolbarButtonClass}>
                <Plus className="h-3.5 w-3.5" />
                新建
              </button>
              <button
                type="button"
                onClick={() => setFocusMode((prev) => !prev)}
                className={toolbarButtonClass}
              >
                {focusMode ? '退出专注' : '专注'}
              </button>
              <button
                type="button"
                onClick={removeCurrentNote}
                disabled={!selectedId}
                className={cn(toolbarButtonClass, 'disabled:opacity-40')}
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
              <span className="mx-1 h-3.5 w-px bg-current/20" />
              <button type="button" onClick={exportHtml} className={toolbarButtonClass}>
                <Download className="h-3.5 w-3.5" />
                HTML
              </button>
              <button type="button" onClick={exportWord} className={toolbarButtonClass}>
                <Download className="h-3.5 w-3.5" />
                Word
              </button>
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={exportPdf}
                className={cn(toolbarButtonClass, 'disabled:opacity-50')}
              >
                <Download className="h-3.5 w-3.5" />
                {isExportingPdf ? '导出中' : 'PDF'}
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="无标题文稿"
                className={cn(
                  'h-12 w-full border-b bg-transparent px-0 text-[44px] leading-none font-semibold outline-none md:text-[48px]',
                  theme.id === 'night'
                    ? 'border-[#3b4659] text-[#f1f5ff] placeholder:text-[#7f8faa]'
                    : 'border-[#d3cabc] text-[#2f2a24] placeholder:text-[#a1988a]',
                )}
              />

              <div className={cn('flex flex-wrap items-center gap-3 text-xs', fileToneClass)}>
                <input
                  value={draft.subject}
                  onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="科目"
                  className={cn(
                    'h-7 min-w-[110px] border-b bg-transparent px-0 outline-none',
                    theme.id === 'night' ? 'border-[#3a4659]' : 'border-[#d2c8b9]',
                  )}
                />
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="标签（逗号）"
                  className={cn(
                    'h-7 min-w-[210px] flex-1 border-b bg-transparent px-0 outline-none',
                    theme.id === 'night' ? 'border-[#3a4659]' : 'border-[#d2c8b9]',
                  )}
                />
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeId('paper')}
                    className={cn('opacity-60 hover:opacity-100', themeId === 'paper' && 'opacity-100')}
                    title="Paper"
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeId('academic')}
                    className={cn('opacity-60 hover:opacity-100', themeId === 'academic' && 'opacity-100')}
                    title="Academic"
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeId('night')}
                    className={cn('opacity-60 hover:opacity-100', themeId === 'night' && 'opacity-100')}
                    title="Night"
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <article
              ref={articleRef}
              className={cn(
                'prose prose-sm max-w-none',
                theme.id === 'night' && 'prose-invert',
                theme.articleClass,
              )}
            >
              {blocks.map((block, index) => {
                const isEditing = index === editingIndex;
                const current = isEditing ? blockDraft : block;
                return (
                  <section key={`${index}-${block.slice(0, 18)}`} className="group mb-2">
                    {isEditing ? (
                      <div className="relative">
                        <textarea
                          ref={editingTextareaRef}
                          value={current}
                          rows={1}
                          autoFocus
                          onChange={(event) => {
                            setBlockDraft(event.target.value);
                            autoGrowTextarea(event.currentTarget);
                          }}
                          onBlur={() => commitBlock(index, blockDraft)}
                          onKeyDown={(event) => {
                            const hasMeta = event.metaKey || event.ctrlKey;
                            const key = event.key.toLowerCase();

                            if (slashQuery !== null && event.key === 'Enter') {
                              event.preventDefault();
                              const firstMatch = slashMatches[0];
                              if (firstMatch) {
                                applySlashCommand(firstMatch);
                              } else {
                                setStatusText('未找到对应 / 命令');
                              }
                              return;
                            }

                            if (hasMeta && key === 'b') {
                              event.preventDefault();
                              toggleInlineWrap('**');
                              return;
                            }

                            if (hasMeta && key === 'i') {
                              event.preventDefault();
                              toggleInlineWrap('*');
                              return;
                            }

                            if (event.key === 'Tab') {
                              event.preventDefault();
                              indentSelectedLines(event.shiftKey ? 'out' : 'in');
                              return;
                            }

                            if (event.key === 'Escape') {
                              setBlockDraft(block);
                              return;
                            }

                            if (hasMeta && key === 'enter') {
                              event.preventDefault();
                              commitBlock(index, blockDraft);
                              if (index === blocks.length - 1) {
                                appendBlock('');
                              } else {
                                setEditingIndex(index + 1);
                              }
                            }
                          }}
                          placeholder="输入 Markdown 内容...（支持 / 命令、Ctrl/Cmd+B/I、Tab 缩进）"
                          className={cn(
                            'min-h-[76px] w-full resize-none overflow-hidden border-l border-dashed bg-transparent pl-3 text-[15px] leading-7 outline-none',
                            theme.id === 'night'
                              ? 'border-[#3c4a62] text-[#e6edf9]'
                              : 'border-[#d2c6b6] text-[#2c2823]',
                          )}
                        />
                        {slashQuery !== null && (
                          <div
                            className={cn(
                              'absolute left-6 top-2 z-20 w-56 border p-1 text-xs shadow-lg',
                              theme.id === 'night'
                                ? 'border-[#3a4760] bg-[#202938] text-[#dce6f6]'
                                : 'border-[#d8cfc2] bg-[#faf8f4] text-[#3c342b]',
                            )}
                          >
                            {slashMatches.length > 0 ? (
                              slashMatches.slice(0, 7).map((command) => (
                                <button
                                  key={command.id}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applySlashCommand(command);
                                  }}
                                  className={cn(
                                    'flex w-full items-center justify-between px-2 py-1 text-left transition-colors',
                                    theme.id === 'night'
                                      ? 'hover:bg-[#2a364b]'
                                      : 'hover:bg-[#ece6dc]',
                                  )}
                                >
                                  <span>{command.label}</span>
                                  <span className="opacity-60">/{command.id}</span>
                                </button>
                              ))
                            ) : (
                              <p className="px-2 py-1 opacity-70">无匹配命令</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        className="w-full py-1 text-left transition hover:opacity-90"
                      >
                        {block.trim() ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              h1: ({ children }) => (
                                <h1 id={slugifyHeading(flattenText(children))}>{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 id={slugifyHeading(flattenText(children))}>{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 id={slugifyHeading(flattenText(children))}>{children}</h3>
                              ),
                              code: ({ className, children }) => {
                                const isInline = !className;
                                if (isInline) {
                                  return (
                                    <code className="rounded-sm bg-black/8 px-1.5 py-0.5 text-[13px]">
                                      {children}
                                    </code>
                                  );
                                }
                                return <code className={className}>{children}</code>;
                              },
                            }}
                          >
                            {block}
                          </ReactMarkdown>
                        ) : (
                          <p className={cn('my-0 text-sm italic', fileToneClass)}>点击开始输入...</p>
                        )}
                      </button>
                    )}
                  </section>
                );
              })}
              <button
                type="button"
                onClick={() => appendBlock('')}
                className={cn('mt-2 py-1 text-xs font-medium hover:opacity-90', fileToneClass)}
              >
                + 新增段落
              </button>
            </article>

            <p className={cn('mt-8 text-xs', fileToneClass)}>
              {statusText}。本页仅写入浏览器本地存储，不涉及团队协作或在线数据库。
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
