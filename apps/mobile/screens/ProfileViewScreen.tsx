import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, View, Text, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';

import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';
import { showComingSoon } from '../lib/showComingSoon';
import { ProfileData } from '../types/profile';
import { getEnabledSections, getEnabledTabs, ProfileTab } from '../config/profileTypeConfig';
import ProfileTabBar from '../components/profile/ProfileTabBar';
import InfoTab from '../components/profile/tabs/InfoTab';
import FeedTab from '../components/profile/tabs/FeedTab';
import MediaTab from '../components/profile/tabs/MediaTab';
import MusicVideosTab from '../components/profile/tabs/MusicVideosTab';
import MusicTab from '../components/profile/tabs/MusicTab';
import EventsTab from '../components/profile/tabs/EventsTab';
import ProductsTab from '../components/profile/tabs/ProductsTab';
import ReelsTab from '../components/profile/tabs/ReelsTab';
import PodcastsTab from '../components/profile/tabs/PodcastsTab';
import MoviesTab from '../components/profile/tabs/MoviesTab';
import SeriesTab from '../components/profile/tabs/SeriesTab';
import EducationTab from '../components/profile/tabs/EducationTab';
import TopFriendsSection from '../components/profile/TopFriendsSection';
import TopFriendsManager from '../components/profile/TopFriendsManager';
import PortfolioManager from '../components/profile/PortfolioManager';
import ReferralNetworkSection from '../components/profile/ReferralNetworkSection';
import SocialMediaBar from '../components/profile/SocialMediaBar';
import MusicShowcaseSection from '../components/profile/MusicShowcaseSection';
import MusicVideosSection from '../components/profile/MusicVideosSection';
import TopSupportersSection from '../components/profile/TopSupportersSection';
import TopStreamersSection from '../components/profile/TopStreamersSection';
import ProfileBadges from '../components/profile/ProfileBadges';
import UpcomingEventsSection from '../components/profile/UpcomingEventsSection';
import PortfolioSection from '../components/profile/PortfolioSection';
import StreamingStatsSection from '../components/profile/StreamingStatsSection';
import MerchandiseSection from '../components/profile/MerchandiseSection';
import BusinessInfoSection from '../components/profile/BusinessInfoSection';
import LiveIndicatorBanner from '../components/profile/LiveIndicatorBanner';
import MllProBadge from '../components/shared/MllProBadge';
import ShareModal from '../components/ShareModal';
import ReportModal from '../components/ReportModal';

const API_BASE_URL = 'https://www.mylivelinks.com';

type ProfileViewRouteParams = {
  profileId?: string;
  username?: string;
};

type ProfileViewScreenProps = {
  routeParams?: ProfileViewRouteParams;
};

export default function ProfileViewScreen({ routeParams }: ProfileViewScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const bottomGuard = insets.bottom + 88;
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: ProfileViewRouteParams }, 'params'>>();
  const currentUser = useCurrentUser();
  const { colors } = useTheme();

  const { profileId, username } = routeParams || route.params || {};

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTopFriendsManager, setShowTopFriendsManager] = useState(false);
  const [topFriendsReloadKey, setTopFriendsReloadKey] = useState(0);
  const [showPortfolioManager, setShowPortfolioManager] = useState(false);
  const [portfolioReloadKey, setPortfolioReloadKey] = useState(0);

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

  // Profile-driven customization (parity with web)
  // Uses rgba alpha instead of opacity to preserve text readability
  const effectiveCustomization = useMemo(() => {
    const profile = profileData?.profile;
    
    // Helper: convert hex + opacity to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Border radius mapping (matches web)
    const radiusMap: Record<string, number> = {
      'none': 0,
      'small': 8,
      'medium': 16,
      'large': 24,
      'xl': 32,
    };
    
    const cardColor = profile?.card_color || '#FFFFFF';
    const cardOpacity = Math.max(0.1, Math.min(1, profile?.card_opacity ?? 0.95));
    const cardBorderRadius = profile?.card_border_radius || 'medium';
    const accentColor = profile?.accent_color || stylesVars.primary;
    
    return {
      cardBg: hexToRgba(cardColor, cardOpacity),
      cardRadius: radiusMap[cardBorderRadius] ?? 16,
      accent: accentColor,
      // Text colors from profile customization
      contentTextColor: profile?.content_text_color || stylesVars.text,
      uiTextColor: profile?.ui_text_color || stylesVars.text,
      // Additional fields for future use (low-risk, already in payload)
      buttonColor: profile?.button_color || null,
      linkColor: profile?.link_color || accentColor,
    };
  }, [profileData?.profile, stylesVars.primary, stylesVars.text]);

  const isOwnProfile = useMemo(() => {
    if (!currentUser.userId || !profileData?.profile?.id) return false;
    return currentUser.userId === profileData.profile.id;
  }, [currentUser.userId, profileData?.profile?.id]);

  const enabledSections = useMemo(() => {
    if (!profileData?.profile) return [];
    const rawModules = profileData.profile.enabled_modules;
    console.log('[ProfileViewScreen] RAW enabled_modules from DB:', JSON.stringify(rawModules));
    console.log('[ProfileViewScreen] typeof enabled_modules:', typeof rawModules);
    console.log('[ProfileViewScreen] Array.isArray:', Array.isArray(rawModules));
    console.log('[ProfileViewScreen] length:', rawModules?.length);
    console.log('[ProfileViewScreen] profile_type:', profileData.profile.profile_type);
    
    const sections = getEnabledSections(profileData.profile.profile_type, rawModules);
    console.log('[ProfileViewScreen] FINAL enabledSections:', sections.map(s => s.id));
    return sections;
  }, [profileData?.profile]);

  const enabledTabs = useMemo(() => {
    if (!profileData?.profile) return [];
    return getEnabledTabs(profileData.profile.profile_type, profileData.profile.enabled_tabs);
  }, [profileData?.profile]);

  const shouldShowSection = useCallback((sectionId: string) => {
    const result = enabledSections.some(s => s.id === sectionId);
    console.log(`[shouldShowSection] ${sectionId}: ${result}`);
    return result;
  }, [enabledSections]);

  const navigateToProfile = useCallback((profileId: string, username: string) => {
    navigation.navigate('ProfileViewScreen', { profileId, username });
  }, [navigation]);

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

  // Refresh profile when screen comes into focus (e.g., after editing settings)
  useFocusEffect(
    useCallback(() => {
      if (profileData) {
        // Only refresh if we already have data (avoid double-load on initial mount)
        loadProfile();
      }
    }, [loadProfile, profileData])
  );

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

  // Check if user is blocked
  const checkBlockStatus = useCallback(async () => {
    if (!currentUser.userId || !profileData?.profile?.id) return;
    if (currentUser.userId === profileData.profile.id) return;

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocker_id', currentUser.userId)
        .eq('blocked_id', profileData.profile.id)
        .maybeSingle();

      if (!error && data) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    } catch (err) {
      console.error('[ProfileViewScreen] Check block status error:', err);
    }
  }, [currentUser.userId, profileData?.profile?.id]);

  useEffect(() => {
    if (profileData?.profile?.id) {
      checkBlockStatus();
    }
  }, [profileData?.profile?.id, checkBlockStatus]);

  const handleBlockUser = useCallback(async () => {
    if (!currentUser.userId || !profileData?.profile?.id) return;

    const targetUsername = profileData.profile.username || 'this user';

    Alert.alert(
      'Block User',
      `Are you sure you want to block @${targetUsername}? They won't be able to message you or send you gifts.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowBlockMenu(false) },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setShowBlockMenu(false);
            setBlockLoading(true);
            try {
              const { error } = await supabase.rpc('block_user', {
                p_blocker_id: currentUser.userId,
                p_blocked_id: profileData.profile.id,
                p_reason: null,
              });

              if (error) {
                console.error('[ProfileViewScreen] Block error:', error);
                Alert.alert('Error', 'Failed to block user. Please try again.');
                return;
              }

              setIsBlocked(true);
              Alert.alert('Blocked', `@${targetUsername} has been blocked.`);
            } catch (err) {
              console.error('[ProfileViewScreen] Block error:', err);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ]
    );
  }, [currentUser.userId, profileData?.profile?.id, profileData?.profile?.username]);

  const handleUnblockUser = useCallback(async () => {
    if (!currentUser.userId || !profileData?.profile?.id) return;

    const targetUsername = profileData.profile.username || 'this user';

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${targetUsername}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowBlockMenu(false) },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            setShowBlockMenu(false);
            setBlockLoading(true);
            try {
              const { error } = await supabase.rpc('unblock_user', {
                p_blocker_id: currentUser.userId,
                p_blocked_id: profileData.profile.id,
              });

              if (error) {
                console.error('[ProfileViewScreen] Unblock error:', error);
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
                return;
              }

              setIsBlocked(false);
              Alert.alert('Unblocked', `@${targetUsername} has been unblocked.`);
            } catch (err) {
              console.error('[ProfileViewScreen] Unblock error:', err);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ]
    );
  }, [currentUser.userId, profileData?.profile?.id, profileData?.profile?.username]);

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

  // Calculate background overlay color
  const bgOverlayColor = profile.profile_bg_overlay === 'dark-heavy' ? 'rgba(0,0,0,0.7)' : profile.profile_bg_overlay === 'dark-medium' ? 'rgba(0,0,0,0.5)' : profile.profile_bg_overlay === 'dark-light' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)';

  const scrollContent = (
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
        {profile.is_live && (
          <LiveIndicatorBanner
              onWatchLive={() => navigation.navigate('LiveUserScreen', { username: profile.username })}
              colors={stylesVars}
            />
          )}

          <View style={[styles.card, { backgroundColor: effectiveCustomization.cardBg, borderColor: stylesVars.border, borderRadius: effectiveCustomization.cardRadius }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroAvatarSmall, { backgroundColor: `${effectiveCustomization.accent}20`, borderColor: `${effectiveCustomization.accent}40` }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImage} />
                ) : (
                  <Text style={[styles.heroAvatarTextSmall, { color: effectiveCustomization.accent }]}>{avatarFallback}</Text>
                )}
              </View>

              <View style={styles.heroInfoCol}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.heroNameSmall, { color: stylesVars.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {profile.is_mll_pro && <MllProBadge size="md" />}
                </View>

                <View style={styles.heroMetaRow}>
                  {profile.username ? (
                    <Text style={[styles.heroUsernameSmall, { color: stylesVars.mutedText }]} numberOfLines={1}>
                      @{profile.username}
                    </Text>
                  ) : null}
                  {profile.profile_type && (
                    <View style={[styles.pillSmall, { backgroundColor: `${effectiveCustomization.accent}15`, borderColor: `${effectiveCustomization.accent}30` }]}>
                      <Feather name="star" size={10} color={effectiveCustomization.accent} />
                      <Text style={[styles.pillTextSmall, { color: effectiveCustomization.accent }]}>
                        {profile.profile_type}
                      </Text>
                    </View>
                  )}
                </View>

                <ProfileBadges
                  isMllPro={profile.is_mll_pro}
                  gifterTier={profileData.gifter_statuses?.[profile.id]?.tier}
                  gifterLevel={profileData.gifter_statuses?.[profile.id]?.level}
                  streakDays={profileData.streak_days}
                  gifterRank={profileData.gifter_rank}
                  streamerRank={profileData.streamer_rank}
                  colors={stylesVars}
                />
              </View>
            </View>

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
                  onPress={() => navigation.navigate('IMThreadScreen', {
                    otherProfileId: profile.id,
                    otherDisplayName: profile.display_name || profile.username,
                    otherAvatarUrl: profile.avatar_url,
                  })}
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
                onPress={() => setShowShareModal(true)}
              >
                <Feather name="share-2" size={16} color={stylesVars.text} />
                <Text style={[styles.buttonSecondaryText, { color: stylesVars.text }]}>Share</Text>
              </Pressable>

              {!isOwnProfile && (
                <Pressable
                  style={{ padding: 8 }}
                  onPress={() => setShowBlockMenu(true)}
                  disabled={blockLoading}
                >
                  {blockLoading ? (
                    <ActivityIndicator size="small" color={stylesVars.text} />
                  ) : (
                    <Feather name="more-vertical" size={18} color={stylesVars.text} />
                  )}
                </Pressable>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: stylesVars.border }]} />

            <View style={styles.countsRow}>
              <Pressable style={styles.countChip} onPress={() => showComingSoon('Followers list')}>
                <Text style={[styles.countValue, { color: effectiveCustomization.accent }]}>
                  {profileData.follower_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Followers</Text>
              </Pressable>

              <Pressable style={styles.countChip} onPress={() => showComingSoon('Following list')}>
                <Text style={[styles.countValue, { color: effectiveCustomization.accent }]}>
                  {profileData.following_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Following</Text>
              </Pressable>

              <Pressable style={styles.countChip} onPress={() => showComingSoon('Friends list')}>
                <Text style={[styles.countValue, { color: effectiveCustomization.accent }]}>
                  {profileData.friends_count.toLocaleString()}
                </Text>
                <Text style={[styles.countLabel, { color: stylesVars.mutedText }]}>Friends</Text>
              </Pressable>
            </View>
          </View>

          {shouldShowSection('social_media') && (
            <SocialMediaBar
              instagram={profile.social_instagram}
              twitter={profile.social_twitter}
              youtube={profile.social_youtube}
              tiktok={profile.social_tiktok}
              facebook={profile.social_facebook}
              twitch={profile.social_twitch}
              discord={profile.social_discord}
              snapchat={profile.social_snapchat}
              linkedin={profile.social_linkedin}
              github={profile.social_github}
              spotify={profile.social_spotify}
              onlyfans={profile.social_onlyfans}
              isOwnProfile={isOwnProfile}
              onManage={() => navigation.navigate('SettingsProfileScreen')}
              colors={stylesVars}
              cardStyle={{
                backgroundColor: effectiveCustomization.cardBg,
                borderRadius: effectiveCustomization.cardRadius,
                textColor: effectiveCustomization.contentTextColor,
              }}
            />
          )}

          {shouldShowSection('links') && (
            (profileData.links && profileData.links.length > 0) ? (
              <View style={[styles.card, { backgroundColor: effectiveCustomization.cardBg, borderColor: stylesVars.border, borderRadius: effectiveCustomization.cardRadius }]}>
                <Text style={[styles.sectionTitle, { color: stylesVars.text }]}>
                  {profile.links_section_title || 'Links'}
                </Text>
                {profileData.links.map((link) => (
                  <Pressable
                    key={link.id}
                    style={[styles.linkRow, { backgroundColor: `${effectiveCustomization.linkColor}10`, borderColor: stylesVars.border }]}
                    onPress={() => link.url && Linking.openURL(link.url).catch(err => console.error('Failed to open link:', err))}
                  >
                    <View style={styles.linkRowLeft}>
                      <Feather name="link" size={16} color={effectiveCustomization.linkColor} />
                      <Text style={[styles.linkTitle, { color: stylesVars.text }]} numberOfLines={1}>
                        {link.title}
                      </Text>
                    </View>
                    <Feather name="external-link" size={16} color={stylesVars.mutedText} />
                  </Pressable>
                ))}
              </View>
            ) : isOwnProfile ? (
              <View style={[styles.card, { backgroundColor: effectiveCustomization.cardBg, borderColor: stylesVars.border, borderRadius: effectiveCustomization.cardRadius }]}>
                <Text style={[styles.sectionTitle, { color: stylesVars.text }]}>
                  {profile.links_section_title || 'Links'}
                </Text>
                <View style={styles.emptyStateContainer}>
                  <Feather name="link" size={32} color={stylesVars.mutedText} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyStateTitle, { color: stylesVars.text }]}>No Links Yet</Text>
                  <Text style={[styles.emptyStateText, { color: stylesVars.mutedText }]}>
                    Add links to share with your visitors
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('SettingsProfileScreen')}
                    style={[styles.emptyStateCta, { backgroundColor: stylesVars.primary }]}
                  >
                    <Feather name="plus" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyStateCtaText}>Add Links</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          )}

          {enabledTabs.length > 1 && (
            <ProfileTabBar
              tabs={enabledTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              colors={stylesVars}
              cardStyle={{
                backgroundColor: effectiveCustomization.cardBg,
                borderRadius: effectiveCustomization.cardRadius,
                textColor: effectiveCustomization.uiTextColor,
              }}
            />
          )}

          {activeTab === 'info' ? (
            <InfoTab
              profile={profile}
              locationText={locationText}
              colors={stylesVars}
              cardStyle={{
                backgroundColor: effectiveCustomization.cardBg,
                borderRadius: effectiveCustomization.cardRadius,
                textColor: effectiveCustomization.contentTextColor,
              }}
            >
              {/* DEBUG: Force render Top Supporters for testing */}
              {(profileData.top_supporters && profileData.top_supporters.length > 0) ? (
                <TopSupportersSection
                  supporters={profileData.top_supporters}
                  gifterStatuses={profileData.gifter_statuses}
                  onPressProfile={navigateToProfile}
                  colors={stylesVars}
                  cardStyle={{
                    backgroundColor: effectiveCustomization.cardBg,
                    borderRadius: effectiveCustomization.cardRadius,
                    textColor: effectiveCustomization.contentTextColor,
                  }}
                />
              ) : isOwnProfile ? (
                <View style={[styles.card, { backgroundColor: effectiveCustomization.cardBg, borderColor: stylesVars.border, borderRadius: effectiveCustomization.cardRadius, marginBottom: 16 }]}>
                  <View style={styles.sectionHeader}>
                    <Feather name="heart" size={20} color={stylesVars.primary} />
                    <Text style={[styles.sectionTitle, { color: stylesVars.text, marginBottom: 0 }]}>Top Supporters</Text>
                  </View>
                  <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: stylesVars.mutedText }]}>
                      No supporters yet. Go live to receive gifts!
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* DEBUG: Force render Top Streamers for testing */}
              {(profileData.top_streamers && profileData.top_streamers.length > 0) ? (
                <TopStreamersSection
                  streamers={profileData.top_streamers}
                  onPressProfile={navigateToProfile}
                  colors={stylesVars}
                  cardStyle={{
                    backgroundColor: effectiveCustomization.cardBg,
                    borderRadius: effectiveCustomization.cardRadius,
                    textColor: effectiveCustomization.contentTextColor,
                  }}
                />
              ) : isOwnProfile ? (
                <View style={[styles.card, { backgroundColor: effectiveCustomization.cardBg, borderColor: stylesVars.border, borderRadius: effectiveCustomization.cardRadius, marginBottom: 16 }]}>
                  <View style={styles.sectionHeader}>
                    <Feather name="video" size={20} color={stylesVars.primary} />
                    <Text style={[styles.sectionTitle, { color: stylesVars.text, marginBottom: 0 }]}>Top Streamers</Text>
                  </View>
                  <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: stylesVars.mutedText }]}>
                      No streamers supported yet. Watch streams and send gifts!
                    </Text>
                  </View>
                </View>
              ) : null}

              {shouldShowSection('top_friends') && profile.show_top_friends !== false && (
                <TopFriendsSection
                  key={topFriendsReloadKey}
                  profileId={profile.id}
                  isOwnProfile={isOwnProfile}
                  title={profile.top_friends_title}
                  avatarStyle={profile.top_friends_avatar_style}
                  maxCount={profile.top_friends_max_count}
                  onManage={() => setShowTopFriendsManager(true)}
                  colors={stylesVars}
                  cardStyle={{
                    backgroundColor: effectiveCustomization.cardBg,
                    borderRadius: effectiveCustomization.cardRadius,
                    textColor: effectiveCustomization.contentTextColor,
                  }}
                />
              )}

              {shouldShowSection('referral_network') && isOwnProfile && (
                <ReferralNetworkSection
                  profileId={profile.id}
                  colors={stylesVars}
                  cardStyle={{
                    backgroundColor: effectiveCustomization.cardBg,
                    borderRadius: effectiveCustomization.cardRadius,
                    textColor: effectiveCustomization.contentTextColor,
                  }}
                />
              )}

              {/* DEBUG: Force render all sections without shouldShowSection checks */}
              <MusicShowcaseSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onEdit={() => {}}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <MusicVideosSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onEdit={() => {}}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <UpcomingEventsSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onAddEvent={() => {}}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <PortfolioSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onAddItem={() => setShowPortfolioManager(true)}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <StreamingStatsSection
                stats={profileData.stream_stats}
                isOwnProfile={isOwnProfile}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <MerchandiseSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onAddItem={() => {}}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />

              <BusinessInfoSection
                profileId={profile.id}
                isOwnProfile={isOwnProfile}
                onEdit={() => navigation.navigate('SettingsProfileScreen')}
                colors={stylesVars}
                cardStyle={{
                  backgroundColor: effectiveCustomization.cardBg,
                  borderRadius: effectiveCustomization.cardRadius,
                  textColor: effectiveCustomization.contentTextColor,
                }}
              />
            </InfoTab>
      ) : activeTab === 'feed' ? (
        <FeedTab 
          profileId={profile.id} 
          isOwnProfile={isOwnProfile}
          colors={stylesVars} 
        />
      ) : activeTab === 'media' ? (
        <MediaTab 
          profileId={profile.id} 
          isOwnProfile={isOwnProfile}
          colors={stylesVars} 
        />
      ) : activeTab === 'music_videos' ? (
        <MusicVideosTab profileId={profile.id} colors={stylesVars} />
      ) : activeTab === 'music' ? (
        <MusicTab profileId={profile.id} colors={stylesVars} />
      ) : activeTab === 'events' ? (
        <EventsTab 
          profileId={profile.id} 
          isOwnProfile={isOwnProfile}
          colors={stylesVars} 
        />
      ) : activeTab === 'products' ? (
        <ProductsTab 
          profileId={profile.id} 
          isOwnProfile={isOwnProfile}
          onAddItem={() => setShowPortfolioManager(true)}
          colors={stylesVars} 
        />
      ) : activeTab === 'reels' ? (
        <ReelsTab 
          profileId={profile.id} 
          isOwnProfile={isOwnProfile}
          colors={stylesVars} 
        />
      ) : activeTab === 'podcasts' ? (
        <PodcastsTab profileId={profile.id} colors={stylesVars} isOwnProfile={isOwnProfile} />
      ) : activeTab === 'movies' ? (
        <MoviesTab profileId={profile.id} colors={stylesVars} isOwnProfile={isOwnProfile} />
      ) : activeTab === 'series' ? (
        <SeriesTab profileId={profile.id} colors={stylesVars} isOwnProfile={isOwnProfile} />
      ) : activeTab === 'education' ? (
        <EducationTab profileId={profile.id} colors={stylesVars} isOwnProfile={isOwnProfile} />
      ) : null}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: stylesVars.bg }]} edges={['left', 'right', 'bottom']}>
      {profile.profile_bg_url ? (
        <ImageBackground
          source={{ uri: profile.profile_bg_url }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={[styles.backgroundOverlay, { backgroundColor: bgOverlayColor }]}>
            {scrollContent}
          </View>
        </ImageBackground>
      ) : (
        scrollContent
      )}

      {/* Block/Unblock Menu Modal */}
      <Modal
        visible={showBlockMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBlockMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: stylesVars.card, borderColor: stylesVars.border }]}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={isBlocked ? handleUnblockUser : handleBlockUser}
            >
              <Feather
                name={isBlocked ? 'user-check' : 'user-x'}
                size={18}
                color={isBlocked ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.menuItemText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: stylesVars.border }]} />

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                setShowBlockMenu(false);
                setShowReportModal(true);
              }}
            >
              <Feather name="flag" size={18} color="#F59E0B" />
              <Text style={[styles.menuItemText, { color: '#F59E0B' }]}>Report User</Text>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: stylesVars.border }]} />

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => setShowBlockMenu(false)}
            >
              <Feather name="x" size={18} color={stylesVars.mutedText} />
              <Text style={[styles.menuItemText, { color: stylesVars.mutedText }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Share Profile Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`https://www.mylivelinks.com/${profile.username}`}
        shareText={`Check out ${profile.display_name || profile.username}'s profile on MyLiveLinks!`}
        shareThumbnail={profile.avatar_url}
        shareContentType="profile"
      />

      {/* Report User Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="user"
        reportedUserId={profile.id}
        reportedUsername={profile.username}
        contextDetails={`Profile page for @${profile.username}`}
      />

      {/* Top Friends Manager Modal */}
      {isOwnProfile && (
        <TopFriendsManager
          profileId={profile.id}
          isOpen={showTopFriendsManager}
          onClose={() => setShowTopFriendsManager(false)}
          onSave={() => setTopFriendsReloadKey(k => k + 1)}
          colors={{
            bg: stylesVars.bg,
            card: stylesVars.card,
            text: stylesVars.text,
            textSecondary: stylesVars.mutedText,
            border: stylesVars.border,
            primary: stylesVars.primary,
          }}
        />
      )}

      {/* Portfolio Manager Modal */}
      {isOwnProfile && (
        <PortfolioManager
          profileId={profile.id}
          isOpen={showPortfolioManager}
          onClose={() => setShowPortfolioManager(false)}
          onSave={() => setPortfolioReloadKey(k => k + 1)}
          colors={{
            bg: stylesVars.bg,
            card: stylesVars.card,
            text: stylesVars.text,
            textSecondary: stylesVars.mutedText,
            border: stylesVars.border,
            primary: stylesVars.primary,
          }}
        />
      )}
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
    backgroundImage: {
      flex: 1,
      width: '100%',
    },
    backgroundOverlay: {
      flex: 1,
      width: '100%',
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
    heroAvatarSmall: {
      height: 48,
      width: 48,
      borderRadius: 24,
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
    heroAvatarTextSmall: {
      fontSize: 20,
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
    heroNameSmall: {
      fontSize: 18,
      fontWeight: '700',
      flexShrink: 1,
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
    heroUsernameSmall: {
      fontSize: 13,
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
    pillSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    pillTextSmall: {
      fontSize: 11,
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
      gap: 8,
    },
    button: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minWidth: 0,
    },
    buttonPrimary: {
      flex: 1,
    },
    buttonSecondary: {
      flex: 1,
      borderWidth: 1,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    buttonSecondaryText: {
      fontWeight: '700',
      fontSize: 12,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    menuContainer: {
      width: '100%',
      maxWidth: 300,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    menuItemPressed: {
      opacity: 0.7,
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: '700',
    },
    menuDivider: {
      height: 1,
    },
    emptyStateContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 4,
    },
    emptyStateText: {
      fontSize: 14,
      textAlign: 'center',
      opacity: 0.7,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    emptyStateCta: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      gap: 8,
    },
    emptyStateCtaText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
  });
}
