export type NotebookSource = 'manual' | 'knowledge-card' | 'photo-video';

export interface NotebookNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  subject: string;
  source: NotebookSource;
  createdAt: number;
  updatedAt: number;
  stageId?: string;
  sceneId?: string;
}

export interface UpsertNotebookInput {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  subject?: string;
  source?: NotebookSource;
  stageId?: string;
  sceneId?: string;
}

const NOTEBOOK_STORAGE_KEY = 'anotherme:notebook:items:v1';
const LEGACY_NOTEBOOK_STORAGE_KEY = 'workspace:notebook:items';

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
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeNotebookNotes(notes: NotebookNote[]) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(notes));
}

export function readNotebookNotes(): NotebookNote[] {
  if (!hasWindowStorage()) return [];

  const primary = normalizeNoteList(safeJsonParse(window.localStorage.getItem(NOTEBOOK_STORAGE_KEY)));
  if (primary.length > 0) {
    return primary;
  }

  const legacy = normalizeNoteList(
    safeJsonParse(window.localStorage.getItem(LEGACY_NOTEBOOK_STORAGE_KEY)),
  );
  if (legacy.length > 0) {
    writeNotebookNotes(legacy);
    window.localStorage.removeItem(LEGACY_NOTEBOOK_STORAGE_KEY);
    return legacy;
  }

  return [];
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

  const next: NotebookNote = {
    id: noteId,
    title: input.title.trim() || '未命名笔记',
    content: input.content,
    tags: normalizeTags(input.tags),
    subject: input.subject?.trim() || '综合',
    source: input.source || 'manual',
    createdAt: current?.createdAt || now,
    updatedAt: now,
    stageId: input.stageId || current?.stageId,
    sceneId: input.sceneId || current?.sceneId,
  };

  const merged = [next, ...notes.filter((note) => note.id !== noteId)].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  writeNotebookNotes(merged);
  return next;
}

export function deleteNotebookNote(noteId: string) {
  const notes = readNotebookNotes();
  const next = notes.filter((note) => note.id !== noteId);
  writeNotebookNotes(next);
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
