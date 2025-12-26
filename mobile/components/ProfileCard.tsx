import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  is_live: boolean;
}

interface ProfileCardProps {
  profile: Profile;
  currentUserId: string | null;
  onPress: (username: string) => void;
  onFollow?: (profileId: string, isFollowing: boolean) => void;
}

export function ProfileCard({ profile, currentUserId, onPress, onFollow }: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const checkFollowStatus = async () => {
      try {
        // Check if you follow them
        const { data: youFollowThem } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('followee_id', profile.id)
          .maybeSingle();

        setIsFollowing(!!youFollowThem);

        // Check if they follow you
        const { data: theyFollowYou } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', profile.id)
          .eq('followee_id', currentUserId)
          .maybeSingle();

        setFollowsYou(!!theyFollowYou);
      } catch (error) {
        console.error('Follow status check error:', error);
      }
    };

    checkFollowStatus();
  }, [currentUserId, profile.id]);

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', profile.id);
        setIsFollowing(false);
        onFollow?.(profile.id, false);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            followee_id: profile.id,
          });
        setIsFollowing(true);
        onFollow?.(profile.id, true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = profile.display_name || profile.username;
  const truncatedBio =
    profile.bio && profile.bio.length > 80
      ? profile.bio.substring(0, 80) + '...'
      : profile.bio || 'No bio yet';

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(profile.username)}
    >
      {/* Header with gradient background */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {profile.is_live && <View style={styles.liveDot} />}
        </View>

        {/* Live Badge */}
        {profile.is_live && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.content}>
        <Text style={styles.displayName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{profile.username}
        </Text>
        <Text style={styles.bio} numberOfLines={2}>
          {truncatedBio}
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.followerCount}>
            <Text style={styles.followerCountText}>
              {profile.follower_count >= 1000
                ? `${(profile.follower_count / 1000).toFixed(1)}K`
                : profile.follower_count}
            </Text>
            <Text style={styles.followerCountLabel}>followers</Text>
          </View>

          {currentUserId && currentUserId !== profile.id && (
            <Pressable
              style={[
                styles.followButton,
                isFollowing
                  ? styles.followButtonFollowing
                  : followsYou
                  ? styles.followButtonFollowBack
                  : styles.followButtonDefault,
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Following' : followsYou ? 'Follow Back' : 'Follow'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    height: 140,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  liveDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    borderWidth: 3,
    borderColor: '#fff',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  content: {
    padding: 16,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#9aa0a6',
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: '#c9c9c9',
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  followerCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  followerCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  followerCountLabel: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonDefault: {
    backgroundColor: '#5E9BFF',
  },
  followButtonFollowBack: {
    backgroundColor: '#5E9BFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  followButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

