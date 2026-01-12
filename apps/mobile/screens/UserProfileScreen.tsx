import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const bottomGuard = insets.bottom + 88;
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const { colors } = useTheme();

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: colors.mutedText,
      primary: (colors as any).tabIconActive ?? colors.text,
    }),
    [colors]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  function Card({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: object;
  }) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  function Divider({ style }: { style?: object }) {
    return <View style={[styles.divider, style]} />;
  }

  function PrimaryButton({
    label,
    iconName,
    onPress,
  }: {
    label: string;
    iconName?: React.ComponentProps<typeof Feather>['name'];
    onPress?: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.buttonBase, styles.buttonPrimary, pressed && styles.buttonPressed]}
      >
        {iconName ? <Feather name={iconName} size={16} color="#FFFFFF" /> : null}
        <Text style={styles.buttonPrimaryText}>{label}</Text>
      </Pressable>
    );
  }

  function SecondaryButton({
    label,
    iconName,
    onPress,
  }: {
    label: string;
    iconName?: React.ComponentProps<typeof Feather>['name'];
    onPress?: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.buttonBase, styles.buttonSecondary, pressed && styles.buttonPressed]}
      >
        {iconName ? <Feather name={iconName} size={16} color={stylesVars.text} /> : null}
        <Text style={styles.buttonSecondaryText}>{label}</Text>
      </Pressable>
    );
  }

  function CountChip({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress?: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.countChip, pressed && styles.pressedSoft]}
      >
        <Text style={styles.countValue}>{value}</Text>
        <Text style={styles.countLabel}>{label}</Text>
      </Pressable>
    );
  }

  function SectionHeader({
    title,
    rightLabel,
    rightIconName,
    onRightPress,
  }: {
    title: string;
    rightLabel?: string;
    rightIconName?: React.ComponentProps<typeof Feather>['name'];
    onRightPress?: () => void;
  }) {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {rightLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRightPress}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressedSoft]}
          >
            {rightIconName ? <Feather name={rightIconName} size={14} color={stylesVars.primary} /> : null}
            <Text style={styles.sectionHeaderActionText}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function LinkRow({
    title,
    subtitle,
    iconName = 'external-link',
    onPress,
  }: {
    title: string;
    subtitle?: string;
    iconName?: React.ComponentProps<typeof Feather>['name'];
    onPress?: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressedSoft]}
      >
        <View style={styles.linkRowLeft}>
          <View style={styles.linkIcon}>
            <Feather name={iconName} size={16} color={stylesVars.primary} />
          </View>
          <View style={styles.linkTextCol}>
            <Text style={styles.linkTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.linkSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={stylesVars.mutedText} />
      </Pressable>
    );
  }

  const displayName = useMemo(() => {
    return (
      (currentUser.profile?.display_name ? String(currentUser.profile.display_name) : '') ||
      (currentUser.profile?.username ? String(currentUser.profile.username) : '') ||
      'My Profile'
    );
  }, [currentUser.profile?.display_name, currentUser.profile?.username]);

  const username = useMemo(() => {
    return currentUser.profile?.username ? String(currentUser.profile.username) : '';
  }, [currentUser.profile?.username]);

  const avatarUrl = useMemo(() => {
    return currentUser.profile?.avatar_url ? String(currentUser.profile.avatar_url) : '';
  }, [currentUser.profile?.avatar_url]);

  const avatarFallback = useMemo(() => {
    const basis = displayName || username || 'U';
    return basis.trim().slice(0, 1).toUpperCase() || 'U';
  }, [displayName, username]);

  type TabId = 'info' | 'feed' | 'reels' | 'photos' | 'videos' | 'music' | 'events' | 'products';
  const tabs = useMemo(
    () =>
      [
        { id: 'info' as const, label: 'Info', icon: 'info' as const },
        { id: 'feed' as const, label: 'Feed', icon: 'rss' as const },
        { id: 'reels' as const, label: 'Vlog', icon: 'film' as const },
        { id: 'photos' as const, label: 'Photos', icon: 'image' as const },
        { id: 'videos' as const, label: 'Videos', icon: 'video' as const },
        { id: 'music' as const, label: 'Music', icon: 'music' as const },
        { id: 'events' as const, label: 'Events', icon: 'calendar' as const },
        { id: 'products' as const, label: 'Products', icon: 'shopping-bag' as const },
      ] as const,
    []
  );

  const [activeTab, setActiveTab] = useState<TabId>('info');

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomGuard }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Hero (web: profile header card) */}
          <Card>
            <View style={styles.heroTopRow}>
              <View style={styles.heroAvatar}>
                {currentUser.loading ? (
                  <Text style={styles.heroAvatarText}>U</Text>
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImage} />
                ) : (
                  <Text style={styles.heroAvatarText}>{avatarFallback}</Text>
                )}
              </View>

              <View style={styles.heroInfoCol}>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                <View style={styles.heroMetaRow}>
                  {username ? (
                    <Text style={styles.heroUsername} numberOfLines={1}>
                      @{username}
                    </Text>
                  ) : null}
                  <View style={styles.pill}>
                    <Feather name="star" size={12} color={stylesVars.primary} />
                    <Text style={styles.pillText}>Creator</Text>
                  </View>
                </View>

                <View style={styles.heroLocationRow}>
                  <Feather name="map-pin" size={14} color={stylesVars.mutedText} />
                  <Text style={styles.heroLocationText} numberOfLines={1}>
                    —
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.heroBio}>
              {currentUser.loading
                ? 'Loading your profile…'
                : currentUser.profile
                  ? 'This is your profile.'
                  : 'No profile data yet.'}
            </Text>

            {/* Action Buttons (web: Edit Profile / Share / Stats) */}
            <View style={styles.heroButtonsRow}>
              <SecondaryButton label="Edit Profile" iconName="edit-3" onPress={() => navigation.navigate('SettingsProfileScreen')} />
              <SecondaryButton label="Share" iconName="share-2" onPress={() => {}} />
              <Pressable accessibilityRole="button" onPress={() => {}} style={({ pressed }) => [styles.statsButton, pressed && styles.buttonPressed]}>
                <Feather name="bar-chart-2" size={16} color={stylesVars.primary} />
                <Text style={styles.statsButtonText}>Stats</Text>
              </Pressable>
            </View>

            <Divider style={{ marginTop: 14 }} />

            {/* Social Counts (web: Followers / Following / Friends) */}
            <View style={styles.countsRow}>
              <CountChip label="Followers" value="1,204" onPress={() => {}} />
              <CountChip label="Following" value="312" onPress={() => {}} />
              <CountChip label="Friends" value="88" onPress={() => {}} />
            </View>
          </Card>

          {/* Top Friends (web: TopFriendsDisplay) */}
          <Card>
            <SectionHeader title="Top Friends" rightLabel="Manage" rightIconName="settings" onRightPress={() => {}} />
            <View style={styles.topFriendsRows}>
              {[0, 1].map((rowIndex) => {
                const start = rowIndex * 4;
                const items = Array.from({ length: 4 }).map((_, i) => start + i);
                return (
                  <View key={`tf-row-${rowIndex}`} style={styles.topFriendsRow}>
                    {items.map((idx) => (
                      <Pressable
                        key={`tf-${idx}`}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.topFriendCell, pressed && styles.pressedSoft]}
                      >
                        <View style={styles.topFriendAvatar}>
                          <Text style={styles.topFriendAvatarText}>{String.fromCharCode(65 + (idx % 8))}</Text>
                        </View>
                        <Text style={styles.topFriendName} numberOfLines={1}>
                          Friend {idx + 1}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Tabs (web: config-driven tabs row) */}
          <Card style={{ paddingVertical: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    onPress={() => setActiveTab(t.id)}
                    style={({ pressed }) => [
                      styles.tabChip,
                      isActive && styles.tabChipActive,
                      pressed && styles.pressedSoft,
                    ]}
                  >
                    <Feather
                      name={t.icon}
                      size={14}
                      color={isActive ? stylesVars.primary : stylesVars.mutedText}
                    />
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>

          {/* Tab Content (web: based on activeTab) */}
          {activeTab === 'info' ? (
            <>
              {/* Referral Progress (web: owner-only module) */}
              <Card>
                <SectionHeader title="Referral Progress" />
                <Text style={styles.bodyText}>
                  Invite friends and track progress here. (UI-only)
                </Text>
                <View style={styles.progressBarOuter}>
                  <View style={[styles.progressBarInner, { width: '40%' }]} />
                </View>
                <Text style={styles.mutedSmallText}>2 / 5 referrals</Text>
              </Card>

              {/* Stats Grid (web: Top Supporters + Top Streamers) */}
              <Card>
                <SectionHeader title="Top Supporters" />
                <Text style={styles.bodyText}>No supporters yet.</Text>
                <PrimaryButton label="View Supporters" iconName="users" onPress={() => {}} />
              </Card>

              <Card>
                <SectionHeader title="Top Streamers" />
                <Text style={styles.bodyText}>No streamers to show.</Text>
                <PrimaryButton label="View Streamers" iconName="twitch" onPress={() => {}} />
              </Card>

              {/* Social Media Bar (web: SocialMediaBar) */}
              <Card>
                <SectionHeader title="Socials" />
                <View style={styles.socialsRow}>
                  {[
                    { icon: 'instagram', label: 'Instagram' },
                    { icon: 'twitter', label: 'X' },
                    { icon: 'youtube', label: 'YouTube' },
                    { icon: 'twitch', label: 'Twitch' },
                  ].map((s) => (
                    <Pressable
                      key={s.icon}
                      accessibilityRole="button"
                      onPress={() => {}}
                      style={({ pressed }) => [styles.socialChip, pressed && styles.pressedSoft]}
                    >
                      <Feather name={s.icon as any} size={16} color={stylesVars.primary} />
                      <Text style={styles.socialChipText}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              {/* Links (web: ModernLinksSection) */}
              <Card>
                <SectionHeader title="My Links" rightLabel="Edit" rightIconName="edit-3" onRightPress={() => {}} />
                <LinkRow
                  title="MyLiveLinks"
                  subtitle={username ? `mylivelinks.com/${username}` : 'mylivelinks.com/…'}
                  iconName="link"
                  onPress={() => {}}
                />
                <LinkRow title="YouTube" subtitle="Not set" iconName="youtube" onPress={() => {}} />
                <LinkRow title="Instagram" subtitle="Not set" iconName="instagram" onPress={() => {}} />
              </Card>

              {/* Adult Links (web: AdultLinksSection; web-only) */}
              <Card>
                <SectionHeader title="Adult Links" />
                <Text style={styles.bodyText}>
                  This section exists on web (18+ consent). Not available on mobile in this UI-only screen.
                </Text>
              </Card>

              {/* Stats Card (web: StatsCard) */}
              <Card>
                <SectionHeader title="Stats" />
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>12</Text>
                    <Text style={styles.statLabel}>Total Streams</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>4,210</Text>
                    <Text style={styles.statLabel}>Total Viewers</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>322</Text>
                    <Text style={styles.statLabel}>Diamonds</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>88</Text>
                    <Text style={styles.statLabel}>Gifts Received</Text>
                  </View>
                </View>
              </Card>
            </>
          ) : (
            <Card>
              <SectionHeader
                title={tabs.find((t) => t.id === activeTab)?.label || 'Tab'}
              />
              <Text style={styles.bodyText}>
                Content for “{tabs.find((t) => t.id === activeTab)?.label}” goes here. (UI-only)
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(stylesVars: {
  bg: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  primary: string;
}) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: stylesVars.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 14,
  },
  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
  },
  pressedSoft: {
    opacity: 0.85,
  },

  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroAvatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: stylesVars.primary,
  },
  heroInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: stylesVars.text,
    flex: 1,
    minWidth: 0,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroUsername: {
    fontSize: 14,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.primary,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLocationText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  heroBio: {
    marginTop: 12,
    fontSize: 14,
    color: stylesVars.text,
    lineHeight: 19,
  },
  heroButtonsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  buttonBase: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  buttonPrimary: {
    backgroundColor: stylesVars.primary,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  buttonSecondaryText: {
    color: stylesVars.text,
    fontWeight: '800',
    fontSize: 14,
  },
  statsButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.22)',
  },
  statsButtonText: {
    color: stylesVars.primary,
    fontWeight: '900',
    fontSize: 14,
  },

  countsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  countChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  countValue: {
    fontSize: 18,
    fontWeight: '900',
    color: stylesVars.primary,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: stylesVars.text,
  },
  sectionHeaderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  sectionHeaderActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: stylesVars.primary,
  },

  topFriendsRows: {
    gap: 10,
  },
  topFriendsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topFriendCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
  },
  topFriendAvatar: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topFriendAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: stylesVars.text,
  },
  topFriendName: {
    fontSize: 12,
    fontWeight: '800',
    color: stylesVars.text,
  },

  tabsRow: {
    paddingHorizontal: 10,
    gap: 8,
    alignItems: 'center',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
  },
  tabChipActive: {
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: stylesVars.mutedText,
  },
  tabChipTextActive: {
    color: stylesVars.primary,
  },

  bodyText: {
    fontSize: 14,
    color: stylesVars.text,
    lineHeight: 19,
    marginBottom: 12,
  },
  mutedSmallText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  progressBarOuter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: stylesVars.primary,
    borderRadius: 999,
  },

  socialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
  },
  socialChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: stylesVars.text,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  linkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  linkIcon: {
    height: 34,
    width: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
  },
  linkTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: stylesVars.text,
  },
  linkSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: stylesVars.primary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: stylesVars.mutedText,
  },
  });
}
