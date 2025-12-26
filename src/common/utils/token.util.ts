import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateUuid(): string {
  return uuidv4();
}

export function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSearchHash(criteria: Record<string, unknown>): string {
  const sorted = JSON.stringify(criteria, Object.keys(criteria).sort());
  return crypto.createHash('md5').update(sorted).digest('hex');
}
