import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import ModuleEmptyState from '../ModuleEmptyState';

interface VlogsTabProps {
  profileId: string;
  isOwnProfile?: boolean;
  onAddVlog?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface Vlog {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  created_at: string;
}

export default function VlogsTab({ profileId, isOwnProfile = false, onAddVlog, colors, cardStyle }: VlogsTabProps) {
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;

  useEffect(() => {
    loadVlogs();
  }, [profileId]);

  const loadVlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_vlogs')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVlogs(data || []);
    } catch (error) {
      console.error('Error loading vlogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVlog = ({ item }: { item: Vlog }) => (
    <View style={[styles.vlogCard, { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius }]}>
      <Pressable>
        <View style={styles.vlogThumbnail}>
          {item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]} />
          )}
          <View style={styles.playOverlay}>
            <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={28} color="#fff" />
            </View>
          </View>
          {item.duration_seconds && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(item.duration_seconds)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.vlogInfo}>
          <Text style={[styles.vlogTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={[styles.vlogDescription, { color: colors.mutedText }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (vlogs.length === 0) {
    if (!isOwnProfile) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: cardBg }]}>
          <Feather name="film" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No vlogs yet
          </Text>
        </View>
      );
    }
    
    return (
      <ModuleEmptyState
        icon="film"
        title="No Vlogs Yet"
        description="Short videos throughout your day to keep fans updated."
        ctaLabel="Creator Studio"
        onCtaPress={onAddVlog}
        colors={colors}
        cardStyle={cardStyle}
      />
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Owner Add Button - pill style */}
      {isOwnProfile && (
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.creatorStudioPill, { backgroundColor: colors.primary }]}
            onPress={onAddVlog}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.creatorStudioPillText}>Creator Studio</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.listContainer}>
        {vlogs.map((item) => (
          <View key={item.id}>{renderVlog({ item })}</View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    padding: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  creatorStudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creatorStudioPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  vlogCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  vlogThumbnail: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  vlogInfo: {
    marginTop: 8,
  },
  vlogTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  vlogDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
