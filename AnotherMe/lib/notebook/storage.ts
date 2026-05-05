export type NotebookSource = 'manual' | 'knowledge-card' | 'photo-video' | 'chat' | 'solve' | 'research';
export type NoteSortOption = 'updatedAt' | 'createdAt' | 'title';

// 笔记类型（参考 DeepTutor）
export type NotebookNoteType =
  | 'manual'      // 手动创建
  | 'chat'        // 聊天保存
  | 'solve'       // 解题记录
  | 'research'    // 研究记录
  | 'classroom'   // 课堂笔记
  | 'quiz';       // 测验记录

// 笔记本（参考 DeepTutor 的多笔记本管理）
export interface Notebook {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  recordCount: number;
}

export interface NotebookNote {
  id: string;
  notebookId: string;           // 所属笔记本ID
  type: NotebookNoteType;       // 笔记类型
  title: string;
  content: string;
  summary?: string;             // AI 自动生成摘要
  userQuery?: string;           // 用户原始问题（用于聊天/解题记录）
  output?: string;              // AI 输出内容
  tags: string[];
  subject: string;
  source: NotebookSource;
  createdAt: number;
  updatedAt: number;
  stageId?: string;
  sceneId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  metadata?: Record<string, unknown>;  // 扩展元数据
}

export interface DeletedNote extends NotebookNote {
  deletedAt: number;
}

export interface UpsertNotebookInput {
  id?: string;
  notebookId?: string;
  type?: NotebookNoteType;
  title: string;
  content: string;
  summary?: string;
  userQuery?: string;
  output?: string;
  tags?: string[];
  subject?: string;
  source?: NotebookSource;
  stageId?: string;
  sceneId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  metadata?: Record<string, unknown>;
}

// 笔记本管理
export interface NotebookManagerState {
  notebooks: Notebook[];
  activeNotebookId: string | null;
}

const NOTEBOOK_STORAGE_KEY = 'anotherme:notebook:items:v2';      // v2 升级版本
const NOTEBOOK_TRASH_KEY = 'anotherme:notebook:trash:v1';
const NOTEBOOK_SETTINGS_KEY = 'anotherme:notebook:settings:v1';
const NOTEBOOK_MANAGER_KEY = 'anotherme:notebook:manager:v1';    // 笔记本管理
const LEGACY_NOTEBOOK_STORAGE_KEY = 'workspace:notebook:items';
const LEGACY_NOTEBOOK_V1_KEY = 'anotherme:notebook:items:v1';

export interface NotebookSettings {
  sortBy: NoteSortOption;
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'grouped';
}

function hasWindowStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function isNotebookNote(value: unknown): value is NotebookNote {
  if (!value || typeof value !== 'object') return false;
  const note = value as Partial<NotebookNote>;
  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.subject === 'string' &&
    typeof note.source === 'string' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number' &&
    Array.isArray(note.tags)
  );
}

function normalizeNoteList(value: unknown): NotebookNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isNotebookNote)
    .map((note) => ({
      ...note,
      tags: normalizeTags(note.tags),
      type: note.type || 'manual',
      notebookId: note.notebookId || 'default',
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeNotebookNotes(notes: NotebookNote[]) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(notes));
}

export function readNotebookNotes(): NotebookNote[] {
  if (!hasWindowStorage()) return [];

  // 尝试读取 v2 版本
  const v2 = normalizeNoteList(safeJsonParse(window.localStorage.getItem(NOTEBOOK_STORAGE_KEY)));
  if (v2.length > 0) {
    return v2;
  }

  // 尝试读取 v1 版本并迁移
  const v1 = normalizeNoteList(safeJsonParse(window.localStorage.getItem(LEGACY_NOTEBOOK_V1_KEY)));
  if (v1.length > 0) {
    const migrated = v1.map(note => ({
      ...note,
      notebookId: 'default',
      type: 'manual' as NotebookNoteType,
    }));
    writeNotebookNotes(migrated);
    return migrated;
  }

  // 尝试读取 legacy 版本
  const legacy = normalizeNoteList(
    safeJsonParse(window.localStorage.getItem(LEGACY_NOTEBOOK_STORAGE_KEY)),
  );
  if (legacy.length > 0) {
    const migrated = legacy.map(note => ({
      ...note,
      notebookId: 'default',
      type: 'manual' as NotebookNoteType,
    }));
    writeNotebookNotes(migrated);
    window.localStorage.removeItem(LEGACY_NOTEBOOK_STORAGE_KEY);
    return migrated;
  }

  return [];
}

// 笔记本管理函数
function readNotebookManagerState(): NotebookManagerState {
  if (!hasWindowStorage()) {
    return { notebooks: [], activeNotebookId: null };
  }
  const raw = window.localStorage.getItem(NOTEBOOK_MANAGER_KEY);
  if (!raw) {
    // 初始化默认笔记本
    const defaultNotebook: Notebook = {
      id: 'default',
      name: '默认笔记本',
      description: '自动创建的默认笔记本',
      color: '#3B82F6',
      icon: 'book',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      recordCount: 0,
    };
    const state: NotebookManagerState = {
      notebooks: [defaultNotebook],
      activeNotebookId: 'default',
    };
    window.localStorage.setItem(NOTEBOOK_MANAGER_KEY, JSON.stringify(state));
    return state;
  }
  try {
    const parsed = JSON.parse(raw) as NotebookManagerState;
    if (!parsed.notebooks || parsed.notebooks.length === 0) {
      const defaultNotebook: Notebook = {
        id: 'default',
        name: '默认笔记本',
        description: '自动创建的默认笔记本',
        color: '#3B82F6',
        icon: 'book',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        recordCount: 0,
      };
      return { notebooks: [defaultNotebook], activeNotebookId: 'default' };
    }
    return parsed;
  } catch {
    return { notebooks: [], activeNotebookId: null };
  }
}

function writeNotebookManagerState(state: NotebookManagerState) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(NOTEBOOK_MANAGER_KEY, JSON.stringify(state));
}

export function listNotebooks(): Notebook[] {
  return readNotebookManagerState().notebooks;
}

export function getActiveNotebookId(): string | null {
  return readNotebookManagerState().activeNotebookId;
}

export function setActiveNotebookId(notebookId: string): void {
  const state = readNotebookManagerState();
  if (state.notebooks.find(nb => nb.id === notebookId)) {
    state.activeNotebookId = notebookId;
    writeNotebookManagerState(state);
  }
}

export function createNotebook(
  name: string,
  description: string = '',
  color: string = '#3B82F6',
  icon: string = 'book'
): Notebook {
  const state = readNotebookManagerState();
  const notebook: Notebook = {
    id: `nb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || '未命名笔记本',
    description,
    color,
    icon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    recordCount: 0,
  };
  state.notebooks.push(notebook);
  writeNotebookManagerState(state);
  return notebook;
}

export function updateNotebook(
  notebookId: string,
  updates: Partial<Omit<Notebook, 'id' | 'createdAt'>>
): Notebook | null {
  const state = readNotebookManagerState();
  const notebook = state.notebooks.find(nb => nb.id === notebookId);
  if (!notebook) return null;

  Object.assign(notebook, updates, { updatedAt: Date.now() });
  writeNotebookManagerState(state);
  return notebook;
}

export function deleteNotebook(notebookId: string): boolean {
  if (notebookId === 'default') return false; // 不能删除默认笔记本

  const state = readNotebookManagerState();
  const index = state.notebooks.findIndex(nb => nb.id === notebookId);
  if (index === -1) return false;

  // 将该笔记本的笔记移动到默认笔记本
  const notes = readNotebookNotes();
  const updatedNotes = notes.map(note =>
    note.notebookId === notebookId ? { ...note, notebookId: 'default' } : note
  );
  writeNotebookNotes(updatedNotes);

  state.notebooks.splice(index, 1);
  if (state.activeNotebookId === notebookId) {
    state.activeNotebookId = 'default';
  }
  writeNotebookManagerState(state);
  return true;
}

function updateNotebookRecordCount(notebookId: string): void {
  const state = readNotebookManagerState();
  const notebook = state.notebooks.find(nb => nb.id === notebookId);
  if (notebook) {
    const notes = readNotebookNotes();
    notebook.recordCount = notes.filter(n => n.notebookId === notebookId).length;
    notebook.updatedAt = Date.now();
    writeNotebookManagerState(state);
  }
}

function createNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function upsertNotebookNote(input: UpsertNotebookInput): NotebookNote {
  const notes = readNotebookNotes();
  const now = Date.now();
  const noteId = input.id || createNoteId();
  const current = notes.find((note) => note.id === noteId);

  // 确定所属笔记本
  const notebookId = input.notebookId || current?.notebookId || getActiveNotebookId() || 'default';

  const next: NotebookNote = {
    id: noteId,
    notebookId,
    type: input.type || current?.type || 'manual',
    title: input.title.trim() || '未命名笔记',
    content: input.content,
    summary: input.summary || current?.summary,
    userQuery: input.userQuery || current?.userQuery,
    output: input.output || current?.output,
    tags: normalizeTags(input.tags),
    subject: input.subject?.trim() || current?.subject || '综合',
    source: input.source || current?.source || 'manual',
    createdAt: current?.createdAt || now,
    updatedAt: now,
    stageId: input.stageId || current?.stageId,
    sceneId: input.sceneId || current?.sceneId,
    isPinned: current?.isPinned,
    isFavorite: current?.isFavorite,
    metadata: input.metadata || current?.metadata,
  };

  const merged = [next, ...notes.filter((note) => note.id !== noteId)].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  writeNotebookNotes(merged);
  updateNotebookRecordCount(notebookId);
  return next;
}

export function deleteNotebookNote(noteId: string): DeletedNote | null {
  const notes = readNotebookNotes();
  const noteToDelete = notes.find((note) => note.id === noteId);
  if (!noteToDelete) return null;

  const deletedNote: DeletedNote = { ...noteToDelete, deletedAt: Date.now() };

  const next = notes.filter((note) => note.id !== noteId);
  writeNotebookNotes(next);

  const trash = readTrashNotes();
  writeTrashNotes([deletedNote, ...trash].slice(0, 50));

  updateNotebookRecordCount(noteToDelete.notebookId);
  return deletedNote;
}

export function readTrashNotes(): DeletedNote[] {
  if (!hasWindowStorage()) return [];
  const raw = window.localStorage.getItem(NOTEBOOK_TRASH_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DeletedNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrashNotes(notes: DeletedNote[]) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(NOTEBOOK_TRASH_KEY, JSON.stringify(notes));
}

export function restoreFromTrash(noteId: string): NotebookNote | null {
  const trash = readTrashNotes();
  const noteToRestore = trash.find((note) => note.id === noteId);
  if (!noteToRestore) return null;

  const { deletedAt, ...restoredNote } = noteToRestore;
  const updatedNote = { ...restoredNote, updatedAt: Date.now() };

  upsertNotebookNote(updatedNote);
  writeTrashNotes(trash.filter((note) => note.id !== noteId));
  return updatedNote;
}

export function permanentlyDeleteFromTrash(noteId: string): boolean {
  const trash = readTrashNotes();
  const filtered = trash.filter((note) => note.id !== noteId);
  if (filtered.length === trash.length) return false;
  writeTrashNotes(filtered);
  return true;
}

export function clearTrash(): void {
  writeTrashNotes([]);
}

export function toggleNotePin(noteId: string): NotebookNote | null {
  const notes = readNotebookNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  return upsertNotebookNote({
    ...note,
    isPinned: !note.isPinned,
  });
}

export function toggleNoteFavorite(noteId: string): NotebookNote | null {
  const notes = readNotebookNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  return upsertNotebookNote({
    ...note,
    isFavorite: !note.isFavorite,
  });
}

export function readNotebookSettings(): NotebookSettings {
  if (!hasWindowStorage()) {
    return { sortBy: 'updatedAt', sortOrder: 'desc', viewMode: 'list' };
  }
  const raw = window.localStorage.getItem(NOTEBOOK_SETTINGS_KEY);
  if (!raw) {
    return { sortBy: 'updatedAt', sortOrder: 'desc', viewMode: 'list' };
  }
  try {
    const parsed = JSON.parse(raw) as NotebookSettings;
    return {
      sortBy: parsed.sortBy || 'updatedAt',
      sortOrder: parsed.sortOrder || 'desc',
      viewMode: parsed.viewMode || 'list',
    };
  } catch {
    return { sortBy: 'updatedAt', sortOrder: 'desc', viewMode: 'list' };
  }
}

export function saveNotebookSettings(settings: NotebookSettings): void {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(NOTEBOOK_SETTINGS_KEY, JSON.stringify(settings));
}

export function sortNotes(notes: NotebookNote[], sortBy: NoteSortOption, sortOrder: 'asc' | 'desc'): NotebookNote[] {
  const sorted = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title, 'zh-CN');
      case 'createdAt':
        return a.createdAt - b.createdAt;
      case 'updatedAt':
      default:
        return a.updatedAt - b.updatedAt;
    }
  });

  return sortOrder === 'desc' ? sorted.reverse() : sorted;
}

export function groupNotesBySubject(notes: NotebookNote[]): Map<string, NotebookNote[]> {
  const groups = new Map<string, NotebookNote[]>();

  const pinned = notes.filter((n) => n.isPinned);
  const unpinned = notes.filter((n) => !n.isPinned);

  if (pinned.length > 0) {
    groups.set('📌 置顶', pinned);
  }

  unpinned.forEach((note) => {
    const subject = note.subject || '综合';
    if (!groups.has(subject)) {
      groups.set(subject, []);
    }
    groups.get(subject)!.push(note);
  });

  return groups;
}

export function groupNotesByType(notes: NotebookNote[]): Map<string, NotebookNote[]> {
  const groups = new Map<string, NotebookNote[]>();

  const typeLabels: Record<NotebookNoteType, string> = {
    manual: '📝 手动创建',
    chat: '💬 聊天记录',
    solve: '🔢 解题记录',
    research: '🔍 研究记录',
    classroom: '📚 课堂笔记',
    quiz: '❓ 测验记录',
  };

  notes.forEach((note) => {
    const type = note.type || 'manual';
    const label = typeLabels[type] || '📝 其他';
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(note);
  });

  return groups;
}

export function buildKnowledgeCardNoteId(stageId: string, sceneId: string): string {
  return `knowledge-card:${stageId}:${sceneId}`;
}

export function upsertKnowledgeCardNote(params: {
  stageId: string;
  sceneId: string;
  title: string;
  bullets: string[];
}) {
  const markdown = params.bullets.map((bullet) => `- ${bullet}`).join('\n');
  return upsertNotebookNote({
    id: buildKnowledgeCardNoteId(params.stageId, params.sceneId),
    type: 'classroom',
    title: params.title,
    content: markdown,
    source: 'knowledge-card',
    subject: '课堂',
    tags: ['课堂', '知识卡片'],
    stageId: params.stageId,
    sceneId: params.sceneId,
  });
}

export function removeKnowledgeCardNote(stageId: string, sceneId: string) {
  deleteNotebookNote(buildKnowledgeCardNoteId(stageId, sceneId));
}

export function buildPhotoVideoNoteId(videoUrl: string): string {
  return `photo-video:${encodeURIComponent(videoUrl || 'local')}`;
}

// 保存聊天到笔记（参考 DeepTutor）
export interface ChatMessageForNote {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SaveChatToNoteInput {
  title: string;
  messages: ChatMessageForNote[];
  notebookId?: string;
  metadata?: Record<string, unknown>;
}

export function saveChatToNote(input: SaveChatToNoteInput): NotebookNote {
  const transcript = input.messages
    .map((msg) => {
      const role = msg.role === 'user' ? '用户' : msg.role === 'assistant' ? 'AI' : '系统';
      return `## ${role}\n${msg.content}`;
    })
    .join('\n\n');

  const userQuery = input.messages
    .filter((msg) => msg.role === 'user')
    .map((msg) => msg.content)
    .join('\n\n');

  return upsertNotebookNote({
    notebookId: input.notebookId,
    type: 'chat',
    title: input.title,
    content: transcript,
    userQuery,
    output: input.messages.find((msg) => msg.role === 'assistant')?.content,
    source: 'chat',
    subject: '聊天',
    tags: ['聊天', 'AI对话'],
    metadata: {
      messageCount: input.messages.length,
      ...input.metadata,
    },
  });
}

// Note Templates
export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  title: string;
  subject: string;
  tags: string[];
  content: string;
  type: NotebookNoteType;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: '空白笔记',
    icon: '📄',
    title: '未命名文稿',
    subject: '综合',
    tags: ['草稿'],
    content: '',
    type: 'manual',
  },
  {
    id: 'study',
    name: '学习笔记',
    icon: '📚',
    title: '学习笔记',
    subject: '课堂',
    tags: ['学习', '笔记'],
    type: 'classroom',
    content: `# 学习目标

- 

# 重点内容

## 知识点1



## 知识点2



# 总结与反思


`,
  },
  {
    id: 'chat',
    name: '聊天记录',
    icon: '💬',
    title: 'AI对话记录',
    subject: '聊天',
    tags: ['聊天', 'AI'],
    type: 'chat',
    content: '',
  },
  {
    id: 'solve',
    name: '解题记录',
    icon: '🔢',
    title: '解题记录',
    subject: '数学',
    tags: ['解题', '数学'],
    type: 'solve',
    content: `# 题目



# 解题思路



# 解答过程



# 总结


`,
  },
  {
    id: 'research',
    name: '研究记录',
    icon: '🔍',
    title: '研究记录',
    subject: '研究',
    tags: ['研究', '探索'],
    type: 'research',
    content: `# 研究主题



# 关键发现



# 参考资料



# 结论


`,
  },
  {
    id: 'meeting',
    name: '会议纪要',
    icon: '📋',
    title: '会议纪要',
    subject: '工作',
    tags: ['会议', '纪要'],
    type: 'manual',
    content: `# 会议信息

- 时间：${new Date().toLocaleDateString('zh-CN')}
- 地点：
- 参会人员：

# 会议议题

1. 

# 讨论内容



# 决议事项

- [ ] 

# 下一步行动

- [ ] 
`,
  },
  {
    id: 'diary',
    name: '日记',
    icon: '📝',
    title: new Date().toLocaleDateString('zh-CN') + ' 日记',
    subject: '生活',
    tags: ['日记'],
    type: 'manual',
    content: `# ${new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## 今日心情



## 今日收获



## 明日计划


`,
  },
  {
    id: 'reading',
    name: '读书笔记',
    icon: '📖',
    title: '读书笔记',
    subject: '阅读',
    tags: ['读书', '笔记'],
    type: 'manual',
    content: `# 书籍信息

- 书名：
- 作者：
- 阅读日期：${new Date().toLocaleDateString('zh-CN')}

# 核心观点



# 精彩摘录

> 

# 个人感悟


`,
  },
  {
    id: 'code',
    name: '代码笔记',
    icon: '💻',
    title: '代码笔记',
    subject: '编程',
    tags: ['代码', '技术'],
    type: 'manual',
    content: `# 问题描述



# 解决方案

\`\`\`

\`\`\`

# 关键代码

\`\`\`

\`\`\`

# 注意事项

- 
`,
  },
  {
    id: 'todo',
    name: '待办清单',
    icon: '✅',
    title: '待办事项',
    subject: '任务',
    tags: ['待办'],
    type: 'manual',
    content: `# 今日待办

- [ ] 

# 本周计划

- [ ] 

# 重要事项

- [ ] 
`,
  },
];

export function createNoteFromTemplate(templateId: string, notebookId?: string): NotebookNote {
  const template = NOTE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return upsertNotebookNote({
      title: '未命名文稿',
      content: '',
      subject: '综合',
      tags: ['草稿'],
      source: 'manual',
      notebookId,
    });
  }

  return upsertNotebookNote({
    notebookId,
    type: template.type,
    title: template.title,
    content: template.content,
    subject: template.subject,
    tags: template.tags,
    source: 'manual',
  });
}

// Batch operations
export function batchDeleteNotes(noteIds: string[]): number {
  const notes = readNotebookNotes();
  const notesToDelete = notes.filter((n) => noteIds.includes(n.id));

  if (notesToDelete.length === 0) return 0;

  const deletedNotes: DeletedNote[] = notesToDelete.map((n) => ({
    ...n,
    deletedAt: Date.now(),
  }));

  const remaining = notes.filter((n) => !noteIds.includes(n.id));
  writeNotebookNotes(remaining);

  const trash = readTrashNotes();
  writeTrashNotes([...deletedNotes, ...trash].slice(0, 50));

  // 更新笔记本记录数
  const affectedNotebookIds = new Set(notesToDelete.map(n => n.notebookId));
  affectedNotebookIds.forEach(id => updateNotebookRecordCount(id));

  return deletedNotes.length;
}

export function batchPinNotes(noteIds: string[]): number {
  const notes = readNotebookNotes();
  let count = 0;

  notes.forEach((note) => {
    if (noteIds.includes(note.id) && !note.isPinned) {
      upsertNotebookNote({ ...note, isPinned: true });
      count++;
    }
  });

  return count;
}

export function batchUnpinNotes(noteIds: string[]): number {
  const notes = readNotebookNotes();
  let count = 0;

  notes.forEach((note) => {
    if (noteIds.includes(note.id) && note.isPinned) {
      upsertNotebookNote({ ...note, isPinned: false });
      count++;
    }
  });

  return count;
}

// Export/Import
export interface NotebookExport {
  version: string;
  exportDate: string;
  notebooks: Notebook[];
  notes: NotebookNote[];
  settings: NotebookSettings;
}

export function exportAllNotes(): NotebookExport {
  return {
    version: '2.0',
    exportDate: new Date().toISOString(),
    notebooks: listNotebooks(),
    notes: readNotebookNotes(),
    settings: readNotebookSettings(),
  };
}

export function importNotes(exportData: NotebookExport): {
  imported: number;
  skipped: number;
  errors: string[];
} {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (!exportData.notes || !Array.isArray(exportData.notes)) {
    errors.push('Invalid export data format');
    return { imported: 0, skipped: 0, errors };
  }

  const existingNotes = readNotebookNotes();
  const existingIds = new Set(existingNotes.map((n) => n.id));

  // 导入笔记本
  if (exportData.notebooks && Array.isArray(exportData.notebooks)) {
    const state = readNotebookManagerState();
    exportData.notebooks.forEach((notebook) => {
      if (!state.notebooks.find(nb => nb.id === notebook.id)) {
        state.notebooks.push(notebook);
      }
    });
    writeNotebookManagerState(state);
  }

  exportData.notes.forEach((note) => {
    if (!isNotebookNote(note)) {
      errors.push(`Invalid note: ${(note as Partial<NotebookNote>).title || 'unknown'}`);
      skipped++;
      return;
    }

    // If note with same ID exists, create new ID
    if (existingIds.has(note.id)) {
      note.id = createNoteId();
    }

    upsertNotebookNote(note);
    imported++;
  });

  return { imported, skipped, errors };
}

// Search with highlighting
export interface SearchResult {
  note: NotebookNote;
  matches: Array<{
    field: 'title' | 'content' | 'tags' | 'summary';
    snippet: string;
    indices: Array<[number, number]>;
  }>;
}

export function searchNotesWithHighlight(
  notes: NotebookNote[],
  query: string,
): SearchResult[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  notes.forEach((note) => {
    const matches: SearchResult['matches'] = [];

    // Check title
    const titleLower = note.title.toLowerCase();
    if (titleLower.includes(lowerQuery)) {
      const indices = findAllIndices(titleLower, lowerQuery);
      matches.push({
        field: 'title',
        snippet: note.title,
        indices,
      });
    }

    // Check summary
    if (note.summary) {
      const summaryLower = note.summary.toLowerCase();
      if (summaryLower.includes(lowerQuery)) {
        const indices = findAllIndices(summaryLower, lowerQuery);
        matches.push({
          field: 'summary',
          snippet: note.summary,
          indices,
        });
      }
    }

    // Check content
    const contentLower = note.content.toLowerCase();
    if (contentLower.includes(lowerQuery)) {
      const indices = findAllIndices(contentLower, lowerQuery);
      // Get snippet around first match
      const firstMatch = indices[0];
      if (firstMatch) {
        const start = Math.max(0, firstMatch[0] - 50);
        const end = Math.min(note.content.length, firstMatch[1] + 50);
        let snippet = note.content.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < note.content.length) snippet = snippet + '...';

        matches.push({
          field: 'content',
          snippet,
          indices: findAllIndices(snippet.toLowerCase(), lowerQuery),
        });
      }
    }

    // Check tags
    const matchingTags = note.tags.filter((t) => t.toLowerCase().includes(lowerQuery));
    if (matchingTags.length > 0) {
      matches.push({
        field: 'tags',
        snippet: matchingTags.join(', '),
        indices: findAllIndices(matchingTags.join(', ').toLowerCase(), lowerQuery),
      });
    }

    if (matches.length > 0) {
      results.push({ note, matches });
    }
  });

  return results;
}

function findAllIndices(text: string, query: string): Array<[number, number]> {
  const indices: Array<[number, number]> = [];
  let pos = 0;

  while ((pos = text.indexOf(query, pos)) !== -1) {
    indices.push([pos, pos + query.length]);
    pos += query.length;
  }

  return indices;
}

// 获取笔记类型标签
export function getNoteTypeLabel(type: NotebookNoteType): string {
  const labels: Record<NotebookNoteType, string> = {
    manual: '手动',
    chat: '聊天',
    solve: '解题',
    research: '研究',
    classroom: '课堂',
    quiz: '测验',
  };
  return labels[type] || '其他';
}

export function getNoteTypeColor(type: NotebookNoteType): string {
  const colors: Record<NotebookNoteType, string> = {
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    chat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    solve: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    research: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    classroom: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    quiz: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return colors[type] || colors.manual;
}
