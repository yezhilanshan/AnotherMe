import { workspaceDb, type StudyTaskRecord } from './workspace-db';
import { shiftLocalDateKey } from './date-utils';

export type CreateStudyTaskInput = Omit<StudyTaskRecord, 'createdAt' | 'updatedAt'>;

export async function listStudyTasks(): Promise<StudyTaskRecord[]> {
  return workspaceDb.studyTasks.orderBy('dueDate').toArray();
}

export async function addStudyTask(task: CreateStudyTaskInput): Promise<void> {
  const now = Date.now();
  await workspaceDb.studyTasks.put({ ...task, createdAt: now, updatedAt: now });
}

export async function toggleStudyTask(taskId: string, completed: boolean): Promise<void> {
  await workspaceDb.studyTasks.update(taskId, { completed, updatedAt: Date.now() });
}

export async function deleteStudyTask(taskId: string): Promise<void> {
  await workspaceDb.studyTasks.delete(taskId);
}

export async function ensureDefaultTasks(): Promise<void> {
  const existing = await workspaceDb.studyTasks.count();
  if (existing > 0) return;

  const today = new Date();
  const toDate = (offset: number) => shiftLocalDateKey(today, offset);

  const defaults: StudyTaskRecord[] = [
    {
      id: 'task-review-notebook',
      title: '复盘错题本里的 2 道重点题',
      description: '重新看一遍讲解视频，并为每道题写一句自己的结论。',
      category: 'review',
      dueDate: toDate(0),
      completed: false,
      priority: 'high',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'task-practice-linear',
      title: '完成一次一次方程专项练习',
      description: '做完 10 道短题，顺手检查解题速度和易错步骤。',
      category: 'practice',
      dueDate: toDate(1),
      completed: false,
      priority: 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'task-preview-next-class',
      title: '预习下一节课主题',
      description: '在上课前快速看完前 3 页内容，提前建立问题意识。',
      category: 'preview',
      dueDate: toDate(2),
      completed: false,
      priority: 'low',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  await workspaceDb.studyTasks.bulkPut(defaults);
}
