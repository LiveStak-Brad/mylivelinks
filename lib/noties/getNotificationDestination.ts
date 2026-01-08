export type NotificationToastSpec = {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  secondaryLabel?: string;
  secondaryHref?: string;
};

export type NotificationDestination =
  | {
      kind: 'internal';
      href: string;
      toast?: NotificationToastSpec;
    }
  | {
      kind: 'external';
      url: string;
      toast?: NotificationToastSpec;
    };

function stripQueryAndHash(path: string) {
  const idxQ = path.indexOf('?');
  const idxH = path.indexOf('#');
  const idx = idxQ === -1 ? idxH : idxH === -1 ? idxQ : Math.min(idxQ, idxH);
  return idx === -1 ? path : path.slice(0, idx);
}

function normalizeActionUrl(actionUrl: string): { kind: 'path'; path: string } | { kind: 'external'; url: string } {
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

function safeString(value: unknown) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

export function getNotificationDestination(input: {
  type?: string;
  actionUrl?: string;
  metadata?: Record<string, any> | null;
  entity_type?: string | null;
  entity_id?: string | null;
  actor_username?: string | null;
}): NotificationDestination {
  const type = safeString(input.type).trim();

  if (input.actionUrl) {
    const normalized = normalizeActionUrl(input.actionUrl);
    if (normalized.kind === 'external') return { kind: 'external', url: normalized.url };

    const path = normalized.path;
    if (path) return { kind: 'internal', href: path };
  }

  const meta = input.metadata ?? {};

  switch (type) {
    case 'support': {
      const supportAppId =
        (process.env.MYLIVELINKS_APP_ID && process.env.MYLIVELINKS_APP_ID.trim()) ||
        '0b47a2d7-43fb-4d38-b321-2d5d0619aabf';
      return {
        kind: 'internal',
        href: `/messages?with=${encodeURIComponent(supportAppId)}`,
        toast: {
          title: 'Support replied',
          description: 'Open messages to view the response.',
          variant: 'info',
        },
      };
    }

    case 'follow':
    case 'follow_link': {
      const username = safeString(input.actor_username || meta.username || meta.actor_username).replace(/^@/, '');
      if (username) return { kind: 'internal', href: `/${encodeURIComponent(username)}` };

      return {
        kind: 'internal',
        href: '/noties',
        toast: { title: 'Details unavailable', description: 'This notification is missing profile details.', variant: 'warning' },
      };
    }

    case 'like_post': {
      const postId = safeString(input.entity_id || meta.post_id);
      if (postId) {
        return {
          kind: 'internal',
          toast: {
            title: 'Post details unavailable',
            description: 'Post deep-linking is not available yet. Opening the feed instead.',
            variant: 'info',
          },
          href: '/feed',
        };
      }

      return {
        kind: 'internal',
        href: '/feed',
        toast: { title: 'Details unavailable', description: 'Post reference missing.', variant: 'warning' },
      };
    }

    case 'comment':
    case 'like_comment': {
      const entityType = safeString(input.entity_type);
      const entityId = safeString(input.entity_id);
      if (entityType === 'post' && entityId) {
        return {
          kind: 'internal',
          href: '/feed',
          toast: {
            title: 'Comment details unavailable',
            description: 'Comment deep-linking is not available yet. Opening the feed instead.',
            variant: 'info',
          },
        };
      }

      return {
        kind: 'internal',
        href: '/feed',
        toast: { title: 'Details unavailable', description: 'Comment reference missing.', variant: 'warning' },
      };
    }

    case 'purchase':
    case 'conversion': {
      return { kind: 'internal', href: '/wallet' };
    }

    case 'gift': {
      const username = safeString(input.actor_username || meta.sender_username || meta.username).replace(/^@/, '');
      if (username) {
        return {
          kind: 'internal',
          href: `/${encodeURIComponent(username)}`,
          toast: {
            title: 'Gift received',
            description: 'View your wallet for full details.',
            variant: 'success',
            secondaryLabel: 'View Wallet',
            secondaryHref: '/wallet',
          },
        };
      }

      return {
        kind: 'internal',
        href: '/wallet',
        toast: { title: 'Gift received', description: 'View your wallet for details.', variant: 'success' },
      };
    }

    case 'team_invite': {
      const inviteId = meta?.invite_id;
      if (typeof inviteId === 'number' || typeof inviteId === 'string') {
        return { kind: 'internal', href: `/teams/invite/${encodeURIComponent(String(inviteId))}` };
      }

      const teamSlug = safeString(meta?.team_slug);
      if (teamSlug) return { kind: 'internal', href: `/teams/${encodeURIComponent(teamSlug)}` };

      return {
        kind: 'internal',
        href: '/teams',
        toast: { title: 'Details unavailable', description: 'Team invite details are missing.', variant: 'warning' },
      };
    }

    case 'team_invite_accepted': {
      const teamSlug = safeString(meta?.team_slug);
      if (teamSlug) return { kind: 'internal', href: `/teams/${encodeURIComponent(teamSlug)}` };
      return { kind: 'internal', href: '/teams' };
    }

    case 'team_join_request': {
      const teamSlug = safeString(meta?.team_slug);
      if (teamSlug) return { kind: 'internal', href: `/teams/${encodeURIComponent(teamSlug)}/admin` };

      return {
        kind: 'internal',
        href: '/teams',
        toast: { title: 'Details unavailable', description: 'Team request details are missing.', variant: 'warning' },
      };
    }

    case 'live': {
      // Priority 1: Use actionUrl if provided (already includes streaming_mode logic)
      if (input.actionUrl) {
        const normalized = normalizeActionUrl(input.actionUrl);
        if (normalized.kind === 'external') return { kind: 'external', url: normalized.url };
        const pathOnly = stripQueryAndHash(normalized.path || '');
        if (pathOnly) return { kind: 'internal', href: normalized.path };
      }

      // Priority 2: Check metadata for username and streaming_mode
      const streamingMode = safeString(meta.streaming_mode);
      const username = safeString(input.actor_username || meta.username).replace(/^@/, '');
      
      // Only route to Live Central if explicitly 'group' mode
      // Default to solo stream (most common case)
      if (streamingMode === 'group') {
        return { kind: 'internal', href: '/room/live-central' };
      }
      
      if (username) {
        // Solo stream (or unknown mode with username) - route to /live/{username}
        return { kind: 'internal', href: `/live/${encodeURIComponent(username)}` };
      }

      // Fallback: Go to LiveTV browse page
      return { kind: 'internal', href: '/liveTV' };
    }

    default: {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[Noties] Unknown notification type:', type || '(missing)', {
          actionUrl: input.actionUrl,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          metadata: input.metadata,
        });
      }
      return {
        kind: 'internal',
        href: '/noties',
        toast: { title: 'Notification', description: 'This notification type is not recognized.', variant: 'info' },
      };
    }
  }
}
