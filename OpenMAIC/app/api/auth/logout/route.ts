import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/server/api-response';
import { clearRequestSession, clearSessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await clearRequestSession(request);
  const response = apiSuccess({ loggedOut: true });
  clearSessionCookie(response);
  return response;
}
