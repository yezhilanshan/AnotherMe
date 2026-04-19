import 'server-only';

import type { NextRequest } from 'next/server';
import { requireAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { AuthError } from '@/lib/auth/types';

export async function resolveRequestUserId(
  request: NextRequest,
  incomingUserId?: string | null,
): Promise<string> {
  const user = await requireAuthenticatedUserFromRequest(request);
  const requested = (incomingUserId || '').trim();
  if (requested && requested !== user.id) {
    throw new AuthError('UNAUTHORIZED', '无权操作其他用户的数据。', 403);
  }
  return user.id;
}
