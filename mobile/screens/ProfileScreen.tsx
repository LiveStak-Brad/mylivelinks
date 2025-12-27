import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, PageShell, BottomNav } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { useAutoHideBars } from '../hooks/useAutoHideBars';
import { getAvatarSource } from '../lib/defaultAvatar';

/* =============================================================================
   PROFILE SCREEN v2 - FULL VISUAL PARITY WITH WEB
   
   WEB SOURCE: app/[username]/modern-page.tsx
   
   KEY CHANGES FROM v1:
   - Full-screen background image (not banner-only)
   - ALL sections now render as proper cards with shadows/borders
   - Theme-aware text colors (light mode fix)
   - Visual styling matches web: shadows, borders, rounded corners
   - Gradient overlay on background
   
   VISUAL STRUCTURE (matches web):
   1. Full-screen background with gradient overlay
   2. Hero card (avatar, name, bio, action buttons, badges)
   3. Stats cards (social counts, top supporters, top streamers)
   4. Social media card
   5. Connections card (collapsible, tabs)
   6. Links card
   7. Profile stats card
   8. Footer card
   
   All cards use theme.surfaceCard with proper shadows/borders.
   All text uses theme tokens (textPrimary, textSecondary, textMuted).
============================================================================= */

interface ProfileData {
  profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_live: boolean;
    live_stream_id?: number;
    follower_count: number;
    total_gifts_received: number;
    total_gifts_sent: number;
    gifter_level: number;
    created_at: string;
    coin_balance?: number;
    earnings_balance?: number;
    hide_streaming_stats?: boolean;
    // Customization (MATCH WEB)
    profile_bg_url?: string;
    profile_bg_overlay?: string;
    card_color?: string;
    card_opacity?: number;
    card_border_radius?: string;
    font_preset?: string;
    accent_color?: string;
    links_section_title?: string;
    // Social media
    social_instagram?: string;
    social_twitter?: string;
    social_youtube?: string;
    social_tiktok?: string;
    social_facebook?: string;
    social_twitch?: string;
    social_discord?: string;
    social_snapchat?: string;
    social_linkedin?: string;
    social_github?: string;
    social_spotify?: string;
    social_onlyfans?: string;
  };
  gifter_statuses?: Record<string, { tier_key: string; level_in_tier: number; lifetime_coins: number }>;
  links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string;
    click_count: number;
    display_order: number;
  }>;
  adult_links: Array<any>;
  show_adult_section: boolean;
  follower_count: number;
  following_count: number;
  friends_count: number;
  relationship: 'none' | 'following' | 'followed_by' | 'friends';
  top_supporters: Array<{
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    gifter_level: number;
    total_gifted: number;
  }>;
  top_streamers: Array<{
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    is_live: boolean;
    diamonds_earned_lifetime: number;
    peak_viewers: number;
    total_streams: number;
  }>;
  stream_stats: {
    total_streams: number;
    total_minutes_live: number;
    total_viewers: number;
    peak_viewers: number;
    diamonds_earned_lifetime: number;
    diamonds_earned_7d: number;
    followers_gained_from_streams: number;
    last_stream_at?: string;
  };
  streak_days?: number;
  gifter_rank?: number;
  streamer_rank?: number;
}

type ConnectionsTab = 'following' | 'followers' | 'friends';
type ProfileTab = 'info' | 'feed' | 'photos';

type ProfileScreenProps = {
  /** The username to display */
  username: string;
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean;
  /** API base URL */
  apiBaseUrl?: string;
  /** Auth token for API calls */
  authToken?: string;
  /** Called when user taps back arrow */
  onBack?: () => void;
  /** Called when user taps Edit Profile */
  onEditProfile?: () => void;
  /** Called when user taps Message */
  onMessage?: (profileId: string) => void;
  /** Called when user taps Stats */
  onStats?: (username: string) => void;
  /** Navigation prop for bottom nav */
  navigation?: any;
};

interface ConnectionUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_live?: boolean;
}

export function ProfileScreen({
  username,
  isOwnProfile = false,
  apiBaseUrl = 'https://mylivelinks.com',
  authToken,
  onBack,
  onEditProfile,
  onMessage,
  onStats,
  navigation,
}: ProfileScreenProps) {
  const { session } = useAuthContext();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUserId = session?.user?.id ?? null;
  
  // Auto-hide bars on scroll
  const { barsVisible, scrollHandlers } = useAutoHideBars({
    threshold: 5,
    showDelay: 150,
  });
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [activeConnectionsTab, setActiveConnectionsTab] = useState<ConnectionsTab>('following');
  const [connectionsExpanded, setConnectionsExpanded] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  // Load connections when tab changes or expanded state changes
  useEffect(() => {
    if (connectionsExpanded && profileData) {
      loadConnections();
    }
  }, [activeConnectionsTab, connectionsExpanded, profileData?.profile.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/profile/${username}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setProfileData(data);
    } catch (err: any) {
      console.error('Profile load error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    if (!profileData) return;
    
    setConnectionsLoading(true);
    try {
      // Call same RPC as web UserConnectionsList component
      const rpcFunctionMap = {
        following: 'get_user_following',
        followers: 'get_user_followers',
        friends: 'get_user_friends',
      };

      const { data, error } = await supabase.rpc(
        rpcFunctionMap[activeConnectionsTab],
        {
          target_user_id: profileData.profile.id,
          requesting_user_id: currentUserId || null, // Pass authenticated user ID for relationship context
        }
      );

      if (error) {
        console.error('Failed to load connections:', error);
        setConnections([]);
        return;
      }

      setConnections(data || []);
    } catch (err: any) {
      console.error('Connections load error:', err);
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileData || followLoading) return;

    setFollowLoading(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/profile/follow`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetProfileId: profileData.profile.id }),
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert('Login Required', 'Please log in to follow users');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to follow/unfollow');
        return;
      }

      if (data.success) {
        // Update relationship status locally
        const wasFollowing = profileData.relationship !== 'none';
        const isFollowingNow = data.status !== 'none';

        setProfileData((prev) => {
          if (!prev) return null;

          return {
            ...prev,
            relationship: data.status,
            follower_count: isFollowingNow
              ? wasFollowing
                ? prev.follower_count
                : prev.follower_count + 1
              : prev.follower_count - 1,
          };
        });
      }
    } catch (err: any) {
      console.error('Follow error:', err);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profileData) return;

    const url = `${apiBaseUrl}/${username}`;
    const title = `${profileData.profile.display_name || username} on MyLiveLinks`;
    const message = `Check out ${
      profileData.profile.display_name || username
    }'s profile on MyLiveLinks - Live streaming, links, and exclusive content! 🔥\n${url}`;

    try {
      await Share.share({
        title,
        message,
        url,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const openSocialLink = async (url: string) => {
    try {
      // Build proper URL if just username provided
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Determine platform from context (would need platform param in real impl)
        fullUrl = `https://${url}`;
      }
      await Linking.openURL(fullUrl);
    } catch (error) {
      console.error('Error opening social link:', error);
      Alert.alert('Error', 'Could not open link');
    }
  };

  const getFollowButtonConfig = () => {
    if (!profileData) return null;

    switch (profileData.relationship) {
      case 'friends':
        return {
          text: 'Friends',
          color: '#10B981',
        };
      case 'following':
        return {
          text: 'Following',
          color: '#6B7280',
        };
      default:
        return {
          text: 'Follow',
          color: '#5E9BFF',
        };
    }
  };

  // Loading state - show minimal UI immediately
  if (loading && !profileData) {
    return (
      <PageShell 
        contentStyle={styles.container}
        useNewHeader
        edges={['top']}
        onNavigateHome={() => navigation.navigate('Home')}
        onNavigateToProfile={(username) => navigation.push('Profile', { username })}
        onNavigateToRooms={() => navigation.navigate('Rooms')}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5E9BFF" />
        </View>
      </PageShell>
    );
  }

  // Error state
  if (error || !profileData) {
    return (
      <PageShell
        contentStyle={styles.container}
        useNewHeader
        edges={['top']}
        onNavigateHome={() => {}}
        onNavigateToProfile={(username) => {}}
        onNavigateToRooms={() => {}}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>
            {error || `The user @${username} doesn't exist.`}
          </Text>
        </View>
      </PageShell>
    );
  }

  const { profile } = profileData;
  const gifterStatus = profileData.gifter_statuses?.[profile.id];
  const gifterLevelDisplay =
    gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0
      ? Number(gifterStatus.level_in_tier ?? 0)
      : Number(profile.gifter_level ?? 0);
  const followBtnConfig = getFollowButtonConfig();

  // Apply user customization settings (matches web)
  const cardColor = profile.card_color || (theme.mode === 'light' ? '#FFFFFF' : theme.colors.surfaceCard);
  const cardOpacity = profile.card_opacity !== undefined ? profile.card_opacity : 0.95;
  const cardBorderRadius = {
    'small': 12,
    'medium': 18,
    'large': 24
  }[profile.card_border_radius || 'medium'] || 18;
  const accentColor = profile.accent_color || theme.colors.accent;

  // Card style to apply to all cards
  const customCardStyle = {
    backgroundColor: cardColor,
    opacity: cardOpacity,
    borderRadius: cardBorderRadius,
  };

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      edges={['top']}
      onNavigateHome={() => {}}
      onNavigateToProfile={(username) => {}}
      onNavigateToRooms={() => {}}
    >
      {/* FULL-SCREEN BACKGROUND IMAGE (like web) */}
      <View style={styles.backgroundContainer}>
        {profile.profile_bg_url ? (
          <>
            <Image
              source={{ uri: resolveMediaUrl(profile.profile_bg_url) }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            {/* Gradient overlay (matches web overlayClass) */}
            <View style={styles.backgroundGradient} />
          </>
        ) : (
          // Fallback branded gradient (matches web default)
          <View style={[styles.backgroundImage, styles.backgroundFallback]} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        {...scrollHandlers}
      >
        {/* HERO CARD */}
        <View style={[styles.heroCard, customCardStyle]}>
          {/* Top Right Badges - Streak & Ranks */}
          <View style={styles.topBadges}>
            {!!profileData.streak_days && profileData.streak_days > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.badgeEmoji}>🔥</Text>
                <Text style={styles.badgeValue}>{profileData.streak_days}</Text>
                <Text style={styles.badgeLabel}>day streak</Text>
              </View>
            )}
            {!!profileData.gifter_rank && profileData.gifter_rank > 0 && (
              <View style={[styles.rankBadge, styles.gifterBadge]}>
                <Text style={styles.badgeEmoji}>🏆</Text>
                <Text style={styles.badgeValue}>#{profileData.gifter_rank}</Text>
                <Text style={styles.badgeLabel}>Gifter</Text>
              </View>
            )}
            {!!profileData.streamer_rank && profileData.streamer_rank > 0 && (
              <View style={[styles.rankBadge, styles.streamerBadge]}>
                <Text style={styles.badgeEmoji}>⭐</Text>
                <Text style={styles.badgeValue}>#{profileData.streamer_rank}</Text>
                <Text style={styles.badgeLabel}>Streamer</Text>
              </View>
            )}
          </View>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image 
              source={getAvatarSource(resolveMediaUrl(profile.avatar_url))} 
              style={styles.avatar} 
            />
            {profile.is_live && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Display Name & Username */}
          <Text style={styles.displayName}>
            {profile.display_name || profile.username}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {/* Bio */}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!isOwnProfile ? (
              <>
                <Button
                  title={followLoading ? 'Loading...' : followBtnConfig?.text || 'Follow'}
                  onPress={handleFollow}
                  variant="primary"
                  style={[
                    styles.actionButton,
                    { backgroundColor: followBtnConfig?.color || '#5E9BFF' },
                  ]}
                  disabled={followLoading}
                />
                <Button
                  title="Message"
                  onPress={() => onMessage?.(profile.id)}
                  variant="secondary"
                  style={styles.actionButton}
                />
              </>
            ) : (
              <Button
                title="Edit Profile"
                onPress={() => onEditProfile?.()}
                variant="secondary"
                style={styles.actionButtonFull}
              />
            )}
            <Pressable onPress={handleShare} style={styles.statsButton}>
              <Ionicons name="share-outline" size={20} color={accentColor} />
            </Pressable>
            <Pressable onPress={() => onStats?.(profile.username)} style={styles.statsButton}>
              <Ionicons name="bar-chart" size={20} color={accentColor} />
            </Pressable>
          </View>
        </View>

        {/* PROFILE TABS (Info | Feed | Photos) */}
        <View style={[styles.card, customCardStyle, { marginTop: 0, paddingVertical: 0 }]}>
          <View style={styles.profileTabs}>
            <Pressable
              style={[
                styles.profileTab,
                activeTab === 'info' && { borderBottomColor: accentColor, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab('info')}
            >
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={activeTab === 'info' ? accentColor : theme.colors.textMuted} 
              />
              <Text
                style={[
                  styles.profileTabText,
                  activeTab === 'info' && { color: accentColor, fontWeight: '700' },
                ]}
              >
                Info
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.profileTab,
                activeTab === 'feed' && { borderBottomColor: accentColor, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab('feed')}
            >
              <Ionicons 
                name="albums" 
                size={20} 
                color={activeTab === 'feed' ? accentColor : theme.colors.textMuted} 
              />
              <Text
                style={[
                  styles.profileTabText,
                  activeTab === 'feed' && { color: accentColor, fontWeight: '700' },
                ]}
              >
                Feed
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.profileTab,
                activeTab === 'photos' && { borderBottomColor: accentColor, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab('photos')}
            >
              <Ionicons 
                name="images" 
                size={20} 
                color={activeTab === 'photos' ? accentColor : theme.colors.textMuted} 
              />
              <Text
                style={[
                  styles.profileTabText,
                  activeTab === 'photos' && { color: accentColor, fontWeight: '700' },
                ]}
              >
                Photos
              </Text>
            </Pressable>
          </View>
        </View>

        {/* TAB CONTENT */}
        {activeTab === 'info' && (
          <>
            {/* STATS CARDS SECTION (Social Counts, Top Supporters, Top Streamers) */}
        {!profile.hide_streaming_stats && (
          <View style={styles.statsCardsContainer}>
            {/* Social Counts Card */}
            <View style={[styles.card, customCardStyle]}>
              <Text style={styles.cardTitle}>Social</Text>
              <View style={styles.socialCountsRow}>
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.follower_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Followers</Text>
                </View>
                <View style={styles.socialCountDivider} />
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.following_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Following</Text>
                </View>
                <View style={styles.socialCountDivider} />
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.friends_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Friends</Text>
                </View>
              </View>
            </View>

            {/* Top Supporters Card */}
            {profileData.top_supporters.length > 0 && (
              <View style={[styles.card, customCardStyle]}>
                <Text style={styles.cardTitle}>🎁 Top Supporters</Text>
                {profileData.top_supporters.slice(0, 3).map((supporter, idx) => (
                  <View key={supporter.id} style={styles.listItem}>
                    <View style={styles.listItemAvatar}>
                      {resolveMediaUrl(supporter.avatar_url) ? (
                        <Image
                          source={{ uri: resolveMediaUrl(supporter.avatar_url) }}
                          style={styles.listItemAvatarImage}
                        />
                      ) : (
                        <Text style={styles.listItemAvatarText}>
                          {supporter.username[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemName}>
                        {supporter.display_name || supporter.username}
                      </Text>
                      <Text style={styles.listItemMeta}>
                        {formatNumber(supporter.total_gifted)} coins gifted
                      </Text>
                    </View>
                    <Text style={[styles.listItemRank, { color: accentColor }]}>#{idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Streamers Card */}
            {profileData.top_streamers.length > 0 && (
              <View style={[styles.card, customCardStyle]}>
                <Text style={styles.cardTitle}>🌟 Top Streamers</Text>
                {profileData.top_streamers.slice(0, 3).map((streamer, idx) => (
                  <View key={streamer.id} style={styles.listItem}>
                    <View style={styles.listItemAvatar}>
                      {resolveMediaUrl(streamer.avatar_url) ? (
                        <Image
                          source={{ uri: resolveMediaUrl(streamer.avatar_url) }}
                          style={styles.listItemAvatarImage}
                        />
                      ) : (
                        <Text style={styles.listItemAvatarText}>
                          {streamer.username[0].toUpperCase()}
                        </Text>
                      )}
                      {streamer.is_live && <View style={styles.listItemLiveDot} />}
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemName}>
                        {streamer.display_name || streamer.username}
                      </Text>
                      <Text style={styles.listItemMeta}>
                        {formatNumber(streamer.diamonds_earned_lifetime)} 💎 earned
                      </Text>
                    </View>
                    <Text style={[styles.listItemRank, { color: accentColor }]}>#{idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SOCIAL MEDIA CARD */}
        {(profile.social_instagram ||
          profile.social_twitter ||
          profile.social_youtube ||
          profile.social_tiktok ||
          profile.social_facebook ||
          profile.social_twitch ||
          profile.social_discord ||
          profile.social_snapchat ||
          profile.social_linkedin ||
          profile.social_github ||
          profile.social_spotify ||
          profile.social_onlyfans) && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>Social Media</Text>
            <View style={styles.socialRow}>
              {profile.social_instagram && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_instagram!)}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </Pressable>
              )}
              {profile.social_twitter && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_twitter!)}>
                  <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                </Pressable>
              )}
              {profile.social_youtube && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_youtube!)}>
                  <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                </Pressable>
              )}
              {profile.social_tiktok && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_tiktok!)}>
                  <Ionicons name="logo-tiktok" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              )}
              {profile.social_facebook && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_facebook!)}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </Pressable>
              )}
              {profile.social_twitch && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_twitch!)}>
                  <Ionicons name="logo-twitch" size={24} color="#9146FF" />
                </Pressable>
              )}
              {profile.social_discord && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_discord!)}>
                  <Ionicons name="logo-discord" size={24} color="#5865F2" />
                </Pressable>
              )}
              {profile.social_spotify && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_spotify!)}>
                  <Ionicons name="musical-notes" size={24} color="#1DB954" />
                </Pressable>
              )}
              {profile.social_github && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_github!)}>
                  <Ionicons name="logo-github" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              )}
              {profile.social_linkedin && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_linkedin!)}>
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* CONNECTIONS CARD */}
        <View style={[styles.card, customCardStyle]}>
          <Pressable
            onPress={() => setConnectionsExpanded(!connectionsExpanded)}
            style={styles.sectionHeader}
          >
            <Text style={styles.cardTitle}>Connections</Text>
            <Ionicons 
              name={connectionsExpanded ? 'chevron-down' : 'chevron-forward'} 
              size={20} 
              color={theme.colors.textMuted} 
            />
          </Pressable>

          {connectionsExpanded && (
            <>
              {/* Tab Headers */}
              <View style={styles.connectionsTabs}>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'following' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('following')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'following' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Following ({profileData.following_count})
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'followers' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('followers')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'followers' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Followers ({profileData.follower_count})
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'friends' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('friends')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'friends' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Friends ({profileData.friends_count})
                  </Text>
                </Pressable>
              </View>

              {/* Tab Content */}
              <View style={styles.connectionsContent}>
                {connectionsLoading ? (
                  <ActivityIndicator color={theme.colors.accentSecondary} style={styles.connectionsLoader} />
                ) : connections.length > 0 ? (
                  connections.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.connectionItem}
                      onPress={() => {
                        /* Navigate to profile */
                      }}
                    >
                      <View style={styles.connectionAvatar}>
                        {resolveMediaUrl(user.avatar_url) ? (
                          <Image
                            source={{ uri: resolveMediaUrl(user.avatar_url) }}
                            style={styles.connectionAvatarImage}
                          />
                        ) : (
                          <Text style={styles.connectionAvatarText}>
                            {(user.username || '?').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>
                          {user.display_name || user.username}
                        </Text>
                        <Text style={styles.connectionUsername}>@{user.username}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    {activeConnectionsTab === 'following' && 'Not following anyone yet'}
                    {activeConnectionsTab === 'followers' && 'No followers yet'}
                    {activeConnectionsTab === 'friends' && 'No friends yet'}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* LINKS CARD */}
        {profileData.links.length > 0 && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>My Links</Text>
            {profileData.links.map((link) => (
              <Pressable 
                key={link.id} 
                style={styles.linkItem}
                onPress={() => Linking.openURL(link.url)}
              >
              <View style={styles.linkIcon}>
                <Ionicons name="link" size={20} color={accentColor} />
              </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* PROFILE STATS CARD */}
        {!profile.hide_streaming_stats && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>📊 Profile Stats</Text>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Streams</Text>
              <Text style={styles.statsDetailValue}>
                {profileData.stream_stats.total_streams}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Peak Viewers</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profileData.stream_stats.peak_viewers)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>💎 Diamonds Earned</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profileData.stream_stats.diamonds_earned_lifetime)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Gifter Level</Text>
              <Text style={styles.statsDetailValue}>{gifterLevelDisplay}</Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>🪙 Gifts Sent</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profile.total_gifts_sent)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>🎁 Gifts Received</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profile.total_gifts_received)}
              </Text>
            </View>
          </View>
        )}

        {/* FOOTER CARD */}
        <View style={[styles.card, customCardStyle]}>
          <View style={styles.footerContent}>
            <Text style={[styles.footerBrand, { color: accentColor }]}>MyLiveLinks</Text>
            <Text style={styles.footerText}>
              Create your own stunning profile, go live, and connect with your audience.
            </Text>
            <Button
              title="Create Your Free Profile"
              variant="primary"
              style={styles.footerButton}
              onPress={() => {
                /* Navigate to signup */
              }}
            />
            <Text style={styles.footerSubtext}>
              All-in-one platform: Live streaming • Links • Social • Monetization
            </Text>
          </View>
        </View>
          </>
        )}

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <View style={[styles.card, customCardStyle]}>
            <View style={styles.emptyStateContainer}>
              <Ionicons name="albums-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
              <Text style={styles.emptyStateText}>
                Posts and updates will appear here
              </Text>
            </View>
          </View>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <View style={[styles.card, customCardStyle]}>
            <View style={styles.emptyStateContainer}>
              <Ionicons name="images-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Photos Yet</Text>
              <Text style={styles.emptyStateText}>
                Photos and media will appear here
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </PageShell>
  );
}

// Helper function to format numbers (matches WEB behavior via toLocaleString)
function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US');
}

// Create theme-aware styles (NEW: Fully dynamic based on theme)
function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    // Full-screen background (like web)
    backgroundContainer: {
      position: 'absolute',
      top: 0, // No page header, starts right below global header
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    backgroundFallback: {
      backgroundColor: '#3B82F6',
    },
    
    // Scroll container
    scroll: {
      flex: 1,
      zIndex: 1,
    },
    scrollContent: {
      paddingBottom: 100, // Space for bottom nav (68px + padding)
      paddingTop: 16,
    },

    // Bottom nav container
    bottomNavContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },

    // Loading/Error states
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      marginTop: 16,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 8,
    },
    errorText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
    },
    
    // Header buttons
    shareButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },

    // HERO CARD - Floating over background
    heroCard: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 24,
      alignItems: 'center',
      position: 'relative',
      // Shadow
      shadowColor: theme.elevations.card.color,
      shadowOffset: theme.elevations.card.offset,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: theme.elevations.card.radius,
      elevation: theme.elevations.card.elevation,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    
    // Top Badges (Streak, Ranks)
    topBadges: {
      position: 'absolute',
      top: 12,
      right: 12,
      gap: 8,
      zIndex: 10,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    rankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    gifterBadge: {
      backgroundColor: '#F59E0B',
    },
    streamerBadge: {
      backgroundColor: '#A855F7',
    },
    badgeEmoji: {
      fontSize: 12,
    },
    badgeValue: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    badgeLabel: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
      opacity: 0.9,
    },
    
    // Avatar
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: theme.mode === 'light' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.mode === 'light' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.3)',
    },
    avatarLetter: {
      color: '#fff',
      fontSize: 36,
      fontWeight: '800',
    },
    liveBadge: {
      position: 'absolute',
      bottom: -4,
      right: -8,
      backgroundColor: '#EF4444',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
    },
    liveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    
    // Profile info
    displayName: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    username: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    bio: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    
    // Action buttons
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    actionButton: {
      minWidth: 100,
      minHeight: 44,
    },
    actionButtonFull: {
      minWidth: 200,
      minHeight: 44,
    },
    statsButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(94, 155, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // PROFILE TABS (Info | Feed | Photos)
    profileTabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    profileTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    profileTabText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },

    // Empty States
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },

    // CARDS - All sections use this base style
    card: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      // Shadow
      shadowColor: theme.elevations.card.color,
      shadowOffset: theme.elevations.card.offset,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: 10,
      elevation: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },

    // Stats Cards Container
    statsCardsContainer: {
      gap: 14,
    },
    
    // Social Counts (in card)
    socialCountsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    socialCountItem: {
      flex: 1,
      alignItems: 'center',
    },
    socialCountValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    socialCountLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    socialCountDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
    },

    // List Items (supporters/streamers)
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    listItemAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    listItemAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    listItemAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    listItemLiveDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#EF4444',
      borderWidth: 2,
      borderColor: theme.colors.surfaceCard,
    },
    listItemInfo: {
      flex: 1,
    },
    listItemName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    listItemMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    listItemRank: {
      color: theme.colors.accentSecondary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
    },

    // Social Media Icons
    socialRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    socialIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    // Connections
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    connectionsTabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginTop: 12,
    },
    connectionsTab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    connectionsTabActive: {
      borderBottomColor: theme.colors.accentSecondary,
    },
    connectionsTabText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    connectionsTabTextActive: {
      color: theme.colors.accentSecondary,
      fontWeight: '700',
    },
    connectionsContent: {
      paddingVertical: 16,
    },
    connectionsLoader: {
      paddingVertical: 20,
    },
    connectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
    },
    connectionAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    connectionAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    connectionAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    connectionInfo: {
      flex: 1,
    },
    connectionName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    connectionUsername: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },

    // Links
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      gap: 12,
    },
    linkIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.15)' : 'rgba(94, 155, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkInfo: {
      flex: 1,
    },
    linkTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    linkUrl: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },

    // Stats Detail Rows
    statsDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statsDetailLabel: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    statsDetailValue: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },

    // Footer
    footerContent: {
      alignItems: 'center',
    },
    footerBrand: {
      color: theme.colors.accentPrimary,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 8,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    footerButton: {
      minWidth: 200,
      marginBottom: 12,
    },
    footerSubtext: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
  });
}

export default ProfileScreen;
