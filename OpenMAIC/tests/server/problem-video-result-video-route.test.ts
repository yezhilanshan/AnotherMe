import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const mockGetAnotherMe2ProblemVideoResult = vi.fn();

vi.mock('@/lib/server/anotherme2-gateway', () => ({
  getAnotherMe2ProblemVideoResult: mockGetAnotherMe2ProblemVideoResult,
  isAnotherMe2GatewayError: () => false,
}));

describe('problem-video result-video route', () => {
  let tempRoot = '';

  beforeEach(async () => {
    vi.resetModules();
    mockGetAnotherMe2ProblemVideoResult.mockReset();
    tempRoot = await mkdtemp(path.join(process.cwd(), '.tmp-problem-video-route-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('redirects to remote http url when result video is remote', async () => {
    const { GET } = await import('@/app/api/problem-video/[jobId]/result-video/route');
    mockGetAnotherMe2ProblemVideoResult.mockResolvedValue({
      video_url: 'http://127.0.0.1:9000/jobs/job_http/problem_video/final.mp4',
    });

    const response = await GET(
      new NextRequest('http://localhost/api/problem-video/job_http/result-video'),
      { params: Promise.resolve({ jobId: 'job_http' }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:9000/jobs/job_http/problem_video/final.mp4',
    );
  });

  it('rejects local paths outside expected job artifact pattern', async () => {
    const { GET } = await import('@/app/api/problem-video/[jobId]/result-video/route');
    mockGetAnotherMe2ProblemVideoResult.mockResolvedValue({
      video_url: path.join(tempRoot, 'not-allowed.mp4'),
    });

    const response = await GET(
      new NextRequest('http://localhost/api/problem-video/job_forbid/result-video'),
      { params: Promise.resolve({ jobId: 'job_forbid' }) },
    );

    const json = await response.json();
    expect(response.status).toBe(403);
    expect(json.errorCode).toBe('FILE_FORBIDDEN');
  });

  it('supports suffix byte-range requests', async () => {
    const { GET } = await import('@/app/api/problem-video/[jobId]/result-video/route');
    const jobId = 'job_suffix';
    const fileDir = path.join(tempRoot, 'jobs', jobId, 'problem_video');
    const filePath = path.join(fileDir, 'final.mp4');

    await mkdir(fileDir, { recursive: true });
    await writeFile(filePath, Buffer.from('0123456789', 'utf-8'));

    mockGetAnotherMe2ProblemVideoResult.mockResolvedValue({ video_url: filePath });

    const request = new NextRequest('http://localhost/api/problem-video/job_suffix/result-video', {
      headers: { range: 'bytes=-4' },
    });

    const response = await GET(request, { params: Promise.resolve({ jobId }) });
    const body = Buffer.from(await response.arrayBuffer()).toString('utf-8');

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 6-9/10');
    expect(body).toBe('6789');
  });

  it('returns 416 for invalid ranges', async () => {
    const { GET } = await import('@/app/api/problem-video/[jobId]/result-video/route');
    const jobId = 'job_invalid_range';
    const fileDir = path.join(tempRoot, 'jobs', jobId, 'problem_video');
    const filePath = path.join(fileDir, 'final.mp4');

    await mkdir(fileDir, { recursive: true });
    await writeFile(filePath, Buffer.from('0123456789', 'utf-8'));

    mockGetAnotherMe2ProblemVideoResult.mockResolvedValue({ video_url: filePath });

    const request = new NextRequest('http://localhost/api/problem-video/job_invalid_range/result-video', {
      headers: { range: 'bytes=20-10' },
    });

    const response = await GET(request, { params: Promise.resolve({ jobId }) });
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */10');
  });
});
