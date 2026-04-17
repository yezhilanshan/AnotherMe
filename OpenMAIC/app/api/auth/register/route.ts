import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createSession, registerUser } from '@/lib/auth/service';
import { AuthError } from '@/lib/auth/types';
import { attachSessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    const email = (body.email || '').trim();
    const password = body.password || '';
    const displayName = (body.displayName || '').trim();

    if (!email || !password) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'email and password are required');
    }

    const user = await registerUser({ email, password, displayName });
    const session = await createSession(user.id);

    const response = apiSuccess({ user }, 201);
    attachSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError('INVALID_REQUEST', error.status, error.message, error.code);
    }
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to register user',
    );
  }
}
