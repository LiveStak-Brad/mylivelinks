import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getAvatarSource } from '../../lib/defaultAvatar';
import MllProBadge from '../shared/MllProBadge';
import TopLeaderBadge from '../shared/TopLeaderBadge';
import { useTopLeaders, getLeaderType } from '../../hooks/useTopLeaders';

interface User {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  follower_count: number;
  is_live: boolean;
  is_online?: boolean;
  is_mll_pro?: boolean;
}

interface ConnectionsModalProps {
  visible: boolean;
  onClose: () => void;
  profileId: string;
  initialTab?: 'followers' | 'following' | 'friends';
  followerCount: number;
  followingCount: number;
  friendsCount: number;
  onNavigateToProfile: (profileId: string, username: string) => void;
  colors: {
    bg: string;
    card: string;
    text: string;
    mutedText: string;
    border: string;
    primary: string;
  };
}

const API_BASE_URL = 'https://www.mylivelinks.com';

export default function ConnectionsModal({
  visible,
  onClose,
  profileId,
  initialTab = 'followers',
  followerCount,
  followingCount,
  friendsCount,
  onNavigateToProfile,
  colors,
}: ConnectionsModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'friends'>(initialTab);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const tabs = [
    { id: 'followers' as const, label: 'Followers', count: followerCount },
    { id: 'following' as const, label: 'Following', count: followingCount },
    { id: 'friends' as const, label: 'Friends', count: friendsCount },
  ];

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    setUsers([]);
    setHasMore(true);
    setOffset(0);
  }, [profileId, activeTab]);

  const loadUsers = useCallback(async () => {
    if (!visible) return;
    
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const endpoint = activeTab === 'followers'
        ? `${API_BASE_URL}/api/profile/followers?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : activeTab === 'following'
        ? `${API_BASE_URL}/api/profile/following?profileId=${profileId}&limit=${limit}&offset=${offset}`
        : `${API_BASE_URL}/api/profile/friends?profileId=${profileId}&limit=${limit}&offset=${offset}`;

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      if (data.error) {
        console.error('Failed to load users:', data.error);
        return;
      }

      const newUsers = data[activeTab] || [];
      
      // Sort: live first, then online, then alphabetical
      const sortedUsers = [...newUsers].sort((a: User, b: User) => {
        // Live users first
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        // Then online users
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        // Then alphabetical by display_name or username
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setUsers(prev => offset === 0 ? sortedUsers : [...prev, ...sortedUsers]);
      const total = typeof data.total === 'number' ? data.total : null;
      setHasMore(total !== null ? offset + newUsers.length < total : newUsers.length === limit);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [visible, profileId, activeTab, offset]);

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible, loadUsers]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setOffset(prev => prev + limit);
    }
  };

  const handleUserPress = (user: User) => {
    onClose();
    onNavigateToProfile(user.id, user.username);
  };

  const renderUser = ({ item: user }: { item: User }) => (
    <Pressable
      style={({ pressed }) => [
        styles.userItem,
        { backgroundColor: pressed ? colors.border : 'transparent' },
      ]}
      onPress={() => handleUserPress(user)}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={getAvatarSource(user.avatar_url)}
          style={[
            styles.avatar,
            user.is_live && styles.avatarLiveRing,
          ]}
          defaultSource={require('../../assets/no-profile-pic.png')}
        />
        {/* Live badge */}
        {user.is_live && (
          <View style={styles.liveBadge}>
            <View style={styles.livePulse} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
        {/* Online dot (purple) - only if not live */}
        {!user.is_live && user.is_online && (
          <View style={styles.onlineDot} />
        )}
      </View>

      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {user.display_name || user.username}
          </Text>
          {user.is_mll_pro && <MllProBadge size="sm" />}
          <ConnectionLeaderBadge profileId={user.id} />
        </View>
        <Text style={[styles.userHandle, { color: colors.mutedText }]} numberOfLines={1}>
          @{user.username}
        </Text>
        {user.bio && (
          <Text style={[styles.userBio, { color: colors.mutedText }]} numberOfLines={1}>
            {user.bio}
          </Text>
        )}
      </View>

      <Text style={[styles.followerCount, { color: colors.mutedText }]}>
        {user.follower_count.toLocaleString()} followers
      </Text>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.mutedText }]}>
        No {activeTab} yet
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    if (loading && offset > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Connections</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
                activeTab === tab.id && { borderBottomColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabCount,
                  { color: activeTab === tab.id ? colors.primary : colors.mutedText },
                ]}
              >
                {tab.count.toLocaleString()}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? colors.primary : colors.mutedText },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* User List - maintains size during loading */}
        <View style={styles.listWrapper}>
          {/* Loading overlay - shows on top of existing content */}
          {loading && offset === 0 && (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.bg + 'E6' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          
          <FlatList
            data={users}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderUser}
            ListEmptyComponent={!loading ? renderEmpty : null}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

function ConnectionLeaderBadge({ profileId }: { profileId?: string }) {
  const leaders = useTopLeaders();
  const leaderType = getLeaderType(profileId, leaders);
  if (!leaderType) return null;
  return <TopLeaderBadge type={leaderType} size="sm" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    minHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
  },
  avatarLiveRing: {
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  livePulse: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#A855F7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  userHandle: {
    fontSize: 14,
  },
  userBio: {
    fontSize: 13,
    marginTop: 2,
  },
  followerCount: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
