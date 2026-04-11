import { workspaceDb, type NotebookRecord } from './workspace-db';
import { shiftLocalDateKey, toLocalDateKey } from './date-utils';

export type { NotebookRecord, NotebookRecordStatus } from './workspace-db';

const LEGACY_STORAGE_KEY = 'openmaic:workspace:notebook';
const LEGACY_MIGRATED_KEY = 'openmaic:workspace:notebook:migrated';

async function migrateLegacyNotebookRecords() {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(LEGACY_MIGRATED_KEY) === '1') return;

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
      return;
    }

    const parsed = JSON.parse(raw) as NotebookRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
      return;
    }

    const existingIds = new Set((await workspaceDb.notebookRecords.toArray()).map((r) => r.id));
    const recordsToImport = parsed.filter((record) => !existingIds.has(record.id));

    if (recordsToImport.length > 0) {
      await workspaceDb.notebookRecords.bulkPut(recordsToImport);
    }

    window.localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
  } catch {
    // Ignore migration errors and continue with IndexedDB reads.
  }
}

export async function loadNotebookRecords(): Promise<NotebookRecord[]> {
  await migrateLegacyNotebookRecords();
  return workspaceDb.notebookRecords.orderBy('createdAt').reverse().toArray();
}

export async function addNotebookRecord(record: NotebookRecord): Promise<void> {
  await workspaceDb.notebookRecords.put(record);
}

export async function deleteNotebookRecord(recordId: string): Promise<void> {
  await workspaceDb.notebookRecords.delete(recordId);
}

export async function getNotebookTagStats(limit = 8): Promise<Array<{ tag: string; count: number }>> {
  const records = await loadNotebookRecords();
  const counter = new Map<string, number>();

  for (const record of records) {
    for (const tag of record.tags || []) {
      const key = tag.trim();
      if (!key) continue;
      counter.set(key, (counter.get(key) || 0) + 1);
    }
  }

  return Array.from(counter.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getNotebookLearningCurve(
  days = 14,
): Promise<Array<{ date: string; count: number }>> {
  const records = await loadNotebookRecords();
  const dayMap = new Map<string, number>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const key = shiftLocalDateKey(today, -i);
    dayMap.set(key, 0);
  }

  for (const record of records) {
    const key = toLocalDateKey(record.createdAt);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
  }

  return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
}
