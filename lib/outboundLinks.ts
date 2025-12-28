export type LinkSafety = {
  href: string;
  normalizedUrl: string | null;
  hostname: string | null;
  category: 'internal' | 'trusted' | 'untrusted' | 'blocked' | 'invalid';
  reason?: string;
};

const TRUSTED_DOMAIN_SUFFIXES = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'twitch.tv',
  'discord.com',
  'discord.gg',
  'reddit.com',
  'spotify.com',
  'soundcloud.com',
  'apple.com',
  'music.apple.com',
  'patreon.com',
  'kick.com',
  'linktr.ee',
];

const BLOCKED_DOMAIN_SUFFIXES = [
  'malware.test',
];

function normalizeHostname(hostname: string) {
  const h = hostname.trim().toLowerCase();
  return h.startsWith('www.') ? h.slice(4) : h;
}

function isIpAddress(hostname: string) {
  if (!hostname) return false;
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isPrivateIp(hostname: string) {
  if (!isIpAddress(hostname)) return false;
  const parts = hostname.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function matchesSuffix(hostname: string, suffix: string) {
  if (hostname === suffix) return true;
  return hostname.endsWith(`.${suffix}`);
}

export function normalizeUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : raw.startsWith('www.') ? `https://${raw}` : null;
  if (!candidate) return null;

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function getLinkSafety(href: string, currentOrigin?: string): LinkSafety {
  const normalizedUrl = normalizeUrl(href);
  if (!normalizedUrl) {
    return { href, normalizedUrl: null, hostname: null, category: 'invalid', reason: 'Invalid URL' };
  }

  let hostname: string | null = null;
  let origin: string | null = null;
  try {
    const u = new URL(normalizedUrl);
    hostname = normalizeHostname(u.hostname);
    origin = u.origin;
  } catch {
    return { href, normalizedUrl: null, hostname: null, category: 'invalid', reason: 'Invalid URL' };
  }

  if (currentOrigin && origin === currentOrigin) {
    return { href, normalizedUrl, hostname, category: 'internal' };
  }

  if (!hostname) {
    return { href, normalizedUrl, hostname: null, category: 'invalid', reason: 'Missing hostname' };
  }

  if (hostname === 'localhost' || hostname.endsWith('.local') || isPrivateIp(hostname)) {
    return { href, normalizedUrl, hostname, category: 'blocked', reason: 'Private or local address' };
  }

  const extraBlocked = (process.env.NEXT_PUBLIC_BLOCKED_DOMAIN_SUFFIXES || '')
    .split(',')
    .map((s) => normalizeHostname(s))
    .filter(Boolean);

  const extraTrusted = (process.env.NEXT_PUBLIC_TRUSTED_DOMAIN_SUFFIXES || '')
    .split(',')
    .map((s) => normalizeHostname(s))
    .filter(Boolean);

  for (const d of [...BLOCKED_DOMAIN_SUFFIXES, ...extraBlocked]) {
    const dd = normalizeHostname(d);
    if (!dd) continue;
    if (matchesSuffix(hostname, dd)) return { href, normalizedUrl, hostname, category: 'blocked', reason: 'Blocked domain' };
  }

  for (const d of [...TRUSTED_DOMAIN_SUFFIXES, ...extraTrusted]) {
    const dd = normalizeHostname(d);
    if (!dd) continue;
    if (matchesSuffix(hostname, dd)) return { href, normalizedUrl, hostname, category: 'trusted' };
  }

  if (isIpAddress(hostname)) {
    return { href, normalizedUrl, hostname, category: 'untrusted', reason: 'IP address' };
  }

  return { href, normalizedUrl, hostname, category: 'untrusted' };
}

export function extractUrlsFromText(text: string): string[] {
  const input = String(text || '');
  const re = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)\b/gi;
  const out: string[] = [];
  for (const m of input.matchAll(re)) {
    if (!m[0]) continue;
    const raw = m[0].replace(/[),.;!?]+$/, '');
    if (raw) out.push(raw);
  }
  return out;
}
