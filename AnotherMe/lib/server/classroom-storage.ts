import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

export function buildRequestOrigin(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin;
}

export interface PersistedClassroomData {
  id: string;
  stage: Stage;
  scenes: Scene[];
  createdAt: string;
}

export interface ClassroomSummary {
  id: string;
  title: string;
  language?: string;
  createdAt: string;
  scenesCount: number;
  sceneTypes: Array<Scene['type']>;
}

export function isValidClassroomId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  const filePath = path.join(CLASSROOMS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as PersistedClassroomData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listClassroomSummaries(limit = 50): Promise<ClassroomSummary[]> {
  await ensureClassroomsDir();

  const files = await fs.readdir(CLASSROOMS_DIR);
  const jsonFiles = files.filter((name) => name.endsWith('.json'));

  const safeLimit = Math.max(1, Math.min(limit, 100));
  // Use file mtime as a cheap pre-sort to avoid parsing every classroom file.
  const candidates = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const filePath = path.join(CLASSROOMS_DIR, fileName);
      const stat = await fs.stat(filePath);
      return { fileName, filePath, mtimeMs: stat.mtimeMs };
    }),
  );

  const selectedFiles = candidates
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, safeLimit * 3);

  const summaries: ClassroomSummary[] = [];

  for (const file of selectedFiles) {
    try {
      const content = await fs.readFile(file.filePath, 'utf-8');
      const item = JSON.parse(content) as Partial<PersistedClassroomData>;

      if (!item.id || !item.createdAt) continue;

      const scenes = Array.isArray(item.scenes) ? item.scenes : [];
      const stageName = item.stage && typeof item.stage === 'object' ? item.stage.name : undefined;
      const stageLanguage =
        item.stage && typeof item.stage === 'object' ? item.stage.language : undefined;

      summaries.push({
        id: item.id,
        title: stageName || item.id,
        language: stageLanguage,
        createdAt: item.createdAt,
        scenesCount: scenes.length,
        sceneTypes: Array.from(new Set(scenes.map((scene) => scene.type))),
      });
    } catch {
      // Skip unreadable/corrupted files to keep the list endpoint resilient.
      continue;
    }
  }

  return summaries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeLimit);
}

export async function persistClassroom(
  data: {
    id: string;
    stage: Stage;
    scenes: Scene[];
  },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
  };

  await ensureClassroomsDir();
  const filePath = path.join(CLASSROOMS_DIR, `${data.id}.json`);
  await writeJsonFileAtomic(filePath, classroomData);

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}
