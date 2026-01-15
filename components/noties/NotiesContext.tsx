'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

// Notification types
export type NotieType =
  | 'gift'
  | 'follow'
  | 'follow_link'
  | 'live'
  | 'support'
  | 'mention'
  | 'comment'
  | 'like_post'
  | 'like_comment'
  | 'level_up'
  | 'system'
  | 'purchase'
  | 'conversion'
  | 'team_invite'
  | 'team_invite_accepted'
  | 'team_join_request';

export interface Notie {
  id: string;
  type: NotieType;
  title: string;
  message: string;
  avatarUrl?: string;
  avatarFallback?: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotiesContextType {
  noties: Notie[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNoties: () => Promise<void>;
}

const NotiesContext = createContext<NotiesContextType | undefined>(undefined);

export function NotiesProvider({ children }: { children: ReactNode }) {
  const [noties, setNoties] = useState<Notie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const getReadStorageKey = useCallback((userId: string) => `noties_read_ids:${userId}`, []);

  const loadReadIds = useCallback((userId: string) => {
    try {
      if (typeof window === 'undefined') return new Set<string>();
      const raw = window.localStorage.getItem(getReadStorageKey(userId));
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set<string>();
      return new Set<string>(arr.map(String));
    } catch {
      return new Set<string>();
    }
  }, [getReadStorageKey]);

  const saveReadIds = useCallback((userId: string, ids: Set<string>) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(getReadStorageKey(userId), JSON.stringify(Array.from(ids)));
    } catch {
    }
  }, [getReadStorageKey]);

  const unreadCount = noties.filter(n => !n.isRead).length;

  const loadNoties = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNoties([]);
        return;
      }

      const readIds = loadReadIds(user.id);

      const { data: followers } = await supabase
        .from('follows')
        .select('id, follower_id, followee_id, followed_at')
        .eq('followee_id', user.id)
        .order('followed_at', { ascending: false })
        .limit(50);

      const followerIds = (followers || []).map((f: any) => String(f.follower_id)).filter(Boolean);
      const { data: followerProfiles } = followerIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name')
            .in('id', followerIds)
        : { data: [] as any[] };
      const followerProfileById = new Map<string, any>();
      for (const p of Array.isArray(followerProfiles) ? followerProfiles : []) {
        if (p?.id) followerProfileById.set(String(p.id), p);
      }

      const followNoties: Notie[] = (followers || []).map((f: any) => {
        const id = `follow:${String(f.id)}`;
        const p = followerProfileById.get(String(f.follower_id));
        const username = String(p?.username ?? 'Someone');
        const displayName = String(p?.display_name ?? '') || username;
        const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
        return {
          id,
          type: 'follow',
          title: 'New Follower',
          message: `${displayName} started following you`,
          avatarUrl: p?.avatar_url ?? undefined,
          avatarFallback,
          isRead: readIds.has(id),
          createdAt: f.followed_at ? new Date(f.followed_at) : new Date(),
          actionUrl: `/${username}`,
          metadata: { follower_id: String(f.follower_id) },
        };
      });

      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)
        .limit(500);
      const followeeIds = Array.from(new Set((following || []).map((r: any) => String(r.followee_id)).filter(Boolean)));

      // Fetch live streams with streaming_mode to determine correct routing
      const { data: liveStreams } = followeeIds.length
        ? await supabase
            .from('live_streams')
            .select('id, profile_id, live_available, started_at, streaming_mode')
            .in('profile_id', followeeIds)
            .eq('live_available', true)
            .order('started_at', { ascending: false, nullsFirst: false })
            .limit(50)
        : { data: [] as any[] };

      const liveUserIds = (liveStreams || []).map((ls: any) => String(ls.profile_id)).filter(Boolean);
      const { data: liveProfiles } = liveUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name')
            .in('id', liveUserIds)
        : { data: [] as any[] };
      const liveProfileById = new Map<string, any>();
      for (const p of Array.isArray(liveProfiles) ? liveProfiles : []) {
        if (p?.id) liveProfileById.set(String(p.id), p);
      }

      const liveNoties: Notie[] = (liveStreams || []).map((ls: any) => {
        const startedAt = ls.started_at ? String(ls.started_at) : '';
        const id = `live:${String(ls.id)}:${startedAt}`;
        const p = liveProfileById.get(String(ls.profile_id));
        const username = String(p?.username ?? 'Someone');
        const displayName = String(p?.display_name ?? '') || username;
        const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
        // Default to 'solo' since that's the most common streaming mode
        // NULL/undefined streaming_mode should route to solo stream
        const streamingMode = String(ls.streaming_mode || 'solo');
        
        // Route to correct destination based on streaming mode:
        // - Solo streams: /live/{username} (user's solo stream page)
        // - Group streams: /room/live-central (group live room)
        // Default: solo stream (most common case)
        const actionUrl = streamingMode === 'group' 
          ? '/room/live-central'
          : `/live/${encodeURIComponent(username)}`;
        
        return {
          id,
          type: 'live',
          title: 'Live Now',
          message: `${displayName} is live now`,
          avatarUrl: p?.avatar_url ?? undefined,
          avatarFallback,
          isRead: readIds.has(id),
          createdAt: ls.started_at ? new Date(ls.started_at) : new Date(),
          actionUrl,
          metadata: { 
            profile_id: String(ls.profile_id), 
            live_stream_id: String(ls.id),
            streaming_mode: streamingMode,
            username,
          },
        };
      });

      let purchaseNoties: Notie[] = [];
      try {
        const { data: ledgerRows, error: ledgerErr } = await supabase
          .from('ledger_entries')
          .select('id, entry_type, delta_coins, amount_usd_cents, created_at')
          .eq('user_id', user.id)
          .eq('entry_type', 'coin_purchase')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!ledgerErr && Array.isArray(ledgerRows)) {
          purchaseNoties = ledgerRows.map((r: any) => {
            const coins = Number(r.delta_coins ?? 0);
            const cents = Number(r.amount_usd_cents ?? 0);
            const id = `purchase:le:${String(r.id)}`;
            return {
              id,
              type: 'purchase',
              title: 'Purchase Complete',
              message: cents > 0 ? `Purchase complete: +${coins} coins` : `Purchase complete: +${coins} coins`,
              avatarFallback: '✓',
              isRead: readIds.has(id),
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              actionUrl: '/wallet',
              metadata: { coins, usd_cents: cents },
            };
          });
        }
      } catch {
      }

      let giftNoties: Notie[] = [];
      try {
        const { data: giftLedger, error: giftLedgerErr } = await supabase
          .from('ledger_entries')
          .select('id, entry_type, delta_diamonds, provider_ref, created_at')
          .eq('user_id', user.id)
          .eq('entry_type', 'diamond_earn')
          .order('created_at', { ascending: false })
          .limit(50);

        const parseGiftId = (providerRef: unknown): number | null => {
          if (!providerRef) return null;
          const s = String(providerRef);
          if (!s.startsWith('gift:')) return null;
          const raw = s.split(':')[1];
          const n = raw ? parseInt(raw, 10) : NaN;
          return Number.isFinite(n) ? n : null;
        };

        if (!giftLedgerErr && Array.isArray(giftLedger)) {
          const giftIds = Array.from(
            new Set(giftLedger.map((r: any) => parseGiftId(r.provider_ref)).filter((n: any) => Number.isFinite(n)))
          ) as number[];

          const { data: gifts } = giftIds.length
            ? await supabase
                .from('gifts')
                .select('id, sender_id, recipient_id, coin_amount, diamonds_awarded')
                .in('id', giftIds)
            : { data: [] as any[] };

          const giftById = new Map<number, any>();
          for (const g of Array.isArray(gifts) ? gifts : []) {
            const idNum = Number(g?.id);
            if (Number.isFinite(idNum)) giftById.set(idNum, g);
          }

          const senderIds = Array.from(
            new Set(
              (Array.isArray(gifts) ? gifts : [])
                .map((g: any) => String(g?.sender_id ?? ''))
                .filter(Boolean)
            )
          );

          const { data: senderProfiles } = senderIds.length
            ? await supabase
                .from('profiles')
                .select('id, username, avatar_url, display_name')
                .in('id', senderIds)
            : { data: [] as any[] };

          const senderById = new Map<string, any>();
          for (const p of Array.isArray(senderProfiles) ? senderProfiles : []) {
            if (p?.id) senderById.set(String(p.id), p);
          }

          giftNoties = giftLedger.map((r: any) => {
            const id = `gift:le:${String(r.id)}`;
            const giftId = parseGiftId(r.provider_ref);
            const gift = giftId != null ? giftById.get(giftId) : null;
            const senderId = gift?.sender_id ? String(gift.sender_id) : '';
            const sender = senderId ? senderById.get(senderId) : null;
            const username = String(sender?.username ?? 'Someone');
            const displayName = String(sender?.display_name ?? '') || username;
            const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
            const diamonds = Number(r.delta_diamonds ?? gift?.diamonds_awarded ?? 0);
            const coins = Number(gift?.coin_amount ?? 0);
            return {
              id,
              type: 'gift',
              title: 'New Gift',
              message: `${displayName} sent you +${diamonds} diamonds`,
              avatarUrl: sender?.avatar_url ?? undefined,
              avatarFallback,
              isRead: readIds.has(id),
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              actionUrl: `/${username}`,
              metadata: {
                gift_id: giftId ?? undefined,
                sender_id: senderId || undefined,
                coins_spent: coins,
                diamonds_awarded: diamonds,
              },
            };
          });
        }
      } catch {
      }

      let conversionNoties: Notie[] = [];
      try {
        const { data: conversions, error: cvErr } = await supabase
          .from('diamond_conversions')
          .select('id, diamonds_in, coins_out, status, completed_at, created_at')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!cvErr && Array.isArray(conversions)) {
          conversionNoties = conversions
            .filter((r: any) => !r.status || String(r.status) === 'completed')
            .map((r: any) => {
              const diamondsIn = Number(r.diamonds_in ?? 0);
              const coinsOut = Number(r.coins_out ?? 0);
              const at = r.completed_at || r.created_at;
              const id = `conversion:${String(r.id)}`;
              return {
                id,
                type: 'conversion',
                title: 'Conversion Complete',
                message: `Converted ${diamondsIn} diamonds to ${coinsOut} coins`,
                avatarFallback: '✓',
                isRead: readIds.has(id),
                createdAt: at ? new Date(at) : new Date(),
                actionUrl: '/wallet',
                metadata: { diamonds_in: diamondsIn, coins_out: coinsOut },
              };
            });
        }
      } catch {
      }

      // Load notifications from the notifications table
      let teamInviteNoties: Notie[] = [];
      let supportNoties: Notie[] = [];
      try {
        const { data: teamNotifs } = await supabase
          .from('notifications')
          .select('id, actor_id, type, entity_type, entity_id, message, read, created_at')
          .eq('recipient_id', user.id)
          .in('type', ['team_invite', 'team_invite_accepted', 'team_join_request'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (teamNotifs && teamNotifs.length > 0) {
          // Get actor profiles
          const actorIds = [...new Set(teamNotifs.map((n: any) => n.actor_id))];
          const { data: actorProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name')
            .in('id', actorIds);

          const actorById = new Map<string, any>();
          for (const p of actorProfiles || []) {
            if (p?.id) actorById.set(p.id, p);
          }

          // Get team info for invite notifications
          const teamIds = [...new Set(teamNotifs.filter((n: any) => n.entity_type === 'team').map((n: any) => n.entity_id))];
          const { data: teams } = teamIds.length > 0
            ? await supabase.from('teams').select('id, name, slug, icon_url').in('id', teamIds)
            : { data: [] };

          const teamById = new Map<string, any>();
          for (const t of teams || []) {
            if (t?.id) teamById.set(t.id, t);
          }

          // Get invite IDs to include in metadata
          const { data: invites } = await supabase
            .from('team_invites')
            .select('id, team_id, inviter_id, status')
            .eq('invitee_id', user.id)
            .eq('status', 'pending');

          const inviteByTeamAndInviter = new Map<string, any>();
          for (const inv of invites || []) {
            const key = `${inv.team_id}:${inv.inviter_id}`;
            inviteByTeamAndInviter.set(key, inv);
          }

          teamInviteNoties = teamNotifs.map((n: any) => {
            const id = `notif:${n.id}`;
            const actor = actorById.get(n.actor_id);
            const team = n.entity_type === 'team' ? teamById.get(n.entity_id) : null;
            const username = actor?.username || 'Someone';
            const displayName = actor?.display_name || username;
            const avatarFallback = (displayName?.[0] || '?').toUpperCase();

            // Find the invite for this notification
            const inviteKey = `${n.entity_id}:${n.actor_id}`;
            const invite = inviteByTeamAndInviter.get(inviteKey);
            const pendingInviteUrl = n.type === 'team_invite' && invite?.id
              ? `/teams/invite/${invite.id}`
              : null;
            const fallbackTeamUrl = team?.slug ? `/teams/${team.slug}` : '/teams';
            
            // For join requests, link to admin panel
            const joinRequestUrl = n.type === 'team_join_request' && team?.slug
              ? `/teams/${team.slug}/admin`
              : null;

            // Determine title based on type
            let title = 'Team Notification';
            if (n.type === 'team_invite') title = 'Team Invite';
            else if (n.type === 'team_invite_accepted') title = 'Invite Accepted';
            else if (n.type === 'team_join_request') title = 'Join Request';

            return {
              id,
              type: n.type as NotieType,
              title,
              message: n.message || `${displayName} invited you to join a team`,
              avatarUrl: actor?.avatar_url,
              avatarFallback,
              isRead: readIds.has(id) || n.read,
              createdAt: new Date(n.created_at),
              actionUrl: joinRequestUrl ?? pendingInviteUrl ?? fallbackTeamUrl,
              metadata: {
                team_id: n.entity_id,
                team_name: team?.name,
                team_slug: team?.slug,
                invite_id: invite?.id,
                actor_id: n.actor_id,
              },
            };
          });
        }
      } catch (err) {
        console.error('[Noties] Team invite error:', err);
      }

      try {
        const { data: rawSupport } = await supabase
          .from('notifications')
          .select('id, actor_id, type, entity_type, entity_id, message, read, created_at')
          .eq('recipient_id', user.id)
          .eq('type', 'support')
          .order('created_at', { ascending: false })
          .limit(25);

        if (rawSupport && rawSupport.length > 0) {
          const actorIds = [...new Set(rawSupport.map((n: any) => n.actor_id).filter(Boolean))];
          const { data: actorProfiles } = actorIds.length
            ? await supabase.from('profiles').select('id, username, avatar_url, display_name').in('id', actorIds)
            : { data: [] as any[] };

          const actorById = new Map<string, any>();
          for (const p of actorProfiles || []) {
            if (p?.id) actorById.set(String(p.id), p);
          }

          supportNoties = rawSupport.map((n: any) => {
            const id = `notif:${n.id}`;
            const actor = actorById.get(String(n.actor_id));
            const username = actor?.username || 'Support';
            const displayName = actor?.display_name || username;
            const avatarFallback = (displayName?.[0] || 'S').toUpperCase();
            return {
              id,
              type: 'support' as NotieType,
              title: 'Support replied',
              message: n.message || 'Support replied',
              avatarUrl: actor?.avatar_url,
              avatarFallback,
              isRead: readIds.has(id) || n.read,
              createdAt: new Date(n.created_at),
              actionUrl: '/noties',
              metadata: {
                actor_id: n.actor_id,
                entity_type: n.entity_type,
                entity_id: n.entity_id,
              },
            };
          });
        }
      } catch (err) {
        console.error('[Noties] Support noties error:', err);
      }

      // Also fetch gift notifications from notifications table (for post_id context)
      let giftNotifNoties: Notie[] = [];
      try {
        const { data: giftNotifs } = await supabase
          .from('notifications')
          .select('id, actor_id, type, entity_type, entity_id, message, read, created_at')
          .eq('recipient_id', user.id)
          .eq('type', 'gift')
          .order('created_at', { ascending: false })
          .limit(50);

        if (giftNotifs && giftNotifs.length > 0) {
          const actorIds = [...new Set(giftNotifs.map((n: any) => n.actor_id).filter(Boolean))];
          const { data: actorProfiles } = actorIds.length
            ? await supabase.from('profiles').select('id, username, avatar_url, display_name').in('id', actorIds)
            : { data: [] as any[] };

          const actorById = new Map<string, any>();
          for (const p of actorProfiles || []) {
            if (p?.id) actorById.set(String(p.id), p);
          }

          giftNotifNoties = giftNotifs.map((n: any) => {
            const id = `notif:gift:${n.id}`;
            const actor = actorById.get(String(n.actor_id));
            const username = actor?.username || 'Someone';
            const displayName = actor?.display_name || username;
            const avatarFallback = (displayName?.[0] || '?').toUpperCase();
            
            // Determine post_id from entity_type/entity_id
            const postId = n.entity_type === 'post' ? n.entity_id : undefined;
            const giftId = n.entity_type === 'gift' ? n.entity_id : undefined;
            
            // Route to post if available, otherwise to sender profile
            const actionUrl = postId ? `/post/${postId}` : `/${username}`;

            return {
              id,
              type: 'gift' as NotieType,
              title: 'New Gift',
              message: n.message || `${displayName} sent you a gift`,
              avatarUrl: actor?.avatar_url,
              avatarFallback,
              isRead: readIds.has(id) || n.read,
              createdAt: new Date(n.created_at),
              actionUrl,
              metadata: {
                gift_id: giftId,
                sender_id: n.actor_id,
                post_id: postId,
              },
            };
          });
        }
      } catch (err) {
        console.error('[Noties] Gift notifications error:', err);
      }

      // Deduplicate gift noties - prefer notifications table entries (have post_id) over ledger entries
      const giftNotifIds = new Set(giftNotifNoties.map(n => n.metadata?.gift_id).filter(Boolean));
      const dedupedGiftNoties = [
        ...giftNotifNoties,
        ...giftNoties.filter(n => !giftNotifIds.has(n.metadata?.gift_id)),
      ];

      const combined = [...followNoties, ...liveNoties, ...dedupedGiftNoties, ...purchaseNoties, ...conversionNoties, ...teamInviteNoties, ...supportNoties]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100);

      setNoties(combined);
      
    } catch (error) {
      console.error('[Noties] Error loading notifications:', error);
      // Always show empty state on error - never use mock data
      setNoties([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadReadIds, supabase]);

  const markAsRead = useCallback((id: string) => {
    setNoties(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = loadReadIds(user.id);
      ids.add(id);
      saveReadIds(user.id, ids);
    })();
  }, [loadReadIds, saveReadIds, supabase]);

  const markAllAsRead = useCallback(() => {
    setNoties(prev => prev.map(n => ({ ...n, isRead: true })));
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = loadReadIds(user.id);
      for (const n of noties) ids.add(n.id);
      saveReadIds(user.id, ids);
    })();
  }, [loadReadIds, noties, saveReadIds, supabase]);

  const refreshNoties = useCallback(async () => {
    await loadNoties();
  }, [loadNoties]);

  // Load on mount
  useEffect(() => {
    loadNoties();
  }, [loadNoties]);

  // Subscribe to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadNoties();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadNoties]);

  useEffect(() => {
    let isMounted = true;
    let followeeIds: string[] = [];
    let userId: string | null = null;
    let notificationsChannel: any = null;
    let txChannel: any = null;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        userId = user.id;

        notificationsChannel = supabase
          .channel('noties-notifications-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
            () => {
              void loadNoties();
            }
          )
          .subscribe();

        txChannel = supabase
          .channel('noties-tx-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ledger_entries', filter: `user_id=eq.${user.id}` },
            () => {
              void loadNoties();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'diamond_conversions', filter: `profile_id=eq.${user.id}` },
            () => {
              void loadNoties();
            }
          )
          .subscribe();

        const { data } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', user.id)
          .limit(500);
        followeeIds = Array.from(new Set((data || []).map((r: any) => String(r.followee_id)).filter(Boolean)));
      } catch (err) {
        console.error('[Noties] Realtime init error:', err);
      }
    };

    void init();

    const followsChannel = supabase
      .channel('noties-follows-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        () => {
          void loadNoties();
        }
      )
      .subscribe();

    const liveChannel = supabase
      .channel('noties-live-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload: any) => {
          const row = payload?.new || payload?.old;
          const profileId = String(row?.profile_id ?? '');
          if (!profileId) return;
          if (followeeIds.length && !followeeIds.includes(profileId)) return;
          void loadNoties();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
      if (txChannel) {
        supabase.removeChannel(txChannel);
      }
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [loadNoties, supabase]);

  return (
    <NotiesContext.Provider value={{
      noties,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      refreshNoties,
    }}>
      {children}
    </NotiesContext.Provider>
  );
}

export function useNoties() {
  const context = useContext(NotiesContext);
  if (!context) {
    throw new Error('useNoties must be used within a NotiesProvider');
  }
  return context;
}

