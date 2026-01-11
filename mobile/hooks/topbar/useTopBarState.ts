import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { getRuntimeEnv } from '../../lib/env';

export type EnabledItemsMap = Record<string, boolean>;

type TopBarRefreshListener = () => void;

const topBarRefreshListeners = new Set<TopBarRefreshListener>();

export function subscribeTopBarRefresh(listener: TopBarRefreshListener): () => void {
  topBarRefreshListeners.add(listener);
  return () => {
    topBarRefreshListeners.delete(listener);
  };
}

export function emitTopBarRefresh(): void {
  for (const listener of Array.from(topBarRefreshListeners)) {
    try {
      listener();
    } catch {
    }
  }
}

export type TopBarState = {
  isLoggedIn: boolean;
  avatarUrl?: string;
  initials?: string;
  displayName?: string;
  unreadMessagesCount: number;
  unreadNotiesCount: number;
  showMessagesBadge: boolean;
  showNotiesBadge: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isMod: boolean;
  enabledItems: EnabledItemsMap;
  username: string | null;
};

const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
const OWNER_EMAILS = ['wcba.mo@gmail.com'];

function parseEnvList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAdminEnvIds(): string[] {
  return parseEnvList(getRuntimeEnv('EXPO_PUBLIC_ADMIN_PROFILE_IDS') ?? getRuntimeEnv('NEXT_PUBLIC_ADMIN_PROFILE_IDS'));
}

function getAdminEnvEmails(): string[] {
  return parseEnvList(getRuntimeEnv('EXPO_PUBLIC_ADMIN_EMAILS') ?? getRuntimeEnv('NEXT_PUBLIC_ADMIN_EMAILS')).map((s) => s.toLowerCase());
}

async function loadReadIds(userId: string): Promise<Set<string>> {
  try {
    const key = `noties_read_ids:${userId}`;
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set<string>();
    return new Set<string>(arr.map(String));
  } catch {
    return new Set<string>();
  }
}

async function saveReadIds(userId: string, ids: Set<string>): Promise<void> {
  try {
    const key = `noties_read_ids:${userId}`;
    await SecureStore.setItemAsync(key, JSON.stringify(Array.from(ids)));
  } catch {
  }
}

async function loadUnreadMessagesCount(params: { userId: string }): Promise<number> {
  if (!supabaseConfigured) return 0;
  const { data, error } = await supabase.rpc('get_im_conversations', { p_user_id: params.userId });
  if (error || !Array.isArray(data)) return 0;
  return data.reduce((sum: number, r: any) => sum + Number(r?.unread_count ?? 0), 0);
}

async function loadUnreadNotiesCount(params: { userId: string }): Promise<number> {
  if (!supabaseConfigured) return 0;

  const readIds = await loadReadIds(params.userId);

  // follows
  const { data: followers } = await supabase
    .from('follows')
    .select('id, follower_id, followee_id, followed_at')
    .eq('followee_id', params.userId)
    .order('followed_at', { ascending: false })
    .limit(50);

  const followNotieIds = (followers ?? []).map((f: any) => `follow:${String(f.id)}`);

  // live from followees
  const { data: following } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', params.userId)
    .limit(500);

  const followeeIds = Array.from(new Set((following ?? []).map((r: any) => String(r.followee_id)).filter(Boolean)));

  const { data: liveStreams } = followeeIds.length
    ? await supabase
        .from('live_streams')
        .select('id, profile_id, live_available, started_at')
        .in('profile_id', followeeIds)
        .eq('live_available', true)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(50)
    : { data: [] as any[] };

  const liveNotieIds = (liveStreams ?? []).map((ls: any) => {
    const startedAt = ls?.started_at ? String(ls.started_at) : '';
    return `live:${String(ls.id)}:${startedAt}`;
  });

  // purchases
  let purchaseNotieIds: string[] = [];
  try {
    const { data: ledgerRows, error: ledgerErr } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('user_id', params.userId)
      .eq('entry_type', 'coin_purchase')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!ledgerErr && Array.isArray(ledgerRows)) {
      purchaseNotieIds = ledgerRows.map((r: any) => `purchase:le:${String(r.id)}`);
    }
  } catch {
  }

  // gifts
  let giftNotieIds: string[] = [];
  try {
    const { data: giftLedger, error: giftLedgerErr } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('user_id', params.userId)
      .eq('entry_type', 'diamond_earn')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!giftLedgerErr && Array.isArray(giftLedger)) {
      giftNotieIds = giftLedger.map((r: any) => `gift:le:${String(r.id)}`);
    }
  } catch {
  }

  // conversions
  let conversionNotieIds: string[] = [];
  try {
    const { data: conversions, error: cvErr } = await supabase
      .from('diamond_conversions')
      .select('id, status')
      .eq('profile_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!cvErr && Array.isArray(conversions)) {
      conversionNotieIds = conversions
        .filter((r: any) => !r?.status || String(r.status) === 'completed')
        .map((r: any) => `conversion:${String(r.id)}`);
    }
  } catch {
  }

  const allIds = [...followNotieIds, ...liveNotieIds, ...giftNotieIds, ...purchaseNotieIds, ...conversionNotieIds];
  const unread = allIds.filter((id) => !readIds.has(id)).length;
  return unread;
}

export function useTopBarState(): TopBarState {
  const { user } = useAuthContext();

  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string>('');

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotiesCount, setUnreadNotiesCount] = useState(0);

  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMod, setIsMod] = useState(false);

  const reloadInFlight = useRef(false);
  const lastReloadAtRef = useRef<number>(0);

  const isLoggedIn = !!user;

  const initials = useMemo(() => {
    const base = (displayName || username || 'U').trim();
    return (base?.[0] ?? 'U').toUpperCase();
  }, [displayName, username]);

  const computeOwnerAdmin = useCallback(async () => {
    if (!user) {
      setIsOwner(false);
      setIsAdmin(false);
      setIsMod(false);
      return;
    }

    const uid = user.id;
    const email = (user.email ?? '').toLowerCase();

    const ownerByList = OWNER_IDS.includes(uid) || OWNER_EMAILS.includes(email);

    const envIds = getAdminEnvIds();
    const envEmails = getAdminEnvEmails();
    const hardcodedIds = OWNER_IDS;
    const hardcodedEmails = OWNER_EMAILS.map((e) => e.toLowerCase());
    const adminByList = (uid && (envIds.includes(uid) || hardcodedIds.includes(uid))) || (email && (envEmails.includes(email) || hardcodedEmails.includes(email)));

    let ownerByRpc = false;
    let adminByRpc = false;
    let modByRoles = false;

    if (supabaseConfigured) {
      try {
        const [{ data: okOwner }, { data: okAdmin }, { data: roomRoles }] = await Promise.all([
          supabase.rpc('is_owner', { p_profile_id: uid }),
          supabase.rpc('is_app_admin', { p_profile_id: uid }),
          supabase.from('room_roles').select('role').eq('profile_id', uid),
        ]);

        ownerByRpc = okOwner === true;
        adminByRpc = okAdmin === true;
        modByRoles = Array.isArray(roomRoles)
          ? roomRoles.some((r: any) => String(r?.role) === 'room_moderator' || String(r?.role) === 'room_admin')
          : false;
      } catch {
      }
    }

    setIsOwner(ownerByList || ownerByRpc);
    setIsAdmin(adminByList || adminByRpc);
    setIsMod(modByRoles);
  }, [user]);

  const loadProfile = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setUsername(null);
      setAvatarUrl(undefined);
      setDisplayName('');
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, display_name')
        .eq('id', user.id)
        .maybeSingle();

      setUsername(profileData?.username ?? null);
      setAvatarUrl(profileData?.avatar_url ?? undefined);
      setDisplayName(String(profileData?.display_name ?? ''));
    } catch {
      setUsername(null);
      setAvatarUrl(undefined);
      setDisplayName('');
    }
  }, [user]);

  const reloadCounts = useCallback(
    async (reason: string) => {
      if (!user) {
        setUnreadMessagesCount(0);
        setUnreadNotiesCount(0);
        return;
      }

      if (reloadInFlight.current) return;

      const now = Date.now();
      if (now - lastReloadAtRef.current < 750) return;

      reloadInFlight.current = true;
      lastReloadAtRef.current = now;

      try {
        const [m, n] = await Promise.all([
          loadUnreadMessagesCount({ userId: user.id }),
          loadUnreadNotiesCount({ userId: user.id }),
        ]);
        setUnreadMessagesCount(m);
        setUnreadNotiesCount(n);
      } catch {
        if (__DEV__) {
          console.warn('[TopBar] Failed to reload counts:', reason);
        }
      } finally {
        reloadInFlight.current = false;
      }
    },
    [user]
  );

  // bootstrap on auth changes
  useEffect(() => {
    void loadProfile();
    void computeOwnerAdmin();
    void reloadCounts('auth-change');
  }, [computeOwnerAdmin, loadProfile, reloadCounts]);

  // realtime subscriptions (equivalent to web behavior)
  useEffect(() => {
    if (!supabaseConfigured) return;
    const client = supabase;
    if (!user) return;

    const userId = user.id;

    const imChannel = client
      .channel(`topbar-im-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instant_messages' },
        () => {
          void reloadCounts('im-realtime');
        }
      )
      .subscribe();

    const followsChannel = client
      .channel(`topbar-noties-follows-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
        void reloadCounts('follows-realtime');
      })
      .subscribe();

    const txChannel = client
      .channel(`topbar-noties-tx-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ledger_entries', filter: `user_id=eq.${userId}` },
        () => {
          void reloadCounts('ledger-realtime');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diamond_conversions', filter: `profile_id=eq.${userId}` },
        () => {
          void reloadCounts('conversions-realtime');
        }
      )
      .subscribe();

    // live_streams are filtered client-side by followee list in web; here we just refresh on any change.
    const liveChannel = client
      .channel(`topbar-noties-live-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        void reloadCounts('live-realtime');
      })
      .subscribe();

    return () => {
      client.removeChannel(imChannel);
      client.removeChannel(followsChannel);
      client.removeChannel(txChannel);
      client.removeChannel(liveChannel);
    };
  }, [reloadCounts, user]);

  // manual refresh subscriptions (for local read-state changes, etc.)
  useEffect(() => {
    return subscribeTopBarRefresh(() => {
      void reloadCounts('manual-refresh');
    });
  }, [reloadCounts]);

  const showMessagesBadge = unreadMessagesCount > 0;
  const showNotiesBadge = unreadNotiesCount > 0;

  const enabledItems: EnabledItemsMap = useMemo(() => {
    const hasUsername = !!username;
    const canAuth = true;

    const base: EnabledItemsMap = {
      userMenu_login: !isLoggedIn && canAuth,
      userMenu_viewProfile: isLoggedIn && hasUsername,
      userMenu_editProfile: isLoggedIn,
      userMenu_wallet: isLoggedIn,
      userMenu_analytics: isLoggedIn,
      userMenu_themeToggle: true,
      userMenu_logout: isLoggedIn,

      optionsMenu_myProfile: isLoggedIn && hasUsername,
      optionsMenu_editProfile: isLoggedIn,
      optionsMenu_wallet: isLoggedIn,
      optionsMenu_transactions: isLoggedIn,
      optionsMenu_applyRoom: true,
      optionsMenu_roomRules: true,
      optionsMenu_helpFaq: true,
      optionsMenu_reportUser: isLoggedIn,
      optionsMenu_blockedUsers: isLoggedIn,

      optionsMenu_ownerPanel: isAdmin,
      optionsMenu_moderationPanel: isAdmin,
      optionsMenu_approveApplications: isAdmin,
      optionsMenu_manageGifts: isAdmin,
      optionsMenu_endAllStreams: isAdmin,
      optionsMenu_linklerPrompt: isAdmin,
    };

    return base;
  }, [isAdmin, isLoggedIn, username]);

  return {
    isLoggedIn,
    avatarUrl,
    initials,
    displayName: displayName || undefined,
    unreadMessagesCount,
    unreadNotiesCount,
    showMessagesBadge,
    showNotiesBadge,
    isOwner,
    isAdmin,
    isMod,
    enabledItems,
    username,
  };
}

export async function markNotiesAsRead(params: { userId: string; ids: string[] }) {
  if (!params.userId) return;
  const set = await loadReadIds(params.userId);
  for (const id of params.ids) {
    set.add(id);
  }
  await saveReadIds(params.userId, set);
}

export async function markAllNotiesAsRead(params: { userId: string; notieIds: string[] }) {
  await markNotiesAsRead({ userId: params.userId, ids: params.notieIds });
}
