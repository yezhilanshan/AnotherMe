import { NextRequest } from 'next/server';
import {
  createGatewayAIMessageFeedback,
  isAnotherMe2GatewayError,
} from '@/lib/server/anotherme2-gateway';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveRequestUserId } from '@/lib/auth/request-user';
import { AuthError } from '@/lib/auth/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await context.params;
    if (!messageId) {
      return apiError('INVALID_REQUEST', 400, 'Missing message id');
    }

    const body = (await request.json()) as {
      userId?: string;
      rating?: 'like' | 'dislike';
      feedbackText?: string;
    };

    if (!body.rating) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'rating is required');
    }
    const userId = await resolveRequestUserId(request, body.userId);

    const feedback = await createGatewayAIMessageFeedback({
      messageId,
      userId,
      rating: body.rating,
      feedbackText: body.feedbackText,
    });

    return apiSuccess({ feedback }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError('INVALID_REQUEST', error.status, error.message, error.code);
    }
    if (isAnotherMe2GatewayError(error)) {
      return apiError('UPSTREAM_ERROR', error.status, error.message);
    }
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to upsert ai feedback',
    );
  }
}
