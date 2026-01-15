import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TopFriend } from '../../types/profile';
import { supabase } from '../../lib/supabase';

interface TopFriendsSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  title?: string;
  avatarStyle?: 'circle' | 'square';
  maxCount?: number;
  onManage?: () => void;
  colors: any;
}

export default function TopFriendsSection({
  profileId,
  isOwnProfile,
  title = 'Top Friends',
  avatarStyle = 'circle',
  maxCount = 8,
  onManage,
  colors,
}: TopFriendsSectionProps) {
  const [friends, setFriends] = React.useState<TopFriend[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadTopFriends();
  }, [profileId]);

  const loadTopFriends = async () => {
    try {
      const { data, error } = await supabase.rpc('get_top_friends', {
        p_profile_id: profileId,
      });

      if (error) throw error;

      const formattedFriends: TopFriend[] = (data || []).map((item: any) => ({
        id: item.friend_id || item.id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        is_live: item.is_live,
        display_order: item.position ?? 0,
      }));

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error loading top friends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Empty state with CTA for owner
  if (friends.length === 0) {
    if (!isOwnProfile) return null;
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.emptyState}>
          <Feather name="users" size={40} color={colors.textSecondary || colors.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Top Friends Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary || colors.text }]}>
            Add your favorite people to show them on your profile!
          </Text>
          {onManage && (
            <Pressable 
              onPress={onManage} 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Top Friends</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {isOwnProfile && onManage && (
          <Pressable onPress={onManage} style={styles.manageButton}>
            <Text style={[styles.manageText, { color: colors.primary }]}>Manage</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.grid}>
        {friends.slice(0, maxCount).map((friend) => (
          <View key={friend.id} style={styles.friendItem}>
            <Image
              source={{ uri: friend.avatar_url || undefined }}
              style={[
                styles.avatar,
                avatarStyle === 'square' && styles.avatarSquare,
              ]}
            />
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {friend.display_name || friend.username}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  friendItem: {
    width: 70,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 4,
  },
  avatarSquare: {
    borderRadius: 8,
  },
  username: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
