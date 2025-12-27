import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ProfileCard } from './ProfileCard';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  is_live: boolean;
}

interface ProfileCarouselProps {
  title: string;
  currentUserId: string | null;
  onProfilePress: (username: string) => void;
}

export function ProfileCarousel({ title, currentUserId, onProfilePress }: ProfileCarouselProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    loadProfiles();
  }, [currentUserId]);

  const loadProfiles = async () => {
    try {
      if (currentUserId) {
        // Get recommended profiles based on similar follows
        const recommended = await getRecommendedProfiles(currentUserId);
        setProfiles(recommended);
      } else {
        // Get most popular profiles for non-logged-in users
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live')
          .not('username', 'is', null)
          .order('follower_count', { ascending: false })
          .limit(20);

        setProfiles(data || []);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedProfiles = async (userId: string): Promise<Profile[]> => {
    try {
      // Get users the current user follows
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId);

      const followingIds = following?.map((f: { followee_id: string }) => f.followee_id) || [];

      if (followingIds.length === 0) {
        // If not following anyone, show most popular
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live')
          .not('username', 'is', null)
          .neq('id', userId)
          .order('follower_count', { ascending: false })
          .limit(20);

        return data || [];
      }

      // Get users who are followed by people the current user follows (similar interests)
      const { data: similarFollows } = await supabase
        .from('follows')
        .select('followee_id')
        .in('follower_id', followingIds)
        .neq('followee_id', userId)
        .not('followee_id', 'in', `(${followingIds.join(',')})`);

      // Count occurrences to find most commonly followed
      const followCounts = new Map<string, number>();
      similarFollows?.forEach((f: { followee_id: string }) => {
        followCounts.set(f.followee_id, (followCounts.get(f.followee_id) || 0) + 1);
      });

      // Get top recommended profile IDs
      const recommendedIds = Array.from(followCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      // Get most popular profiles to fill the rest
      const { data: popular } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live')
        .not('username', 'is', null)
        .neq('id', userId)
        .not('id', 'in', `(${[...followingIds, ...recommendedIds].join(',')})`)
        .order('follower_count', { ascending: false })
        .limit(10);

      // Fetch profile details for recommended
      const { data: recommended } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live')
        .in('id', recommendedIds);

      // Combine: recommended first (sorted by follow count), then popular, prioritize live users
      const combined = [...(recommended || []), ...(popular || [])];

      // Sort: Live users first, then by follower count
      combined.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return b.follower_count - a.follower_count;
      });

      return combined.slice(0, 20);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback to popular profiles
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live')
        .not('username', 'is', null)
        .neq('id', userId)
        .order('follower_count', { ascending: false })
        .limit(20);

      return data || [];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Scroll to discover more profiles →</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={296}
        decelerationRate="fast"
      >
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            currentUserId={currentUserId}
            onPress={onProfilePress}
            onFollow={(profileId, isFollowing) => {
              // Update follower count in UI
              setProfiles((prev) =>
                prev.map((p) =>
                  p.id === profileId
                    ? { ...p, follower_count: p.follower_count + (isFollowing ? 1 : -1) }
                    : p
                )
              );
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      marginBottom: 24,
    },
    header: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    scrollContent: {
      paddingHorizontal: 8,
    },
    loadingContainer: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
