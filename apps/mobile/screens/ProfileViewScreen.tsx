import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://www.mylivelinks.com';

type ProfileViewRouteParams = {
  profileId?: string;
  username?: string;
};

type ProfileData = {
  profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_live: boolean;
    follower_count: number;
    profile_type?: string;
    location_city?: string;
    location_region?: string;
    location_label?: string;
    location_hidden?: boolean;
  };
  follower_count: number;
  following_count: number;
  friends_count: number;
  relationship: 'none' | 'following' | 'followed_by' | 'friends';
  links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string;
  }>;
  top_supporters: Array<{
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    total_gifted: number;
  }>;
  stream_stats: {
    total_streams: number;
    total_minutes_live: number;
    total_viewers: number;
    peak_viewers: number;
    diamonds_earned_lifetime: number;
  };
};

export default function ProfileViewScreen() {
  const insets = useSafeAreaInsets();
  const bottomGuard = insets.bottom + 88;
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: ProfileViewRouteParams }, 'params'>>();
  const currentUser = useCurrentUser();
  const { colors } = useTheme();

  const { profileId, username } = route.params || {};

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

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

  const isOwnProfile = useMemo(() => {
    if (!currentUser.userId || !profileData?.profile?.id) return false;
    return currentUser.userId === profileData.profile.id;
  }, [currentUser.userId, profileData?.profile?.id]);

  const loadProfile = useCallback(async () => {
    if (loadingRef.current) return;
    if (!profileId && !username) {
      setError('No profile identifier provided');
      setLoading(false);
      return;
    }

    loadingRef.current = true;
    setError(null);

    try {
      let targetUsername = username;

      if (!targetUsername && profileId) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', profileId)
          .maybeSingle();

        if (!profileRow?.username) {
          throw new Error('Profile not found');
        }
        targetUsername = profileRow.username;
      }

      if (!targetUsername) {
        throw new Error('Could not determine username');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(targetUsername)}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load profile' }));
        throw new Error(errorData.error || 'Failed to load profile');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!mountedRef.current) return;

      setProfileData(data);
      setError(null);
    } catch (err: any) {
      console.error('[ProfileViewScreen] Load error:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profileId, username]);

  useEffect(() => {
    mountedRef.current = true;
    loadProfile();

    return () => {
      mountedRef.current = false;
    };
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleFollow = useCallback(async () => {
    if (!profileData || followLoading || !currentUser.userId) return;

    setFollowLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ targetProfileId: profileData.profile.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to follow/unfollow');
      }

      if (data.success && mountedRef.current) {
        const wasFollowing = profileData.relationship !== 'none';
        const isFollowingNow = data.status !== 'none';

        setProfileData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            relationship: data.status,
            follower_count: isFollowingNow
              ? (wasFollowing ? prev.follower_count : prev.follower_count + 1)
              : prev.follower_count - 1,
          };
        });
      }
    } catch (err: any) {
      console.error('[ProfileViewScreen] Follow error:', err);
    } finally {
      if (mountedRef.current) {
        setFollowLoading(false);
      }
    }
  }, [profileData, followLoading, currentUser.userId]);

  const displayName = useMemo(() => {
    return (
      profileData?.profile?.display_name ||
      profileData?.profile?.username ||
      'User'
    );
  }, [profileData]);

  const avatarUrl = useMemo(() => {
    return profileData?.profile?.avatar_url || '';
  }, [profileData]);

  const avatarFallback = useMemo(() => {
    const basis = displayName || 'U';
    return basis.trim().slice(0, 1).toUpperCase() || 'U';
  }, [displayName]);

  const getFollowButtonConfig = useCallback(() => {
    if (!profileData) return null;

    switch (profileData.relationship) {
      case 'friends':
        return {
          icon: 'users' as const,
          text: 'Friends',
          color: '#10B981',
        };
      case 'following':
        return {
          icon: 'user-check' as const,
          text: 'Following',
          color: '#6B7280',
        };
      default:
        return {
          icon: 'user-plus' as const,
          text: 'Follow',
          color: stylesVars.primary,
        };
    }
  }, [profileData, stylesVars.primary]);

  const followBtnConfig = getFollowButtonConfig();

  if (loading && !profileData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={stylesVars.primary} />
          <Text style={[styles.loadingText, { color: stylesVars.text }]}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profileData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color={stylesVars.mutedText} />
          <Text style={[styles.errorTitle, { color: stylesVars.text }]}>Profile Not Found</Text>
          <Text style={[styles.errorText, { color: stylesVars.mutedText }]}>
            {error || 'This profile does not exist.'}
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: stylesVars.primary }]}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { profile } = profileData;
  const locationText = profile.location_label || (profile.location_city && profile.location_region ? `${profile.location_city}, ${profile.location_region}` : profile.location_city || profile.location_region);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomGuard }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={stylesVars.primary}
          />
        }
      >
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroAvatar, { backgroundColor: `${stylesVars.primary}20`, borderColor: `${stylesVars.primary}40` }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImage} />
                ) : (
                  <Text style={[styles.heroAvatarText, { color: stylesVars.primary }]}>{avatarFallback}</Text>
                )}
              </View>

              <View style={styles.heroInfoCol}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.heroName, { color: stylesVars.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                <View style={styles.heroMetaRow}>
                  {profile.username ? (
                    <Text style={[styles.heroUsername, { color: stylesVars.mutedText }]} numberOfLines={1}>
                      @{profile.username}
                    </Text>
                  ) : null}
                  {profile.profile_type && (
                    <View style={[styles.pill, { backgroundColor: `${stylesVars.primary}15`, borderColor: `${stylesVars.primary}30` }]}>
                      <Feather name="star" size={12} color={stylesVars.primary} />
                      <Text style={[styles.pillText, { color: stylesVars.primary }]}>
                        {profile.profile_type}
                      </Text>
                    </View>
                  )}
                </View>

                {locationText && !profile.location_hidden && (
                  <View style={styles.heroLocationRow}>
                    <Feather name="map-pin" size={14} color={stylesVars.mutedText} />
                    <Text style={[styles.heroLocationText, { color: stylesVars.mutedText }]} numberOfLines={1}>
                      {locationText}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {profile.bio && (
              <Text style={[styles.heroBio, { color: stylesVars.text }]}>
                {profile.bio}
              </Text>
            )}

            <View style={styles.heroButtonsRow}>
              {!isOwnProfile && followBtnConfig && (
                <Pressable
                  onPress={handleFollow}
                  disabled={followLoading}
                  style={[styles.button, styles.buttonPrimary, { backgroundColor: followBtnConfig.color }, followLoading && styles.buttonDisabled]}
                >
                  <Feather name={followBtnConfig.icon} size={16} color="#FFFFFF" />
                  <Text style={styles.buttonPrimaryText}>
                    {followLoading ? 'Loading...' : followBtnConfig.text}
                  </Text>
                </Pressable>
              )}

              {!isOwnProfile && (
                <Pressable
                  style={[styles.button, styles.buttonSecondary, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}
                  onPress={() => {}}
                >
                  <Feather name="message-circle" size={16} color={stylesVars.text} />
                  <Text style={[styles.buttonSecondaryText, { color: stylesVars.text }]}>Message</Text>
                </Pressable>
              )}

              {isOwnProfile && (
                <Pressable
                  style={[styles.button, styles.buttonSecondary, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}
                  onPress={() => navigation.navigate('SettingsProfileScreen')}
                >
                  <Feather name="edit-3" size={16} color={stylesVars.text} />
                  <Text style={[styles.buttonSecondaryText, { color: stylesVars.text }]}>Edit Profile</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.button, styles.buttonSecondary, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}
                onPress={() => {}}
              >
                <Feather name="share-2" size={16} color={stylesVars.text} />
                <Text style={[styles.buttonSecondaryText, { color: stylesVars.text }]}>Share</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: stylesVars.border }]} />

            <View style={styles.countsRow}>
              <Pressable style={styles.countChip}>
                <Text style={[styles.countValue, { color: stylesVars.primary }]}>
                  {profileData.follower_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Followers</Text>
              </Pressable>

              <Pressable style={styles.countChip}>
                <Text style={[styles.countValue, { color: stylesVars.primary }]}>
                  {profileData.following_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Following</Text>
              </Pressable>

              <Pressable style={styles.countChip}>
                <Text style={[styles.countValue, { color: stylesVars.primary }]}>
                  {profileData.friends_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Friends</Text>
              </Pressable>
            </View>
          </View>

          {profileData.stream_stats && profileData.stream_stats.total_streams > 0 && (
            <View style={[styles.card, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
              <Text style={[styles.sectionTitle, { color: stylesVars.text }]}>Streaming Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stylesVars.primary }]}>
                    {profileData.stream_stats.total_streams}
                  </Text>
                  <Text style={[styles.statLabel, { color: stylesVars.mutedText }]}>Total Streams</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stylesVars.primary }]}>
                    {profileData.stream_stats.total_viewers.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: stylesVars.mutedText }]}>Total Viewers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stylesVars.primary }]}>
                    {profileData.stream_stats.peak_viewers}
                  </Text>
                  <Text style={[styles.statLabel, { color: stylesVars.mutedText }]}>Peak Viewers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stylesVars.primary }]}>
                    {profileData.stream_stats.diamonds_earned_lifetime}
                  </Text>
                  <Text style={[styles.statLabel, { color: stylesVars.mutedText }]}>Diamonds</Text>
                </View>
              </View>
            </View>
          )}

          {profileData.links && profileData.links.length > 0 && (
            <View style={[styles.card, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
              <Text style={[styles.sectionTitle, { color: stylesVars.text }]}>Links</Text>
              {profileData.links.map((link) => (
                <Pressable
                  key={link.id}
                  style={[styles.linkRow, { backgroundColor: `${stylesVars.primary}10`, borderColor: stylesVars.border }]}
                  onPress={() => {}}
                >
                  <View style={styles.linkRowLeft}>
                    <Feather name="link" size={16} color={stylesVars.primary} />
                    <Text style={[styles.linkTitle, { color: stylesVars.text }]} numberOfLines={1}>
                      {link.title}
                    </Text>
                  </View>
                  <Feather name="external-link" size={16} color={stylesVars.mutedText} />
                </Pressable>
              ))}
            </View>
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
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 14,
    },
    container: {
      gap: 12,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
    },
    errorTitle: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: '800',
    },
    errorText: {
      marginTop: 8,
      fontSize: 14,
      textAlign: 'center',
    },
    backButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    backButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
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
      borderWidth: 1,
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
      fontWeight: '600',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    heroLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroLocationText: {
      fontSize: 13,
      fontWeight: '600',
    },
    heroBio: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 19,
    },
    heroButtonsRow: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    button: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonPrimary: {
      flex: 1,
    },
    buttonSecondary: {
      borderWidth: 1,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    buttonSecondaryText: {
      fontWeight: '800',
      fontSize: 14,
    },
    divider: {
      height: 1,
      marginTop: 14,
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
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    countValue: {
      fontSize: 18,
      fontWeight: '900',
    },
    countLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 10,
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
      gap: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '900',
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '800',
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    linkRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    linkTitle: {
      fontSize: 14,
      fontWeight: '900',
      flex: 1,
    },
  });
}
