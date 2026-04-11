import Dexie, { type EntityTable } from 'dexie';

export type NotebookRecordStatus = 'generated' | 'failed' | 'processing';

export interface NotebookRecord {
  id: string;
  question: string;
  explanation: string;
  createdAt: number;
  imageDataUrl?: string;
  videoUrl?: string;
  tags?: string[];
  status: NotebookRecordStatus;
}

export interface StudyTaskRecord {
  id: string;
  title: string;
  description?: string;
  category: 'review' | 'practice' | 'preview';
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

class WorkspaceDatabase extends Dexie {
  notebookRecords!: EntityTable<NotebookRecord, 'id'>;
  studyTasks!: EntityTable<StudyTaskRecord, 'id'>;

  constructor() {
    super('AnotherMe-Workspace-Database');

    this.version(1).stores({
      notebookRecords: 'id, createdAt, status, *tags',
      studyTasks: 'id, dueDate, completed, priority, createdAt, [dueDate+completed]',
    });
  }
}

export const workspaceDb = new WorkspaceDatabase();
