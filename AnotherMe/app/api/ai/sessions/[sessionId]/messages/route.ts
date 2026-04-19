import { NextRequest } from 'next/server';
import {
  createGatewayAIMessage,
  isAnotherMe2GatewayError,
  listGatewayAIMessages,
} from '@/lib/server/anotherme2-gateway';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveRequestUserId } from '@/lib/auth/request-user';
import { AuthError } from '@/lib/auth/types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId) {
      return apiError('INVALID_REQUEST', 400, 'Missing session id');
    }
    await resolveRequestUserId(request);

    const limit = Number(request.nextUrl.searchParams.get('limit') || '200');
    const messages = await listGatewayAIMessages({
      sessionId,
      limit: Number.isFinite(limit) ? limit : 200,
    });
    return apiSuccess({ messages });
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
      error instanceof Error ? error.message : 'Failed to list ai messages',
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId) {
      return apiError('INVALID_REQUEST', 400, 'Missing session id');
    }

    const body = (await request.json()) as {
      role?: 'user' | 'assistant' | 'system';
      content?: string;
      userId?: string;
      contentType?: string;
      modelName?: string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      latencyMs?: number;
      requestId?: string;
      parentMessageId?: string;
    };

    const role = body.role;
    const content = (body.content || '').trim();
    if (!role || !content) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'role and content are required');
    }
    const userId = await resolveRequestUserId(request, body.userId);

    const message = await createGatewayAIMessage({
      sessionId,
      role,
      content,
      userId,
      contentType: body.contentType,
      modelName: body.modelName,
      promptTokens: body.promptTokens,
      completionTokens: body.completionTokens,
      totalTokens: body.totalTokens,
      latencyMs: body.latencyMs,
      requestId: body.requestId,
      parentMessageId: body.parentMessageId,
    });

    return apiSuccess({ message }, 201);
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
      error instanceof Error ? error.message : 'Failed to create ai message',
    );
  }
}
