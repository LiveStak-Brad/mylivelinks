export type ResolvedNotieAction = { route: string; params: Record<string, string> };

function stripQueryAndHash(path: string) {
  const idxQ = path.indexOf('?');
  const idxH = path.indexOf('#');
  const idx = idxQ === -1 ? idxH : idxH === -1 ? idxQ : Math.min(idxQ, idxH);
  return idx === -1 ? path : path.slice(0, idx);
}

function normalizeToPath(actionUrl: string): { kind: 'path'; path: string } | { kind: 'external'; url: string } {
  const raw = typeof actionUrl === 'string' ? actionUrl.trim() : '';
  if (!raw) return { kind: 'path', path: '' };

  if (raw.startsWith('mylivelinks://')) {
    const rest = raw.slice('mylivelinks://'.length).replace(/^\/+/, '');
    return { kind: 'path', path: `/${rest}` };
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      const host = String(u.hostname || '').toLowerCase();
      if (host === 'mylivelinks.com' || host === 'www.mylivelinks.com') {
        return { kind: 'path', path: `${u.pathname || ''}${u.search || ''}${u.hash || ''}` };
      }
      return { kind: 'external', url: raw };
    } catch {
      return { kind: 'external', url: raw };
    }
  }

  if (raw.startsWith('/')) return { kind: 'path', path: raw };

  return { kind: 'path', path: `/${raw}` };
}

export function resolveNotieAction(actionUrl: string): ResolvedNotieAction | null {
  const normalized = normalizeToPath(actionUrl);
  if (normalized.kind === 'external') {
    return { route: 'external', params: { url: normalized.url } };
  }

  const originalPath = normalized.path;
  if (!originalPath) return null;

  const pathOnly = stripQueryAndHash(originalPath);

  if (pathOnly === '/wallet' || pathOnly.startsWith('/wallet/')) return { route: 'wallet', params: {} };
  if (pathOnly === '/me/analytics' || pathOnly.startsWith('/me/analytics/')) return { route: 'my_analytics', params: {} };
  if (pathOnly === '/rooms' || pathOnly.startsWith('/rooms/')) return { route: 'rooms', params: {} };
  if (pathOnly === '/live' || pathOnly.startsWith('/live/')) return { route: 'live', params: {} };
  if (pathOnly === '/feed' || pathOnly.startsWith('/feed/')) return { route: 'feed', params: {} };
  if (pathOnly === '/messages' || pathOnly.startsWith('/messages/')) return { route: 'messages', params: {} };
  if (pathOnly === '/noties' || pathOnly.startsWith('/noties/')) return { route: 'noties', params: {} };
  if (pathOnly === '/gifter-levels' || pathOnly.startsWith('/gifter-levels/')) return { route: 'gifter_levels', params: {} };
  if (pathOnly === '/settings/profile' || pathOnly.startsWith('/settings/profile/')) return { route: 'settings_profile', params: {} };

  if (pathOnly.startsWith('/u/')) {
    const username = pathOnly.split('/')[2] || '';
    return username ? { route: 'profile', params: { username } } : null;
  }

  if (pathOnly.startsWith('/p/')) {
    const username = pathOnly.split('/')[2] || '';
    return username ? { route: 'profile', params: { username } } : null;
  }

  if (pathOnly.startsWith('/invite/')) {
    const username = pathOnly.split('/')[2] || '';
    return username ? { route: 'invite', params: { username } } : { route: 'invite', params: {} };
  }

  const match = pathOnly.match(/^\/([^/?#]+)$/);
  if (match?.[1]) {
    const slug = match[1];
    const reserved = new Set([
      'wallet',
      'rooms',
      'feed',
      'messages',
      'noties',
      'live',
      'me',
      'settings',
      'p',
      'u',
      'invite',
      'join',
      'apply',
      'login',
      'signup',
      'gifter-levels',
    ]);

    if (!reserved.has(slug.toLowerCase())) {
      return { route: 'profile', params: { username: slug } };
    }
  }

  return null;
}
