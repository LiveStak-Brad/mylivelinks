import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { DEFAULT_AVATAR, getAvatarSource } from '../lib/defaultAvatar';
import { getNotificationDestination } from '../lib/noties/getNotificationDestination';
import { resolveNotieAction } from '../lib/noties/resolveNotieAction';
import { useTheme } from '../theme/useTheme';
import { brand, darkPalette, lightPalette } from '../theme/colors';

type NotieRowItem = {
  id: string;
  isRead: boolean;
  type?: string;
  message: string;
  timestamp: string;
  avatarFallback: string;
  typeEmoji: string;
  avatarUrl?: string;
  actorProfileId?: string;
  actorUsername?: string;
  entityType?: string | null;
  entityId?: string | null;
};

function NotieRow({
  item,
  onPress,
  onLongPress,
  styles,
}: {
  item: NotieRowItem;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  styles: any;
}) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarSource = avatarError ? DEFAULT_AVATAR : getAvatarSource(item.avatarUrl);
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.notieCard, pressed && styles.notieCardPressed]}
      onPress={() => onPress(item.id)}
      onLongPress={() => onLongPress(item.id)}
    >
      <View style={[styles.notieRow, item.isRead ? styles.notieRowRead : styles.notieRowUnread]}>
        <View style={styles.avatarWrap}>
          <Image
            source={avatarSource}
            style={styles.avatarImage}
            resizeMode="cover"
            onError={(e) => {
              console.warn('[NotiesScreen] avatar failed to load', {
                notieId: item.id,
                actor: item.actorProfileId,
                url: item.avatarUrl,
                error: (e as any)?.nativeEvent?.error,
              });
              setAvatarError(true);
            }}
            accessibilityLabel="Profile photo"
          />

          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{item.typeEmoji}</Text>
          </View>
        </View>

        <View style={styles.notieContent}>
          <Text style={styles.notieMessage}>{item.message}</Text>
          <Text style={styles.notieTimestamp}>{item.timestamp}</Text>
        </View>

        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ styles, stylesVars }: { styles: any; stylesVars: any }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle} accessibilityLabel="Notifications">
        <Feather name="bell" size={28} color={stylesVars.mutedText} />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyBody}>When you get notifications, they'll appear here</Text>
    </View>
  );
}

export default function NotiesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { mode, colors } = useTheme();

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: (colors as any).subtleText ?? colors.mutedText,
      primary: (brand as any).primary ?? brand.pink,
      unreadBg: mode === 'dark' ? 'rgba(236,72,153,0.10)' : 'rgba(236,72,153,0.08)',
      unreadBorder: mode === 'dark' ? 'rgba(236,72,153,0.22)' : 'rgba(236,72,153,0.20)',
      chipBg: mode === 'dark' ? darkPalette.slate800 : lightPalette.slate100,
      overlay: colors.overlay,
      switchFalse: mode === 'dark' ? 'rgba(255,255,255,0.20)' : lightPalette.slate200,
      switchTrue: (brand as any).primary ?? brand.pink,
    }),
    [colors, mode]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const DEFAULT_NOTIE_TYPES = useMemo(
    () =>
      [
        'gift',
        'follow',
        'follow_link',
        'live',
        'mention',
        'comment',
        'like_post',
        'like_comment',
        'level_up',
        'purchase',
        'conversion',
        'system',
        'support',
        'team_invite',
        'team_invite_accepted',
        'team_join_request',
      ] as const,
    []
  );

  const typeLabel = useMemo<Record<string, string>>(
    () => ({
      gift: 'Gifts',
      follow: 'Follows',
      follow_link: 'Link follows',
      live: 'Live',
      mention: 'Mentions',
      comment: 'Comments',
      like_post: 'Post likes',
      like_comment: 'Comment likes',
      level_up: 'Level ups',
      purchase: 'Purchases',
      conversion: 'Conversions',
      system: 'System',
      support: 'Support',
      team_invite: 'Team invites',
      team_invite_accepted: 'Invite accepted',
      team_join_request: 'Join requests',
    }),
    []
  );

  const [notiesSettings, setNotiesSettings] = useState<{
    enabledTypes: Record<string, boolean>;
    enableAlerts: boolean;
  }>(() => ({
    enabledTypes: Object.fromEntries(DEFAULT_NOTIE_TYPES.map((t) => [t, true])),
    enableAlerts: false,
  }));

  const loadNotiesSettings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ? String(user.id) : 'anon';
      const key = `noties_settings:v1:${userId}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const obj = parsed as Record<string, unknown>;

      const enabledTypesRaw = obj.enabledTypes;
      const enabledTypes: Record<string, boolean> = {};
      if (enabledTypesRaw && typeof enabledTypesRaw === 'object') {
        for (const t of DEFAULT_NOTIE_TYPES) {
          const v = (enabledTypesRaw as any)[t];
          enabledTypes[t] = typeof v === 'boolean' ? v : true;
        }
      } else {
        // Back-compat: if older settings existed, default to all-enabled.
        for (const t of DEFAULT_NOTIE_TYPES) enabledTypes[t] = true;
      }

      setNotiesSettings(() => ({
        enabledTypes,
        enableAlerts: typeof obj.enableAlerts === 'boolean' ? obj.enableAlerts : false,
      }));
    } catch (err) {
      console.warn('[NotiesScreen] Failed to load noties settings:', err);
    }
  }, [DEFAULT_NOTIE_TYPES]);

  const saveNotiesSettings = useCallback(
    async (next: { enabledTypes: Record<string, boolean>; enableAlerts: boolean }) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ? String(user.id) : 'anon';
      const key = `noties_settings:v1:${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      console.warn('[NotiesScreen] Failed to save noties settings:', err);
    }
    },
    []
  );

  const navigateToHref = useCallback(
    async (hrefOrUrl: string) => {
      const resolved = resolveNotieAction(hrefOrUrl);

      if (resolved?.route === 'external') {
        const url = resolved.params?.url;
        if (url) {
          try {
            await Linking.openURL(url);
          } catch (err) {
            console.error('[NotiesScreen] Linking.openURL failed:', err);
          }
        }
        return;
      }

      // Special-case: support /live/{username} which resolveNotieAction maps only to "live" without params.
      if (typeof hrefOrUrl === 'string' && hrefOrUrl.startsWith('/live/')) {
        navigation.navigate('LiveUserScreen');
        return;
      }

      if (typeof hrefOrUrl === 'string' && hrefOrUrl.startsWith('/room/live-central')) {
        navigation.navigate('RoomScreen');
        return;
      }

      switch (resolved?.route) {
        case 'feed':
          navigation.navigate('Tabs', { screen: 'Feed' });
          return;
        case 'liveTV':
          navigation.navigate('Tabs', { screen: 'LiveTV' });
          return;
        case 'messages':
          navigation.navigate('Tabs', { screen: 'Messages' });
          return;
        case 'noties':
          navigation.navigate('Tabs', { screen: 'Noties' });
          return;
        case 'wallet':
          navigation.navigate('WalletScreen');
          return;
        case 'my_analytics':
          navigation.navigate('MyAnalyticsScreen');
          return;
        case 'gifter_levels':
          navigation.navigate('GifterLevelsScreen');
          return;
        case 'settings_profile':
          navigation.navigate('SettingsProfileScreen');
          return;
        case 'invite':
          navigation.navigate('InviteUserScreen');
          return;
        case 'profile': {
          const username = resolved.params?.username;
          if (username) {
            navigation.navigate('ProfileViewScreen', { username });
            return;
          }
          break;
        }
        case 'live':
          navigation.navigate('LiveUserScreen');
          return;
        default:
          break;
      }

      // Fallback: no-op (unknown route)
    },
    [navigation]
  );

  const [noties, setNoties] = useState<NotieRowItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  const typeToEmoji = useMemo<Record<string, string>>(
    () => ({
      gift: '🎁',
      follow: '👤',
      follow_link: '👤',
      live: '📹',
      mention: '💬',
      comment: '💬',
      like_post: '❤️',
      like_comment: '❤️',
      level_up: '⭐',
      purchase: '💰',
      conversion: '💎',
      system: '🔔',
      support: '💬',
      team_invite: '👥',
      team_invite_accepted: '✅',
      team_join_request: '➕',
    }),
    []
  );

  const looksLikeHttpUrl = useCallback((url: string) => /^https?:\/\//i.test(url), []);

  const resolvePublicStorageUrl = useCallback(
    (bucket: string, maybeUrlOrPath: string | null | undefined): string | null => {
      if (!maybeUrlOrPath) return null;
      const raw = String(maybeUrlOrPath).trim();
      if (!raw) return null;
      if (looksLikeHttpUrl(raw)) return raw;

      // Accept either `path/to/file` or `/path/to/file` or `bucket/path/to/file`
      const needle = `${bucket}/`;
      const idx = raw.indexOf(needle);
      const path = (idx >= 0 ? raw.slice(idx + needle.length) : raw).replace(/^\/+/, '');
      if (!path) return null;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl ? String(data.publicUrl) : null;
    },
    [looksLikeHttpUrl]
  );

  const loadNoties = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        console.error('[NotiesScreen] auth.getUser error:', userErr);
        if (isMountedRef.current) setNoties([]);
        return;
      }

      if (!user) {
        if (isMountedRef.current) setNoties([]);
        return;
      }

      // Sort newest first (created_at). If your schema also has a due date field, we can switch to that;
      // for now we use created_at which is proven by existing codepaths in the repo.
      const { data, error } = await supabase
        .from('notifications')
        .select('id, actor_id, type, entity_type, entity_id, message, read, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[NotiesScreen] notifications select error:', error);
        if (isMountedRef.current) setNoties([]);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const actorIds = Array.from(new Set(rows.map((r: any) => String(r?.actor_id ?? '')).filter(Boolean)));

      const { data: actorProfiles, error: actorErr } = actorIds.length
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', actorIds)
        : { data: [] as any[], error: null as any };

      if (actorErr) {
        console.error('[NotiesScreen] profiles select error:', actorErr);
      }

      const actorById = new Map<string, any>();
      for (const p of Array.isArray(actorProfiles) ? actorProfiles : []) {
        if (p?.id) actorById.set(String(p.id), p);
      }

      const items: NotieRowItem[] = rows.map((row: any) => {
        const message = String(row?.message ?? '');
        const createdAtRaw = row?.created_at ? String(row.created_at) : '';
        const createdAt = createdAtRaw ? new Date(createdAtRaw) : new Date();
        const type = String(row?.type ?? '').trim();
        const actorId = row?.actor_id ? String(row.actor_id) : '';
        const actor = actorId ? actorById.get(actorId) : null;
        const actorUsername = actor?.username ? String(actor.username) : '';
        const actorDisplayName = actor?.display_name ? String(actor.display_name) : '';
        const avatarFallback = (actorDisplayName || actorUsername || message).trim()?.[0]?.toUpperCase() ?? '?';
        const avatarUrl = resolvePublicStorageUrl('avatars', actor?.avatar_url ?? null) ?? undefined;

        return {
          id: String(row?.id ?? ''),
          isRead: Boolean(row?.read),
          type: type || undefined,
          message,
          timestamp: createdAt.toLocaleString(),
          avatarFallback,
          typeEmoji: typeToEmoji[type] ?? '🔔',
          avatarUrl,
          actorProfileId: actorId || undefined,
          actorUsername: actorUsername || undefined,
          entityType: row?.entity_type != null ? String(row.entity_type) : null,
          entityId: row?.entity_id != null ? String(row.entity_id) : null,
        };
      });

      if (isMountedRef.current) setNoties(items.filter((n) => n.id));
    } catch (err) {
      console.error('[NotiesScreen] loadNoties unexpected error:', err);
      if (isMountedRef.current) setNoties([]);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [resolvePublicStorageUrl, typeToEmoji]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadNotiesSettings();
    void loadNoties();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadNoties, loadNotiesSettings]);

  const filteredNoties = useMemo(() => {
    const enabled = notiesSettings.enabledTypes || {};
    return noties.filter((n) => {
      const t = String(n.type ?? '').trim();
      if (!t) return true;
      const v = enabled[t];
      return typeof v === 'boolean' ? v : true;
    });
  }, [noties, notiesSettings.enabledTypes]);

  const setReadOptimistic = useCallback(
    async (id: string, nextIsRead: boolean) => {
      const prev = noties;
      const current = prev.find((n) => n.id === id);
      if (!current) return;
      setNoties((cur) => cur.map((n) => (n.id === id ? { ...n, isRead: nextIsRead } : n)));

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          console.error('[NotiesScreen] auth.getUser error (toggle):', userErr);
          setNoties(prev);
          return;
        }
        if (!user) {
          setNoties(prev);
          return;
        }

        const { error } = await supabase
          .from('notifications')
          .update({ read: nextIsRead })
          .eq('id', id)
          .eq('recipient_id', user.id);

        if (error) {
          console.error('[NotiesScreen] notifications update error:', error);
          setNoties(prev);
        }
      } catch (err) {
        console.error('[NotiesScreen] toggleRead unexpected error:', err);
        setNoties(prev);
      }
    },
    [noties]
  );

  const handlePressNotie = useCallback(
    async (id: string) => {
      const item = noties.find((n) => n.id === id);
      if (!item) return;

      // Tap behavior: mark read (only if unread), then navigate.
      if (!item.isRead) {
        await setReadOptimistic(id, true);
      }

      const destination = getNotificationDestination({
        type: item.type,
        actionUrl: undefined,
        metadata: null,
        entity_type: item.entityType ?? null,
        entity_id: item.entityId ?? null,
        actor_username: item.actorUsername ?? null,
      });

      if (destination.kind === 'external') {
        await navigateToHref(destination.url);
        return;
      }

      await navigateToHref(destination.href);
    },
    [navigateToHref, noties, setReadOptimistic]
  );

  const handleLongPressNotie = useCallback(
    async (id: string) => {
      // Long-press behavior: explicit toggle (keeps original "toggle completion" requirement without changing UI).
      const item = noties.find((n) => n.id === id);
      if (!item) return;
      await setReadOptimistic(id, !item.isRead);
    },
    [noties, setReadOptimistic]
  );

  const markAllReadOptimistic = useCallback(async () => {
    const prev = noties;
    const anyUnread = prev.some((n) => !n.isRead);
    if (!anyUnread) return;

    setNoties((cur) => cur.map((n) => ({ ...n, isRead: true })));

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        console.error('[NotiesScreen] auth.getUser error (markAll):', userErr);
        setNoties(prev);
        return;
      }
      if (!user) {
        setNoties(prev);
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('[NotiesScreen] notifications markAll update error:', error);
        setNoties(prev);
      }
    } catch (err) {
      console.error('[NotiesScreen] markAll unexpected error:', err);
      setNoties(prev);
    }
  }, [noties]);

  const bottomGuard = insets.bottom + 88;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)} accessibilityRole="button">
          <Pressable
            style={styles.settingsModalCard}
            onPress={() => {}}
            accessibilityRole="none"
          >
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Noties settings</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                onPress={() => setSettingsOpen(false)}
                style={({ pressed }) => [styles.settingsCloseBtn, pressed && styles.notieCardPressed]}
              >
                <Feather name="x" size={18} color={stylesVars.mutedText} />
              </Pressable>
            </View>

            <Text style={styles.settingsModalSubtitle}>Choose which Noties you want. (Stored on this device.)</Text>

            <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsScrollContent} showsVerticalScrollIndicator={false}>
              {DEFAULT_NOTIE_TYPES.map((t, idx) => {
                const label = typeLabel[t] ?? t;
                const value = notiesSettings.enabledTypes?.[t] ?? true;
                return (
                  <View key={t} style={[styles.settingsRow, idx === 0 ? styles.settingsRowFirst : null]}>
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsRowTitle}>{label}</Text>
                      <Text style={styles.settingsRowBody}>Show {label.toLowerCase()} noties.</Text>
                    </View>
                    <Switch
                      value={value}
                      trackColor={{ false: stylesVars.switchFalse, true: stylesVars.switchTrue }}
                      onValueChange={(v) => {
                        const next = {
                          ...notiesSettings,
                          enabledTypes: { ...(notiesSettings.enabledTypes || {}), [t]: v },
                        };
                        setNotiesSettings(next);
                        void saveNotiesSettings(next);
                      }}
                    />
                  </View>
                );
              })}

              <View style={styles.settingsFooterSpacer} />

              <View style={styles.settingsRow}>
                <View style={styles.settingsRowText}>
                  <Text style={styles.settingsRowTitle}>Enable alerts</Text>
                  <Text style={styles.settingsRowBody}>Coming soon. Alerts will apply to all enabled Noties above.</Text>
                </View>
                <Switch
                  value={notiesSettings.enableAlerts}
                  trackColor={{ false: stylesVars.switchFalse, true: stylesVars.switchTrue }}
                  onValueChange={(v) => {
                    const next = { ...notiesSettings, enableAlerts: v };
                    setNotiesSettings(next);
                    void saveNotiesSettings(next);
                  }}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={filteredNoties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotieRow item={item} onPress={handlePressNotie} onLongPress={handleLongPressNotie} styles={styles} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomGuard }]}
        ListHeaderComponent={
          <View style={styles.container}>
            <View style={styles.pageHeader}>
              <View style={styles.pageHeaderTopRow}>
                <View style={styles.pageHeaderTitleRow}>
                  <Feather name="bell" size={20} color={stylesVars.primary} />
                  <Text style={styles.pageTitle}>Noties</Text>
                </View>

                <View style={styles.headerRightCol}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Noties settings"
                    onPress={() => setSettingsOpen(true)}
                    style={({ pressed }) => [styles.settingsBtn, pressed && styles.notieCardPressed]}
                  >
                    <Feather name="settings" size={16} color={stylesVars.primary} />
                    <Text style={styles.settingsBtnText}>Settings</Text>
                  </Pressable>

                  {filteredNoties.length > 0 ? (
                    <Pressable accessibilityRole="button" onPress={markAllReadOptimistic} style={styles.markAllBtn}>
                      <Text style={styles.markAllBtnText}>{isLoading ? 'Loading…' : 'Mark all read'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Text style={styles.pageSubtitle}>Stay updated with your activity</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState styles={styles} stylesVars={stylesVars} />}
        ItemSeparatorComponent={() => <View style={styles.itemSpacer} />}
      />
    </SafeAreaView>
  );
}

type StylesVars = {
  bg: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  primary: string;
  unreadBg: string;
  unreadBorder: string;
  chipBg: string;
  overlay: string;
  switchFalse: string;
  switchTrue: string;
};

function createStyles(stylesVars: StylesVars) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  listContent: {
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  pageHeader: {
    marginBottom: 12,
  },
  pageHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllBtnText: {
    fontSize: 13,
    color: stylesVars.primary,
    fontWeight: '700',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingsBtnText: {
    fontSize: 13,
    color: stylesVars.primary,
    fontWeight: '700',
  },

  itemSpacer: {
    height: 8,
  },

  notieCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  notieCardPressed: {
    opacity: 0.85,
  },

  notieRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.card,
  },
  notieRowRead: {
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.card,
  },
  notieRowUnread: {
    borderColor: stylesVars.unreadBorder,
    backgroundColor: stylesVars.unreadBg,
  },

  avatarWrap: {
    width: 40,
    height: 40,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    fontSize: 12,
    lineHeight: 14,
  },

  notieContent: {
    flex: 1,
    minWidth: 0,
  },
  notieMessage: {
    fontSize: 14,
    lineHeight: 18,
    color: stylesVars.text,
  },
  notieTimestamp: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginTop: 4,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: stylesVars.primary,
    marginTop: 4,
  },

  emptyState: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: stylesVars.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    color: stylesVars.mutedText,
    textAlign: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: stylesVars.overlay,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  settingsModalCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: stylesVars.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 14,
    maxHeight: '80%',
    flexShrink: 1,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  settingsModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: stylesVars.text,
  },
  settingsModalSubtitle: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginBottom: 10,
  },
  settingsScroll: {
    flex: 1,
  },
  settingsScrollContent: {
    paddingBottom: 6,
  },
  settingsCloseBtn: {
    padding: 6,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: stylesVars.border,
  },
  settingsRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  settingsFooterSpacer: {
    height: 8,
  },
  settingsRowText: {
    flex: 1,
    minWidth: 0,
  },
  settingsRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.text,
  },
  settingsRowBody: {
    marginTop: 2,
    fontSize: 12,
    color: stylesVars.mutedText,
    lineHeight: 16,
  },
  });
}

