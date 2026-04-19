import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createAnotherMe2ProblemVideoJob,
  isAnotherMe2GatewayError,
  uploadProblemImageToAnotherMe2,
} from '@/lib/server/anotherme2-gateway';

const DEFAULT_POLL_INTERVAL_MS = 3000;

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const problemText = String(formData.get('problemText') || '').trim();

    if (!(image instanceof File) || image.size <= 0) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Problem image is required');
    }

    const upload = await uploadProblemImageToAnotherMe2(image);
    const job = await createAnotherMe2ProblemVideoJob({
      imageObjectKey: upload.object_key,
      ...(problemText ? { problemText } : {}),
    });

    return apiSuccess(
      {
        jobId: job.job_id,
        status: job.status,
        step: job.step,
        progress: job.progress,
        pollUrl: `/api/problem-video/${job.job_id}`,
        pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      },
      202,
    );
  } catch (error) {
    if (isAnotherMe2GatewayError(error)) {
      return apiError('UPSTREAM_ERROR', error.status, error.message);
    }
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to create AnotherMe2 problem video job',
    );
  }
}
