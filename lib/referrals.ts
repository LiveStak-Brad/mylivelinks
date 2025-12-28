import { createHash } from 'crypto';

export type ReferralRange = '7d' | '30d' | 'all';

export function normalizeReferralCode(code: string): string {
  return String(code ?? '').trim().toLowerCase();
}

export function getReferralHashSalt(): string {
  const salt = (process.env.REFERRAL_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!salt) {
    throw new Error('MISSING_REFERRAL_HASH_SALT');
  }
  return salt;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashDeviceId(deviceId: string | null | undefined): string | null {
  const v = typeof deviceId === 'string' ? deviceId.trim() : '';
  if (!v) return null;
  const salt = getReferralHashSalt();
  return sha256Hex(`${v}${salt}`);
}

export function hashIp(ip: string | null | undefined): string | null {
  const v = typeof ip === 'string' ? ip.trim() : '';
  if (!v) return null;
  const salt = getReferralHashSalt();
  return sha256Hex(`${v}${salt}`);
}

export function getRequestIp(request: { headers: Headers; ip?: string | null }): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri && xri.trim()) return xri.trim();
  const ip = typeof request.ip === 'string' ? request.ip.trim() : '';
  if (ip) return ip;
  return null;
}

export function parseReferralRange(v: string | null): { range: ReferralRange; since: Date | null } {
  const raw = (v ?? '7d').trim().toLowerCase();
  if (raw === 'all') return { range: 'all', since: null };
  if (raw === '7d') return { range: '7d', since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  if (raw === '30d') return { range: '30d', since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  throw new Error('INVALID_RANGE');
}

export function clampLeaderboardLimit(v: string | null): number {
  const n = parseInt(String(v ?? ''), 10);
  if (n === 5 || n === 100) return n;
  return 5;
}
