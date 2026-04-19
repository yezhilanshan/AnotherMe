import 'server-only';

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  const derivedBuffer = Buffer.from(derived, 'hex');
  if (originalBuffer.length !== derivedBuffer.length) return false;
  return timingSafeEqual(originalBuffer, derivedBuffer);
}
