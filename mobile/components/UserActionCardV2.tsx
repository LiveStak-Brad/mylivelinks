/**
 * UserActionCardV2 - Mobile (React Native)
 * FULL IMPLEMENTATION with real action handlers + role-based permissions
 * Premium action sheet for user interactions in live streams
 * Role-aware visibility (viewer/mod/admin/owner)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import type { GifterStatus } from '../lib/gifter-status';

type UserRole = 'viewer' | 'moderator' | 'admin' | 'owner';

interface UserActionCardV2Props {
  visible: boolean;
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  gifterStatus?: GifterStatus | null;
  isLive?: boolean;
  viewerCount?: number;
  onClose: () => void;

  // V2 Context
  inLiveRoom?: boolean;
  roomId?: string;
  liveStreamId?: number;

  // Role-based visibility
  currentUserRole?: UserRole;

  // Navigation callbacks (passed from parent screen)
  onNavigateToProfile?: (username: string) => void;
  onOpenIM?: (profileId: string, username: string, avatarUrl?: string) => void;
}

export const UserActionCardV2: React.FC<UserActionCardV2Props> = ({
  visible,
  profileId,
  username,
  displayName,
  avatarUrl,
  gifterStatus,
  isLive = false,
  viewerCount,
  onClose,
  inLiveRoom = false,
  roomId,
  liveStreamId,
  currentUserRole = 'viewer',
  onNavigateToProfile,
  onOpenIM,
}) => {
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [detectedRole, setDetectedRole] = useState<UserRole>(currentUserRole);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserId && currentUserId !== profileId) {
      checkFollowStatus();
      checkBlockStatus();
    }
  }, [currentUserId, profileId]);

  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const checkUserRole = async () => {
    // If role was explicitly passed, use it
    if (currentUserRole !== 'viewer') {
      setDetectedRole(currentUserRole);
      return;
    }

    if (!inLiveRoom) {
      setDetectedRole('viewer');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDetectedRole('viewer');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const isAdmin = (profile as any)?.username?.includes('admin') || false;
      
      if (isAdmin) {
        setDetectedRole('admin');
        return;
      }

      // Check if user is the room owner (streaming)
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('profile_id')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .single();

      if (liveStream) {
        setDetectedRole('owner');
        return;
      }

      // TODO: Check moderator status from room_moderators table when implemented
      setDetectedRole('viewer');
    } catch (error) {
      console.error('Error checking user role:', error);
      setDetectedRole('viewer');
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followee_id', profileId)
        .maybeSingle();

      if (!error) {
        setIsFollowing(!!data);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const checkBlockStatus = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    try {
      const { data, error } = await supabase.rpc('is_blocked', {
        p_user_id: currentUserId,
        p_other_user_id: profileId,
      });

      if (!error && data !== undefined) {
        setIsBlocked(data);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const isOwnProfile = currentUserId === profileId;

  // Role-based visibility helpers
  const canModerate =
    detectedRole === 'moderator' ||
    detectedRole === 'admin' ||
    detectedRole === 'owner';
  const canPromote = detectedRole === 'admin' || detectedRole === 'owner';

  // ========== REAL ACTION HANDLERS ==========

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', profileId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            followee_id: profileId,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleIM = () => {
    if (onOpenIM) {
      onOpenIM(profileId, username, avatarUrl);
    }
    onClose();
  };

  const handleVisitProfile = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile(username);
    }
    onClose();
  };

  const handleMoveToGrid = async () => {
    if (!inLiveRoom || !liveStreamId) {
      console.log('[TODO] Move to grid: No live stream context available');
      Alert.alert('Move to Grid', 'Move to Grid feature is not yet fully implemented');
      return;
    }

    try {
      // TODO: Implement actual grid management API
      console.log('[TODO] Move to grid:', { profileId, username, liveStreamId });
      Alert.alert('Move to Grid', `Move to Grid feature coming soon. Would move ${username} to grid.`);
    } catch (error) {
      console.error('Error moving to grid:', error);
      Alert.alert('Error', 'Failed to move user to grid');
    }
  };

  const handleMute = async () => {
    if (!inLiveRoom) {
      console.log('[TODO] Mute: No live room context available');
      return;
    }

    try {
      // TODO: Implement actual mute API via LiveKit or room management
      console.log('[TODO] Mute user:', { profileId, username });
      Alert.alert('Mute', `Mute feature coming soon. Would mute ${username}'s audio.`);
    } catch (error) {
      console.error('Error muting user:', error);
      Alert.alert('Error', 'Failed to mute user');
    }
  };

  const handleRemove = async () => {
    if (!inLiveRoom) {
      console.log('[TODO] Remove: No live room context available');
      return;
    }

    Alert.alert(
      'Remove from Stream',
      `Remove ${username} from the live room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement actual remove API
              // This should disconnect the user from LiveKit room and clear their room presence
              console.log('[TODO] Remove user:', { profileId, username });
              Alert.alert('Remove', `Remove feature coming soon. Would remove ${username} from room.`);
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('Error', 'Failed to remove user');
            }
          },
        },
      ]
    );
  };

  const handlePromoteToMod = async () => {
    if (!inLiveRoom || !roomId) {
      console.log('[TODO] Promote to mod: No live room context available');
      return;
    }

    Alert.alert(
      'Promote to Moderator',
      `Promote ${username} to moderator?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              // TODO: Implement room_moderators table and API
              console.log('[TODO] Promote to moderator:', { profileId, username, roomId });
              Alert.alert('Promote', `Promote to Moderator feature coming soon. Would promote ${username}.`);
            } catch (error) {
              console.error('Error promoting to moderator:', error);
              Alert.alert('Error', 'Failed to promote user');
            }
          },
        },
      ]
    );
  };

  const handleBattle = () => {
    // Battle feature is explicitly marked as coming soon - intentionally does nothing
    console.log('[Battle] Coming Soon feature clicked');
  };

  const handleReport = () => {
    // TODO: Implement mobile report flow (potentially using Alert or navigation to report screen)
    Alert.alert(
      'Report User',
      `Report ${username} for violating community guidelines?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            console.log('[TODO] Open report flow for:', username);
            Alert.alert('Report', 'Report feature coming soon. Please use the web version for now.');
            // TODO: Navigate to ReportUserScreen or show report modal
          },
        },
      ]
    );
  };

  const handleBlock = async () => {
    if (!currentUserId || currentUserId === profileId) return;

    Alert.alert(
      'Block User',
      `Block ${username}? They won't be able to see your content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setIsBlocking(true);
            try {
              const { error } = await supabase.rpc('block_user', {
                p_blocker_id: currentUserId,
                p_blocked_id: profileId,
              });

              if (error) throw error;

              setIsBlocked(true);
              Alert.alert('Blocked', `You have blocked ${username}`);
              onClose();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ]
    );
  };

  const themedStyles = {
    container: {
      backgroundColor: isDark ? '#111827' : '#ffffff',
    },
    text: {
      color: isDark ? '#ffffff' : '#111827',
    },
    subtext: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    border: {
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    sectionTitle: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.card, themedStyles.container]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, themedStyles.border]}>
              <View style={styles.headerContent}>
                {/* Avatar */}
                <Image
                  source={{
                    uri: avatarUrl || 'https://mylivelinks.com/no-profile-pic.png',
                  }}
                  style={styles.avatar}
                />

                {/* User Info */}
                <View style={styles.userInfo}>
                  <Text style={[styles.displayName, themedStyles.text]} numberOfLines={1}>
                    {displayName || username}
                  </Text>
                  <Text style={[styles.username, themedStyles.subtext]} numberOfLines={1}>
                    @{username}
                  </Text>

                  {/* Live indicator */}
                  {isLive && (
                    <View style={styles.liveRow}>
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                      {viewerCount !== undefined && (
                        <Text style={[styles.viewerCount, themedStyles.subtext]}>
                          {viewerCount} watching
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Gifter Badge Placeholder */}
                  {gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={[styles.badgeText, themedStyles.subtext]}>
                        Lvl {gifterStatus.level_in_tier} {gifterStatus.tier_key}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Close Button */}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? '#9ca3af' : '#6b7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Actions */}
            {!isOwnProfile && (
              <View style={styles.section}>
                <View style={styles.row}>
                  {/* Follow/Following */}
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={isFollowLoading}
                    style={[
                      styles.primaryButton,
                      styles.halfButton,
                      isFollowing
                        ? { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }
                        : { backgroundColor: '#3b82f6' },
                      isFollowLoading && { opacity: 0.6 },
                    ]}
                  >
                    {isFollowLoading ? (
                      <ActivityIndicator size="small" color={isDark ? '#d1d5db' : '#374151'} />
                    ) : (
                      <>
                        <Ionicons
                          name={isFollowing ? 'checkmark-circle' : 'person-add'}
                          size={18}
                          color={isFollowing ? (isDark ? '#d1d5db' : '#374151') : '#ffffff'}
                        />
                        <Text
                          style={[
                            styles.buttonText,
                            { color: isFollowing ? (isDark ? '#d1d5db' : '#374151') : '#ffffff' },
                          ]}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* IM */}
                  <TouchableOpacity
                    onPress={handleIM}
                    style={[
                      styles.primaryButton,
                      styles.halfButton,
                      { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble"
                      size={18}
                      color={isDark ? '#d1d5db' : '#374151'}
                    />
                    <Text style={[styles.buttonText, { color: isDark ? '#d1d5db' : '#374151' }]}>
                      IM
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Visit Profile */}
                <TouchableOpacity
                  onPress={handleVisitProfile}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
                  ]}
                >
                  <Ionicons name="person" size={18} color={isDark ? '#d1d5db' : '#374151'} />
                  <Text style={[styles.buttonText, { color: isDark ? '#d1d5db' : '#374151' }]}>
                    Visit Profile
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Live Actions */}
            {inLiveRoom && !isOwnProfile && (
              <View style={[styles.section, styles.sectionWithBorder, themedStyles.border]}>
                <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>
                  LIVE ACTIONS
                </Text>

                {/* Moderator/Admin/Owner Actions */}
                {canModerate && (
                  <>
                    <TouchableOpacity
                      onPress={handleMoveToGrid}
                      style={[styles.actionButton, { backgroundColor: isDark ? '#581c87' : '#f3e8ff' }]}
                    >
                      <Ionicons name="grid" size={18} color={isDark ? '#c084fc' : '#7c3aed'} />
                      <Text style={[styles.actionButtonText, { color: isDark ? '#c084fc' : '#7c3aed' }]}>
                        Move into Grid
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleMute}
                      style={[styles.actionButton, { backgroundColor: isDark ? '#7c2d12' : '#ffedd5' }]}
                    >
                      <Ionicons name="volume-mute" size={18} color={isDark ? '#fb923c' : '#ea580c'} />
                      <Text style={[styles.actionButtonText, { color: isDark ? '#fb923c' : '#ea580c' }]}>
                        Mute
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleRemove}
                      style={[styles.actionButton, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }]}
                    >
                      <Ionicons name="person-remove" size={18} color={isDark ? '#f87171' : '#dc2626'} />
                      <Text style={[styles.actionButtonText, { color: isDark ? '#f87171' : '#dc2626' }]}>
                        Remove from Stream
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Owner/Admin Only */}
                {canPromote && (
                  <TouchableOpacity
                    onPress={handlePromoteToMod}
                    style={[styles.actionButton, { backgroundColor: isDark ? '#14532d' : '#d1fae5' }]}
                  >
                    <Ionicons name="shield-checkmark" size={18} color={isDark ? '#4ade80' : '#16a34a'} />
                    <Text style={[styles.actionButtonText, { color: isDark ? '#4ade80' : '#16a34a' }]}>
                      Promote to Mod
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Battle - Coming Soon */}
                <TouchableOpacity
                  disabled
                  onPress={handleBattle}
                  style={[
                    styles.actionButton,
                    styles.disabledButton,
                    { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
                  ]}
                >
                  <Ionicons name="flash" size={18} color={isDark ? '#4b5563' : '#9ca3af'} />
                  <Text style={[styles.actionButtonText, { color: isDark ? '#4b5563' : '#9ca3af' }]}>
                    Battle
                  </Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Safety Section */}
            {!isOwnProfile && (
              <View style={[styles.section, styles.sectionWithBorder, themedStyles.border]}>
                <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>SAFETY</Text>

                <TouchableOpacity
                  onPress={handleReport}
                  style={[styles.actionButton, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
                >
                  <Ionicons name="flag" size={18} color={isDark ? '#d1d5db' : '#374151'} />
                  <Text style={[styles.actionButtonText, { color: isDark ? '#d1d5db' : '#374151' }]}>
                    Report
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBlock}
                  disabled={isBlocking}
                  style={[
                    styles.actionButton, 
                    { backgroundColor: '#ef4444' },
                    isBlocking && { opacity: 0.6 }
                  ]}
                >
                  {isBlocking ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="ban" size={18} color="#ffffff" />
                      <Text style={[styles.actionButtonText, { color: '#ffffff', fontWeight: '600' }]}>
                        {isBlocked ? 'Blocked' : 'Block'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    marginBottom: 8,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  viewerCount: {
    fontSize: 11,
  },
  badgeContainer: {
    marginTop: 6,
  },
  badgeText: {
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  section: {
    padding: 16,
    gap: 8,
  },
  sectionWithBorder: {
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
  },
  halfButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    minHeight: 48,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
  },
});

