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
      const { data, error } = await supabase
        .from('top_friends')
        .select(`
          friend_profile_id,
          display_order,
          profiles:friend_profile_id (
            id,
            username,
            display_name,
            avatar_url,
            is_live
          )
        `)
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const formattedFriends: TopFriend[] = (data || []).map((item: any) => ({
        id: item.profiles.id,
        username: item.profiles.username,
        display_name: item.profiles.display_name,
        avatar_url: item.profiles.avatar_url,
        is_live: item.profiles.is_live,
        display_order: item.display_order,
      }));

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error loading top friends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || friends.length === 0) {
    return null;
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
});
