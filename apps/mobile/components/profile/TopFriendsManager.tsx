import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface TopFriend {
  id: string;
  friend_id: string;
  position: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
  follower_count: number;
}

interface TopFriendsManagerProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  colors: {
    bg: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

export default function TopFriendsManager({
  profileId,
  isOpen,
  onClose,
  onSave,
  colors,
}: TopFriendsManagerProps) {
  const [topFriends, setTopFriends] = useState<TopFriend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTopFriends();
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, profileId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTopFriends = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_top_friends', {
        p_profile_id: profileId,
      });

      if (error) {
        console.error('[TopFriendsManager] Load error:', error);
        return;
      }

      const friends: TopFriend[] = (data || []).map((item: any) => ({
        id: item.id,
        friend_id: item.friend_id,
        position: item.position,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        is_live: item.is_live,
      }));

      setTopFriends(friends);
    } catch (error) {
      console.error('[TopFriendsManager] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      const likePattern = `%${searchQuery.trim().toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_live, follower_count')
        .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
        .neq('id', profileId)
        .order('follower_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[TopFriendsManager] Search error:', error);
        return;
      }

      // Filter out users already in top friends
      const friendIds = new Set(topFriends.map((f) => f.friend_id));
      const filtered = (data || []).filter((u: UserProfile) => !friendIds.has(u.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('[TopFriendsManager] Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (user: UserProfile) => {
    if (topFriends.length >= 8) {
      Alert.alert('Limit Reached', 'You can only have up to 8 top friends!');
      return;
    }

    try {
      setSaving(true);
      const nextPosition = topFriends.length > 0 
        ? Math.max(...topFriends.map(f => f.position)) + 1 
        : 1;

      const { data, error } = await supabase.rpc('upsert_top_friend', {
        p_friend_id: user.id,
        p_position: nextPosition,
      });

      if (error) {
        console.error('[TopFriendsManager] Add error:', error);
        Alert.alert('Error', error.message || 'Failed to add friend');
        return;
      }

      const result = data as any;
      if (result && !result.success) {
        Alert.alert('Error', result.error || 'Failed to add friend');
        return;
      }

      await loadTopFriends();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('[TopFriendsManager] Add error:', error);
      Alert.alert('Error', error?.message || 'Failed to add friend');
    } finally {
      setSaving(false);
    }
  };

  const removeFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Remove this person from your top friends?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const { data, error } = await supabase.rpc('remove_top_friend', {
                p_friend_id: friendId,
              });

              if (error) {
                console.error('[TopFriendsManager] Remove error:', error);
                Alert.alert('Error', error.message || 'Failed to remove friend');
                return;
              }

              await loadTopFriends();
            } catch (error: any) {
              console.error('[TopFriendsManager] Remove error:', error);
              Alert.alert('Error', error?.message || 'Failed to remove friend');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    onSave();
    onClose();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '•';
  };

  const renderFriend = ({ item }: { item: TopFriend }) => (
    <View style={[styles.friendItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarInitials}>
            {getInitials(item.display_name || item.username)}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
          {item.display_name || item.username}
        </Text>
        <Text style={[styles.friendUsername, { color: colors.textSecondary }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <Pressable
        onPress={() => removeFriend(item.friend_id)}
        style={styles.removeButton}
        disabled={saving}
      >
        <Ionicons name="close-circle" size={24} color="#EF4444" />
      </Pressable>
    </View>
  );

  const renderSearchResult = ({ item }: { item: UserProfile }) => (
    <Pressable
      style={[styles.searchResultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => addFriend(item)}
      disabled={saving}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarInitials}>
            {getInitials(item.display_name || item.username)}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
          {item.display_name || item.username}
        </Text>
        <Text style={[styles.friendUsername, { color: colors.textSecondary }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color={colors.primary} />
    </Pressable>
  );

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Manage Top Friends</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search people to add..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Search Results
            </Text>
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : searchResults.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No results found
              </Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchResult}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {/* Current Top Friends */}
        {searchQuery.length === 0 && (
          <View style={styles.friendsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Your Top Friends ({topFriends.length}/8)
            </Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : topFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Top Friends Yet</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Search for people above to add them to your top friends!
                </Text>
              </View>
            ) : (
              <FlatList
                data={topFriends}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                style={styles.friendsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  friendsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loader: {
    marginTop: 24,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
