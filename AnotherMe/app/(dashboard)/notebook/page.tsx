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
  Clock,
  Tag,
  FileX,
  Pin,
  Star,
  ArrowUpDown,
  LayoutGrid,
  List,
  RotateCcw,
  Archive,
  Trash,
  X,
  ChevronDown,
  GripVertical,
  FileUp,
  FileDown,
  CheckSquare,
  Square,
  MoreHorizontal,
  Search,
  FileJson,
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
  toggleNotePin,
  toggleNoteFavorite,
  readNotebookSettings,
  saveNotebookSettings,
  sortNotes,
  groupNotesBySubject,
  readTrashNotes,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  clearTrash,
  createNoteFromTemplate,
  NOTE_TEMPLATES,
  batchDeleteNotes,
  exportAllNotes,
  importNotes,
  searchNotesWithHighlight,
  type NoteSortOption,
  type NotebookSettings,
  type DeletedNote,
  type NoteTemplate,
} from '@/lib/notebook/storage';
import { cn } from '@/lib/utils';
import { recordLearningEvent } from '@/lib/learning-events/client';

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

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getNotePreview(content: string, maxLength = 60): string {
  const plain = content
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/\[.*?\]\(.*?\)/g, '$1')
    .replace(/[#*`~>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '无内容';
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    '数学': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    '物理': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    '化学': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    '英语': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    '语文': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    '历史': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    '地理': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    '生物': 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
    '课堂': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    '综合': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return colors[subject] || colors['综合'];
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
  const [focusMode, setFocusMode] = useState(false);
  const [statusText, setStatusText] = useState('本地模式 · 自动保存已开启');
  const [editingIndex, setEditingIndex] = useState(0);
  const [blockDraft, setBlockDraft] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // New UX features
  const [settings, setSettings] = useState<NotebookSettings>({
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    viewMode: 'list',
  });
  const [showTrash, setShowTrash] = useState(false);
  const [trashNotes, setTrashNotes] = useState<DeletedNote[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  
  // Batch operations
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [importExportMenuOpen, setImportExportMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchNotesWithHighlight>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const createNewNoteRef = useRef<() => void>(() => {});
  const forceSaveRef = useRef<() => void>(() => {});
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);
  const importExportRef = useRef<HTMLDivElement | null>(null);
  const fileImportRef = useRef<HTMLInputElement | null>(null);

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

  const filteredAndSortedNotes = useMemo(() => {
    let result = notes;
    
    // Apply search filter
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      result = result.filter((note) => {
        return (
          note.title.toLowerCase().includes(keyword) ||
          note.subject.toLowerCase().includes(keyword) ||
          note.content.toLowerCase().includes(keyword) ||
          note.tags.some((tag) => tag.toLowerCase().includes(keyword))
        );
      });
    }
    
    // Apply sorting
    return sortNotes(result, settings.sortBy, settings.sortOrder);
  }, [notes, search, settings.sortBy, settings.sortOrder]);

  const groupedNotes = useMemo(() => {
    return groupNotesBySubject(filteredAndSortedNotes);
  }, [filteredAndSortedNotes]);

  const noteStats = useMemo(() => {
    const totalNotes = notes.length;
    const totalWords = notes.reduce((sum, note) => sum + note.content.length, 0);
    const pinnedCount = notes.filter((n) => n.isPinned).length;
    const favoriteCount = notes.filter((n) => n.isFavorite).length;
    return { totalNotes, totalWords, pinnedCount, favoriteCount };
  }, [notes]);

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

    // Load settings
    const loadedSettings = readNotebookSettings();
    setSettings(loadedSettings);
    
    // Load trash
    setTrashNotes(readTrashNotes());

    setHasHydrated(true);
  }, []);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle when not in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const currentList = showTrash ? trashNotes : filteredAndSortedNotes;
        if (currentList.length === 0) return;
        
        const currentIndex = currentList.findIndex((n) => n.id === selectedId);
        let nextIndex: number;
        
        if (event.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? currentList.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= currentList.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextNote = currentList[nextIndex];
        if (nextNote) {
          if (showTrash) {
            setSelectedId(nextNote.id);
            setDraft(toDraft(nextNote as NotebookNote));
          } else {
            switchNote(nextNote);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredAndSortedNotes, trashNotes, selectedId, showTrash]);

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
    void recordLearningEvent({
      eventType: 'notebook_saved',
      knowledgePoints: ['未命名文稿'],
      payload: {
        subject: '综合',
        title: created.title,
        note_id: created.id,
        source: created.source,
      },
      weight: 0.4,
    });
    refreshFromStorage(created.id);
    setStatusText('已创建新文稿');
  };

  const removeCurrentNote = () => {
    if (!selectedId) return;
    const deleted = deleteNotebookNote(selectedId);
    if (deleted) {
      setTrashNotes((prev) => [deleted, ...prev].slice(0, 50));
    }
    refreshFromStorage();
    setStatusText('已删除文稿，可在回收站恢复');
  };

  const handlePinNote = (noteId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const updated = toggleNotePin(noteId);
    if (updated) {
      refreshFromStorage(updated.id);
      setStatusText(updated.isPinned ? '已置顶笔记' : '已取消置顶');
    }
  };

  const handleFavoriteNote = (noteId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const updated = toggleNoteFavorite(noteId);
    if (updated) {
      refreshFromStorage(updated.id);
      setStatusText(updated.isFavorite ? '已收藏笔记' : '已取消收藏');
    }
  };

  const handleRestoreFromTrash = (noteId: string) => {
    const restored = restoreFromTrash(noteId);
    if (restored) {
      setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
      refreshFromStorage(restored.id);
      setStatusText('已恢复笔记');
    }
  };

  const handlePermanentDelete = (noteId: string) => {
    if (permanentlyDeleteFromTrash(noteId)) {
      setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedId === noteId) {
        setSelectedId(null);
        setDraft(EMPTY_DRAFT);
      }
      setStatusText('已永久删除');
    }
  };

  const handleClearTrash = () => {
    clearTrash();
    setTrashNotes([]);
    if (showTrash) {
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
    }
    setStatusText('已清空回收站');
  };

  const updateSettings = (newSettings: Partial<NotebookSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveNotebookSettings(updated);
  };

  // Drag and drop for blocks
  const handleBlockDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleBlockDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
  };

  const handleBlockDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    
    setDraft((prev) => ({ ...prev, content: joinMarkdownBlocks(newBlocks) }));
    setEditingIndex(targetIndex);
    setDraggedBlockIndex(null);
    setStatusText('已调整段落顺序');
  };

  // Template functions
  const createNoteWithTemplate = (templateId: string) => {
    const created = createNoteFromTemplate(templateId);
    refreshFromStorage(created.id);
    setShowTemplateSelector(false);
    setStatusText('已从模板创建笔记');
  };

  // Batch operations
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const selectAllNotes = () => {
    setSelectedNoteIds(new Set(filteredAndSortedNotes.map((n) => n.id)));
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const batchDeleteSelected = () => {
    if (selectedNoteIds.size === 0) return;
    const count = batchDeleteNotes(Array.from(selectedNoteIds));
    setTrashNotes(readTrashNotes());
    refreshFromStorage();
    setSelectedNoteIds(new Set());
    setIsBatchMode(false);
    setStatusText(`已批量删除 ${count} 篇笔记`);
  };

  const batchPinSelected = () => {
    if (selectedNoteIds.size === 0) return;
    selectedNoteIds.forEach((id) => {
      const note = notes.find((n) => n.id === id);
      if (note && !note.isPinned) {
        toggleNotePin(id);
      }
    });
    refreshFromStorage();
    setSelectedNoteIds(new Set());
    setIsBatchMode(false);
    setStatusText(`已置顶 ${selectedNoteIds.size} 篇笔记`);
  };

  // Import/Export
  const handleExportJSON = () => {
    const exportData = exportAllNotes();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    saveAs(blob, `anotherme-notes-${new Date().toISOString().split('T')[0]}.json`);
    setImportExportMenuOpen(false);
    setStatusText('已导出笔记数据');
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const exportData = JSON.parse(reader.result as string);
        const result = importNotes(exportData);
        refreshFromStorage();
        setImportExportMenuOpen(false);
        if (result.errors.length > 0) {
          setStatusText(`导入完成: ${result.imported} 成功, ${result.skipped} 跳过, ${result.errors.length} 错误`);
        } else {
          setStatusText(`成功导入 ${result.imported} 篇笔记`);
        }
      } catch {
        setStatusText('导入失败: 无效的文件格式');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Enhanced search
  useEffect(() => {
    if (search.trim()) {
      const results = searchNotesWithHighlight(notes, search);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [search, notes]);

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
    void recordLearningEvent({
      eventType: 'notebook_saved',
      classroomId: saved.stageId,
      sceneId: saved.sceneId,
      knowledgePoints: [saved.title || draft.subject || '笔记复盘'],
      payload: {
        subject: saved.subject || draft.subject || '综合',
        title: saved.title,
        note_id: saved.id,
        source: saved.source,
        tags: saved.tags || [],
        content_length: saved.content.length,
      },
      weight: Math.min(2, Math.max(0.5, saved.content.length / 1000)),
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
      
      {/* Hidden file input for JSON import */}
      <input
        ref={fileImportRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportJSON}
      />
      
      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={createNoteWithTemplate}
        theme={theme}
      />

      <div
        className={cn(
          'mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1440px]',
          focusMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[260px_1fr_200px]',
        )}
      >
        {!focusMode && (
          <aside className={cn('border-r flex flex-col', asideBgClass)}>
            {/* Sidebar Header */}
            <div className="px-4 pt-6 pb-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-semibold opacity-80">
                  <FolderTree className="h-3.5 w-3.5" />
                  {showTrash ? '回收站' : '我的笔记'}
                  <span className="text-[10px] normal-case tracking-normal opacity-60 font-normal">
                    ({showTrash ? trashNotes.length : filteredAndSortedNotes.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!showTrash && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowTemplateSelector(true)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                          theme.id === 'night'
                            ? 'bg-[#263245] text-[#dce6f6] hover:bg-[#2d3d54]'
                            : 'bg-[#e1dad0] text-[#3c342b] hover:bg-[#d5cdc1]',
                        )}
                      >
                        <Plus className="h-3 w-3" />
                        新建
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBatchMode(!isBatchMode)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                          isBatchMode
                            ? theme.id === 'night'
                              ? 'bg-[#3a506e] text-[#dce6f6]'
                              : 'bg-[#c8bdb0] text-[#3c342b]'
                            : theme.id === 'night'
                              ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                              : 'text-[#6b645a] hover:bg-[#e8e4dd]',
                        )}
                        title="批量操作"
                      >
                        <CheckSquare className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Search and Controls */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                    theme.id === 'night' ? 'text-[#5a6d85]' : 'text-[#a0988c]',
                  )} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={showTrash ? '搜索已删除笔记...' : '搜索笔记...'}
                    className={cn(
                      'h-8 w-full rounded-lg border bg-transparent pl-8 pr-3 text-xs outline-none transition-colors',
                      theme.id === 'night'
                        ? 'border-[#3a475b] text-[#d9e3f2] placeholder:text-[#8091ab] focus:border-[#5a7aaa]'
                        : 'border-[#d8d1c6] text-[#403a33] placeholder:text-[#928776] focus:border-[#a89b8a]',
                    )}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className={cn(
                        'absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded',
                        theme.id === 'night'
                          ? 'text-[#5a6d85] hover:bg-[#3a475b]'
                          : 'text-[#a0988c] hover:bg-[#e8e4dd]',
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                {/* Batch Operation Bar */}
                {isBatchMode && !showTrash && (
                  <div className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-lg',
                    theme.id === 'night' ? 'bg-[#263245]' : 'bg-[#e8e4dd]',
                  )}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllNotes}
                        className={cn(
                          'text-[10px] font-medium transition-colors',
                          theme.id === 'night' ? 'text-[#8ea2c2] hover:text-[#dce6f6]' : 'text-[#6b645a] hover:text-[#3c342b]',
                        )}
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className={cn(
                          'text-[10px] font-medium transition-colors',
                          theme.id === 'night' ? 'text-[#8ea2c2] hover:text-[#dce6f6]' : 'text-[#6b645a] hover:text-[#3c342b]',
                        )}
                      >
                        清空
                      </button>
                    </div>
                    <span className={cn(
                      'text-[10px]',
                      theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                    )}>
                      已选 {selectedNoteIds.size} 篇
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={batchPinSelected}
                        disabled={selectedNoteIds.size === 0}
                        className={cn(
                          'p-1 rounded transition-colors disabled:opacity-40',
                          theme.id === 'night'
                            ? 'text-[#8ea2c2] hover:bg-[#3a475b]'
                            : 'text-[#6b645a] hover:bg-[#d5cdc1]',
                        )}
                        title="批量置顶"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={batchDeleteSelected}
                        disabled={selectedNoteIds.size === 0}
                        className={cn(
                          'p-1 rounded transition-colors disabled:opacity-40',
                          theme.id === 'night'
                            ? 'text-red-400 hover:bg-[#3a475b]'
                            : 'text-red-600 hover:bg-[#d5cdc1]',
                        )}
                        title="批量删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* View Controls */}
                {!showTrash && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Sort Dropdown */}
                      <div className="relative" ref={settingsDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                            theme.id === 'night'
                              ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                              : 'text-[#6b645a] hover:bg-[#e8e4dd]',
                          )}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          {settings.sortBy === 'updatedAt' && '更新时间'}
                          {settings.sortBy === 'createdAt' && '创建时间'}
                          {settings.sortBy === 'title' && '标题'}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        
                        {showSettingsDropdown && (
                          <div
                            className={cn(
                              'absolute left-0 top-full mt-1 z-20 w-32 border rounded-lg py-1 shadow-lg',
                              theme.id === 'night'
                                ? 'border-[#3a475b] bg-[#1a212c]'
                                : 'border-[#d8d1c6] bg-white',
                            )}
                          >
                            {(['updatedAt', 'createdAt', 'title'] as NoteSortOption[]).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  updateSettings({ sortBy: option });
                                  setShowSettingsDropdown(false);
                                }}
                                className={cn(
                                  'w-full px-3 py-1.5 text-left text-[11px] transition-colors',
                                  theme.id === 'night'
                                    ? settings.sortBy === option
                                      ? 'bg-[#263245] text-[#dce6f6]'
                                      : 'text-[#8ea2c2] hover:bg-[#232d3c]'
                                    : settings.sortBy === option
                                      ? 'bg-[#f5f2ed] text-[#3c342b]'
                                      : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                                )}
                              >
                                {option === 'updatedAt' && '按更新时间'}
                                {option === 'createdAt' && '按创建时间'}
                                {option === 'title' && '按标题'}
                              </button>
                            ))}
                            <div
                              className={cn(
                                'my-1 border-t',
                                theme.id === 'night' ? 'border-[#3a475b]' : 'border-[#e8e4dd]',
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateSettings({ sortOrder: settings.sortOrder === 'asc' ? 'desc' : 'asc' });
                                setShowSettingsDropdown(false);
                              }}
                              className={cn(
                                'w-full px-3 py-1.5 text-left text-[11px] transition-colors',
                                theme.id === 'night'
                                  ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                                  : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                              )}
                            >
                              {settings.sortOrder === 'asc' ? '升序 ↑' : '降序 ↓'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* View Mode Toggle */}
                      <button
                        type="button"
                        onClick={() => updateSettings({ viewMode: settings.viewMode === 'list' ? 'grouped' : 'list' })}
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                          theme.id === 'night'
                            ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                            : 'text-[#6b645a] hover:bg-[#e8e4dd]',
                        )}
                        title={settings.viewMode === 'list' ? '分组视图' : '列表视图'}
                      >
                        {settings.viewMode === 'list' ? <LayoutGrid className="h-3 w-3" /> : <List className="h-3 w-3" />}
                      </button>
                    </div>
                    
                    {/* Stats */}
                    <span
                      className={cn(
                        'text-[10px] opacity-60',
                        theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                      )}
                    >
                      {noteStats.totalNotes}篇 · {Math.round(noteStats.totalWords / 1000)}K字
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {showTrash ? (
                // Trash View
                trashNotes.length > 0 ? (
                  <>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span
                        className={cn(
                          'text-[10px] opacity-60',
                          theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                        )}
                      >
                        {trashNotes.length} 篇已删除笔记
                      </span>
                      <button
                        type="button"
                        onClick={handleClearTrash}
                        className={cn(
                          'text-[10px] transition-colors',
                          theme.id === 'night'
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-red-600 hover:text-red-700',
                        )}
                      >
                        清空回收站
                      </button>
                    </div>
                    {trashNotes.map((note) => {
                      const active = note.id === selectedId;
                      const preview = getNotePreview(note.content);
                      const deletedTime = formatRelativeTime(note.deletedAt);

                      return (
                        <div
                          key={note.id}
                          className={cn(
                            'group w-full rounded-xl border p-3 transition-all duration-200',
                            active
                              ? theme.id === 'night'
                                ? 'bg-[#263245] border-[#3a506e]'
                                : 'bg-white border-[#c8bdb0]'
                              : theme.id === 'night'
                                ? 'border-transparent hover:bg-[#232d3c]'
                                : 'border-transparent hover:bg-[#f5f2ed]',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3
                              className={cn(
                                'text-[13px] font-semibold leading-tight truncate flex-1',
                                theme.id === 'night' ? 'text-[#c8d4e6]' : 'text-[#3c342b]',
                              )}
                            >
                              {note.title || '未命名文稿'}
                            </h3>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium',
                                getSubjectColor(note.subject),
                              )}
                            >
                              {note.subject}
                            </span>
                          </div>
                          <p
                            className={cn(
                              'text-[11px] leading-relaxed truncate mb-2',
                              theme.id === 'night' ? 'text-[#8ea2c2]' : 'text-[#8a8075]',
                            )}
                          >
                            {preview}
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-[10px]',
                                theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#a0988c]',
                              )}
                            >
                              删除于 {deletedTime}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRestoreFromTrash(note.id)}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                                  theme.id === 'night'
                                    ? 'text-green-400 hover:bg-[#263245]'
                                    : 'text-green-600 hover:bg-[#e8e4dd]',
                                )}
                              >
                                <RotateCcw className="h-3 w-3" />
                                恢复
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(note.id)}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                                  theme.id === 'night'
                                    ? 'text-red-400 hover:bg-[#263245]'
                                    : 'text-red-600 hover:bg-[#e8e4dd]',
                                )}
                              >
                                <Trash className="h-3 w-3" />
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                        theme.id === 'night'
                          ? 'bg-[#232d3c] text-[#5a6d85]'
                          : 'bg-[#e8e4dd] text-[#a0988c]',
                      )}
                    >
                      <Archive className="h-5 w-5" />
                    </div>
                    <p
                      className={cn(
                        'text-[12px] font-medium mb-1',
                        theme.id === 'night' ? 'text-[#8ea2c2]' : 'text-[#6b645a]',
                      )}
                    >
                      回收站为空
                    </p>
                    <p
                      className={cn(
                        'text-[11px]',
                        theme.id === 'night' ? 'text-[#5a6d85]' : 'text-[#a0988c]',
                      )}
                    >
                      删除的笔记会在这里显示
                    </p>
                  </div>
                )
              ) : settings.viewMode === 'grouped' ? (
                // Grouped View
                Array.from(groupedNotes.entries()).map(([groupName, groupNotes]) => (
                  <div key={groupName} className="mb-4">
                    <div
                      className={cn(
                        'px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1',
                        theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                      )}
                    >
                      {groupName}
                      <span className="ml-1 opacity-60">({groupNotes.length})</span>
                    </div>
                    <div className="space-y-1">
                      {groupNotes.map((note) => (
                        <NoteListItem
                          key={note.id}
                          note={note}
                          isActive={note.id === selectedId}
                          theme={theme}
                          onClick={() => switchNote(note)}
                          onPin={() => handlePinNote(note.id)}
                          onFavorite={() => handleFavoriteNote(note.id)}
                          isBatchMode={isBatchMode}
                          isSelected={selectedNoteIds.has(note.id)}
                          onSelect={() => toggleNoteSelection(note.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // List View
                filteredAndSortedNotes.length > 0 ? (
                  filteredAndSortedNotes.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      isActive={note.id === selectedId}
                      theme={theme}
                      onClick={() => switchNote(note)}
                      onPin={() => handlePinNote(note.id)}
                      onFavorite={() => handleFavoriteNote(note.id)}
                      isBatchMode={isBatchMode}
                      isSelected={selectedNoteIds.has(note.id)}
                      onSelect={() => toggleNoteSelection(note.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                        theme.id === 'night'
                          ? 'bg-[#232d3c] text-[#5a6d85]'
                          : 'bg-[#e8e4dd] text-[#a0988c]',
                      )}
                    >
                      <FileX className="h-5 w-5" />
                    </div>
                    <p
                      className={cn(
                        'text-[12px] font-medium mb-1',
                        theme.id === 'night' ? 'text-[#8ea2c2]' : 'text-[#6b645a]',
                      )}
                    >
                      {search.trim() ? '未找到匹配的笔记' : '暂无笔记'}
                    </p>
                    <p
                      className={cn(
                        'text-[11px]',
                        theme.id === 'night' ? 'text-[#5a6d85]' : 'text-[#a0988c]',
                      )}
                    >
                      {search.trim() ? '尝试其他关键词' : '点击上方"新建"创建第一篇笔记'}
                    </p>
                  </div>
                )
              )}
            </div>
            
            {/* Bottom Actions */}
            <div className="border-t px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrash(!showTrash);
                    setSelectedId(null);
                    setDraft(EMPTY_DRAFT);
                    setIsBatchMode(false);
                  }}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors',
                    showTrash
                      ? theme.id === 'night'
                        ? 'bg-[#263245] text-[#dce6f6]'
                        : 'bg-[#e8e4dd] text-[#3c342b]'
                      : theme.id === 'night'
                        ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                        : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                  )}
                >
                  {showTrash ? <FolderTree className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  {showTrash ? '返回笔记列表' : `回收站 (${trashNotes.length})`}
                </button>
                
                {/* Import/Export */}
                {!showTrash && (
                  <div className="relative" ref={importExportRef}>
                    <button
                      type="button"
                      onClick={() => setImportExportMenuOpen(!importExportMenuOpen)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors',
                        theme.id === 'night'
                          ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                          : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                      )}
                      title="导入/导出"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    
                    {importExportMenuOpen && (
                      <div
                        className={cn(
                          'absolute bottom-full right-0 mb-1 w-40 border rounded-lg py-1 shadow-lg z-20',
                          theme.id === 'night'
                            ? 'border-[#3a475b] bg-[#1a212c]'
                            : 'border-[#d8d1c6] bg-white',
                        )}
                      >
                        <button
                          type="button"
                          onClick={handleExportJSON}
                          className={cn(
                            'w-full px-3 py-2 text-left text-[11px] transition-colors inline-flex items-center gap-2',
                            theme.id === 'night'
                              ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                              : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                          )}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          导出 JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => fileImportRef.current?.click()}
                          className={cn(
                            'w-full px-3 py-2 text-left text-[11px] transition-colors inline-flex items-center gap-2',
                            theme.id === 'night'
                              ? 'text-[#8ea2c2] hover:bg-[#232d3c]'
                              : 'text-[#6b645a] hover:bg-[#f5f2ed]',
                          )}
                        >
                          <FileUp className="h-3.5 w-3.5" />
                          导入 JSON
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {!showTrash && (
                <div
                  className={cn(
                    'flex items-center justify-between text-[10px] px-1',
                    theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                  )}
                >
                  <span>↑↓ 键盘导航</span>
                  <span>Ctrl+N 新建</span>
                  <span>Ctrl+S 保存</span>
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="min-w-0 px-6 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-[820px]">
            <div className={cn('mb-5 flex items-center justify-between text-xs', fileToneClass)}>
              <div className="inline-flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                {selectedNote ? (
                  <span className="inline-flex items-center gap-2">
                    <span>{draft.subject || '综合'}</span>
                    {draft.tags && splitTags(draft.tags).length > 0 && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="inline-flex items-center gap-1">
                          {splitTags(draft.tags).map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                'inline-flex items-center px-1.5 py-px rounded text-[10px]',
                                theme.id === 'night'
                                  ? 'bg-[#232d3c] text-[#8ea2c2]'
                                  : 'bg-[#ece9e3] text-[#6b645a]',
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </span>
                ) : (
                  <span>笔记本</span>
                )}
              </div>
              <span>{charCount}</span>
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
                placeholder=""
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
                  placeholder="标签"
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
                const isDragging = draggedBlockIndex === index;
                return (
                  <section 
                    key={`${index}-${block.slice(0, 18)}`} 
                    className={cn(
                      'group mb-2 relative',
                      isDragging && 'opacity-50'
                    )}
                    draggable={!isEditing}
                    onDragStart={() => handleBlockDragStart(index)}
                    onDragOver={(e) => handleBlockDragOver(e, index)}
                    onDrop={(e) => handleBlockDrop(e, index)}
                  >
                    {/* Drag Handle */}
                    {!isEditing && (
                      <div
                        className={cn(
                          'absolute left-[-20px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity',
                          theme.id === 'night' ? 'text-[#5a6d85]' : 'text-[#a0988c]',
                        )}
                        title="拖拽调整顺序"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}
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
                          placeholder=""
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
                          <p className={cn('my-0 text-sm italic', fileToneClass)}>&nbsp;</p>
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

            <div className={cn('mt-8 flex items-center justify-between text-xs', fileToneClass)}>
              <span>{statusText}</span>
              <div className="flex items-center gap-3">
                {selectedNote && (
                  <>
                    <span>创建于 {new Date(selectedNote.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span>·</span>
                    <span>{blocks.length} 段落</span>
                  </>
                )}
                <span>·</span>
                <span>{charCount} 字符</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - TOC */}
        {!focusMode && (
          <aside className={cn('border-l flex flex-col', asideBgClass)}>
            <div className="px-4 pt-6 pb-3">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-semibold opacity-80">
                <ListTree className="h-3.5 w-3.5" />
                大纲
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {headings.length > 0 ? (
                <div className="space-y-0.5">
                  {headings.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        const node = document.getElementById(item.slug);
                        node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={cn(
                        'block w-full truncate py-1.5 text-left text-[12px] rounded-md px-2 transition-all',
                        theme.id === 'night'
                          ? 'text-[#b8c8de] hover:bg-[#232d3c] hover:text-[#dce6f6]'
                          : 'text-[#5f584d] hover:bg-[#e7e2d9] hover:text-[#3c342b]',
                      )}
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                    >
                      <span
                        className={cn(
                          'inline-block w-1.5 h-1.5 rounded-full mr-2',
                          item.level === 1
                            ? theme.id === 'night'
                              ? 'bg-purple-400'
                              : 'bg-purple-500'
                            : theme.id === 'night'
                              ? 'bg-gray-600'
                              : 'bg-gray-400',
                        )}
                      />
                      {item.text}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p
                    className={cn(
                      'text-[11px] opacity-40',
                      theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
                    )}
                  >
                    暂无大纲
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// Note List Item Component
interface NoteListItemProps {
  note: NotebookNote;
  isActive: boolean;
  theme: ThemeOption;
  onClick: () => void;
  onPin: (e?: React.MouseEvent) => void;
  onFavorite: (e?: React.MouseEvent) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

function NoteListItem({ 
  note, 
  isActive, 
  theme, 
  onClick, 
  onPin, 
  onFavorite,
  isBatchMode = false,
  isSelected = false,
  onSelect,
}: NoteListItemProps) {
  const preview = getNotePreview(note.content);
  const timeText = formatRelativeTime(note.updatedAt);
  const subjectColor = getSubjectColor(note.subject);

  return (
    <div
      className={cn(
        'group w-full rounded-xl border p-3 transition-all duration-200 relative',
        isActive
          ? theme.id === 'night'
            ? 'bg-[#263245] border-[#3a506e] shadow-sm'
            : 'bg-white border-[#c8bdb0] shadow-sm'
          : isSelected
            ? theme.id === 'night'
              ? 'bg-[#263245]/50 border-[#3a506e]/50'
              : 'bg-[#f5f2ed] border-[#c8bdb0]/50'
            : theme.id === 'night'
              ? 'border-transparent hover:bg-[#232d3c] hover:border-[#334156]'
              : 'border-transparent hover:bg-[#f5f2ed] hover:border-[#ddd6cb]',
      )}
    >
      {/* Batch Selection Checkbox */}
      {isBatchMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
        >
          {isSelected ? (
            <CheckSquare className={cn(
              'h-4 w-4',
              theme.id === 'night' ? 'text-[#5a7aaa]' : 'text-[#655e54]',
            )} />
          ) : (
            <Square className={cn(
              'h-4 w-4',
              theme.id === 'night' ? 'text-[#5a6d85]' : 'text-[#a0988c]',
            )} />
          )}
        </button>
      )}
      
      <button
        type="button"
        onClick={isBatchMode ? onSelect : onClick}
        className={cn('w-full text-left', isBatchMode && 'pl-6')}
      >
      {/* Pin Indicator */}
      {note.isPinned && (
        <div className="absolute -top-1 -right-1">
          <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
        </div>
      )}
      
      {/* Title Row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3
          className={cn(
            'text-[13px] font-semibold leading-tight truncate flex-1',
            isActive
              ? theme.id === 'night'
                ? 'text-[#edf3ff]'
                : 'text-[#1f1c18]'
              : theme.id === 'night'
                ? 'text-[#c8d4e6]'
                : 'text-[#3c342b]',
          )}
        >
          {note.title || '未命名文稿'}
        </h3>
        <div className="flex items-center gap-1">
          {note.isFavorite && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          )}
          <span
            className={cn(
              'shrink-0 inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium',
              subjectColor,
            )}
          >
            {note.subject}
          </span>
        </div>
      </div>

      {/* Preview */}
      <p
        className={cn(
          'text-[11px] leading-relaxed truncate mb-2',
          theme.id === 'night' ? 'text-[#8ea2c2]' : 'text-[#8a8075]',
        )}
      >
        {preview}
      </p>

      {/* Meta Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 opacity-50" />
          <span
            className={cn(
              'text-[10px]',
              theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#a0988c]',
            )}
          >
            {timeText}
          </span>
        </div>
        
        {/* Action Buttons - Visible on Hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onPin}
            className={cn(
              'p-1 rounded transition-colors',
              theme.id === 'night'
                ? 'hover:bg-[#3a475b] text-[#8ea2c2]'
                : 'hover:bg-[#e8e4dd] text-[#6b645a]',
            )}
            title={note.isPinned ? '取消置顶' : '置顶'}
          >
            <Pin className={cn('h-3 w-3', note.isPinned && 'text-amber-500 fill-amber-500')} />
          </button>
          <button
            type="button"
            onClick={onFavorite}
            className={cn(
              'p-1 rounded transition-colors',
              theme.id === 'night'
                ? 'hover:bg-[#3a475b] text-[#8ea2c2]'
                : 'hover:bg-[#e8e4dd] text-[#6b645a]',
            )}
            title={note.isFavorite ? '取消收藏' : '收藏'}
          >
            <Star className={cn('h-3 w-3', note.isFavorite && 'text-amber-500 fill-amber-500')} />
          </button>
        </div>
        
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <Tag className="h-3 w-3 opacity-40" />
            <span
              className={cn(
                'text-[10px] truncate max-w-[60px]',
                theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#a0988c]',
              )}
            >
              {note.tags.slice(0, 2).join(', ')}
              {note.tags.length > 2 && ` +${note.tags.length - 2}`}
            </span>
          </div>
        )}
      </div>
      </button>
    </div>
  );
}

// Template Selector Modal
interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  theme: ThemeOption;
}

function TemplateSelector({ isOpen, onClose, onSelect, theme }: TemplateSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border p-6 shadow-xl',
          theme.id === 'night'
            ? 'bg-[#1a212c] border-[#3a475b]'
            : 'bg-white border-[#d8d1c6]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn(
              'text-lg font-semibold',
              theme.id === 'night' ? 'text-[#dce6f6]' : 'text-[#3c342b]',
            )}
          >
            选择笔记模板
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1 rounded transition-colors',
              theme.id === 'night'
                ? 'text-[#8ea2c2] hover:bg-[#3a475b]'
                : 'text-[#6b645a] hover:bg-[#e8e4dd]',
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {NOTE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                theme.id === 'night'
                  ? 'border-[#3a475b] hover:border-[#5a7aaa] hover:bg-[#232d3c]'
                  : 'border-[#e8e4dd] hover:border-[#a89b8a] hover:bg-[#f5f2ed]',
              )}
            >
              <span className="text-3xl">{template.icon}</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  theme.id === 'night' ? 'text-[#dce6f6]' : 'text-[#3c342b]',
                )}
              >
                {template.name}
              </span>
            </button>
          ))}
        </div>
        
        <p
          className={cn(
            'mt-4 text-xs text-center',
            theme.id === 'night' ? 'text-[#6b7d9a]' : 'text-[#8a8075]',
          )}
        >
          选择合适的模板开始记录你的想法
        </p>
      </div>
    </div>
  );
}
