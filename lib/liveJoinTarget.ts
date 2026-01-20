/**
 * Live Join Target - Canonical routing logic for joining live streams
 * 
 * Determines the correct destination when a user taps/clicks a live stream
 * based on streaming mode and available metadata.
 */

export type LiveStreamingMode = 'solo' | 'group' | 'battle_solo' | 'battle_group';

export interface LiveLocation {
  mode: LiveStreamingMode;
  username?: string;
  profileId?: string;
  roomKey?: string;
  roomSlug?: string;
  battleId?: string;
}

export interface LiveJoinTargetWeb {
  kind: 'web';
  path: string;
  label?: string;
}

export interface LiveJoinTargetMobile {
  kind: 'mobile';
  screen: string;
  params: Record<string, any>;
  label?: string;
}

export type LiveJoinTarget = LiveJoinTargetWeb | LiveJoinTargetMobile;

/**
 * Parse live location from watch feed item or profile data
 */
export function parseLiveLocation(item: {
  streamingMode?: string | null;
  streaming_mode?: string | null;
  username?: string;
  authorId?: string;
  author_id?: string;
  roomKey?: string;
  room_key?: string;
  roomSlug?: string;
  room_slug?: string;
  battleId?: string;
  battle_id?: string;
}): LiveLocation | null {
  const mode = (item.streamingMode || item.streaming_mode) as LiveStreamingMode | null;
  
  if (!mode) {
    return null;
  }

  return {
    mode,
    username: item.username,
    profileId: item.authorId || item.author_id,
    roomKey: item.roomKey || item.room_key,
    roomSlug: item.roomSlug || item.room_slug,
    battleId: item.battleId || item.battle_id,
  };
}

/**
 * Get web route for live join target
 */
export function getLiveJoinTargetWeb(location: LiveLocation): LiveJoinTargetWeb | null {
  switch (location.mode) {
    case 'group': {
      // Group room requires room slug/key
      const slug = location.roomSlug || location.roomKey;
      if (!slug) {
        console.error('[LiveJoinTarget] Group mode missing room slug/key');
        return null;
      }
      // Normalize slug: live_central -> live-central for URL
      const normalizedSlug = slug.replace(/_/g, '-');
      return {
        kind: 'web',
        path: `/room/${normalizedSlug}`,
        label: 'Join Group Room',
      };
    }

    case 'solo': {
      // Solo requires username
      if (!location.username) {
        console.error('[LiveJoinTarget] Solo mode missing username');
        return null;
      }
      return {
        kind: 'web',
        path: `/live/${location.username}`,
        label: 'Join Solo Stream',
      };
    }

    case 'battle_solo': {
      // Battle solo - route to battle viewer (or solo with battle param)
      if (!location.battleId) {
        console.error('[LiveJoinTarget] Battle solo mode missing battleId');
        return null;
      }
      // TODO: Update when battle viewer route is finalized
      return {
        kind: 'web',
        path: `/battle/${location.battleId}`,
        label: 'Join Battle',
      };
    }

    case 'battle_group': {
      // Battle in group room
      const slug = location.roomSlug || location.roomKey;
      if (!slug || !location.battleId) {
        console.error('[LiveJoinTarget] Battle group mode missing slug or battleId');
        return null;
      }
      const normalizedSlug = slug.replace(/_/g, '-');
      return {
        kind: 'web',
        path: `/room/${normalizedSlug}?battle=${location.battleId}`,
        label: 'Join Battle Room',
      };
    }

    default:
      console.error('[LiveJoinTarget] Unknown streaming mode:', location.mode);
      return null;
  }
}

/**
 * Get mobile navigation target for live join
 */
export function getLiveJoinTargetMobile(location: LiveLocation): LiveJoinTargetMobile | null {
  switch (location.mode) {
    case 'group': {
      // Group room requires room slug/key
      const slug = location.roomSlug || location.roomKey;
      if (!slug) {
        console.error('[LiveJoinTarget] Group mode missing room slug/key');
        return null;
      }
      // Mobile RoomScreen expects slug param
      return {
        kind: 'mobile',
        screen: 'RoomScreen',
        params: { slug },
        label: 'Join Group Room',
      };
    }

    case 'solo': {
      // Solo requires username
      if (!location.username) {
        console.error('[LiveJoinTarget] Solo mode missing username');
        return null;
      }
      return {
        kind: 'mobile',
        screen: 'LiveUserScreen',
        params: { username: location.username },
        label: 'Join Solo Stream',
      };
    }

    case 'battle_solo': {
      // Battle solo
      if (!location.battleId) {
        console.error('[LiveJoinTarget] Battle solo mode missing battleId');
        return null;
      }
      // TODO: Update when mobile battle screen is finalized
      return {
        kind: 'mobile',
        screen: 'BattleScreen',
        params: { battleId: location.battleId },
        label: 'Join Battle',
      };
    }

    case 'battle_group': {
      // Battle in group room
      const slug = location.roomSlug || location.roomKey;
      if (!slug || !location.battleId) {
        console.error('[LiveJoinTarget] Battle group mode missing slug or battleId');
        return null;
      }
      return {
        kind: 'mobile',
        screen: 'RoomScreen',
        params: { slug, battleId: location.battleId },
        label: 'Join Battle Room',
      };
    }

    default:
      console.error('[LiveJoinTarget] Unknown streaming mode:', location.mode);
      return null;
  }
}
