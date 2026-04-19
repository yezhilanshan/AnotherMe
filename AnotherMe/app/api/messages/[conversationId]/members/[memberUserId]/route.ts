import { NextRequest } from 'next/server';
import {
  isAnotherMe2GatewayError,
  removeGatewayConversationMember,
} from '@/lib/server/anotherme2-gateway';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveRequestUserId } from '@/lib/auth/request-user';
import { AuthError } from '@/lib/auth/types';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string; memberUserId: string }> },
) {
  try {
    const { conversationId, memberUserId } = await context.params;
    if (!conversationId || !memberUserId) {
      return apiError('INVALID_REQUEST', 400, 'Missing route params');
    }

    const body = (await request.json()) as {
      operatorUserId?: string;
    };

    const operatorUserId = await resolveRequestUserId(request, body.operatorUserId);

    const result = await removeGatewayConversationMember({
      conversationId,
      memberUserId,
      operatorUserId,
    });

    return apiSuccess({ result });
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
      error instanceof Error ? error.message : 'Failed to remove conversation member',
    );
  }
}
