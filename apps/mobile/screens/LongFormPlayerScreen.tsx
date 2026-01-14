import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16;

type ContentType = 'music' | 'music_video' | 'podcast' | 'movie' | 'series' | 'vlog' | 'education' | 'comedy' | 'other';

type RouteParams = {
  contentId: string;
  contentType: ContentType;
  title?: string;
  creatorId?: string;
  creatorUsername?: string;
};

type ContentData = {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  duration: number;
  views: number;
  likes: number;
  saves: number;
  commentsCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export default function LongFormPlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const params = route.params as RouteParams;
  const { contentId, contentType, title: initialTitle } = params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentData | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchContent = useCallback(async () => {
    if (!contentId) {
      setError('No content ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // API endpoint: GET /api/content/:contentId
      // Will be implemented by web team
      // For now, show placeholder
      setContent(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleLike = useCallback(async () => {
    // API endpoint: POST /api/content/:contentId/like
    setIsLiked(!isLiked);
  }, [isLiked]);

  const handleSave = useCallback(async () => {
    // API endpoint: POST /api/content/:contentId/save
    setIsSaved(!isSaved);
  }, [isSaved]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleGift = useCallback(() => {
    setShowGiftModal(true);
  }, []);

  const handleComment = useCallback(() => {
    setShowComments(true);
  }, []);

  const getTypeLabel = (type: ContentType): string => {
    const labels: Record<ContentType, string> = {
      music: 'Music',
      music_video: 'Music Video',
      podcast: 'Podcast',
      movie: 'Movie',
      series: 'Series',
      vlog: 'Vlog',
      education: 'Education',
      comedy: 'Comedy',
      other: 'Video',
    };
    return labels[type] || 'Video';
  };

  const getTypeIcon = (type: ContentType): React.ComponentProps<typeof Ionicons>['name'] => {
    const icons: Record<ContentType, React.ComponentProps<typeof Ionicons>['name']> = {
      music: 'musical-note-outline',
      music_video: 'musical-notes-outline',
      podcast: 'mic-outline',
      movie: 'film-outline',
      series: 'albums-outline',
      vlog: 'videocam-outline',
      education: 'school-outline',
      comedy: 'happy-outline',
      other: 'play-circle-outline',
    };
    return icons[type] || 'play-circle-outline';
  };

  const isAudioOnly = contentType === 'music' || contentType === 'podcast';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Player Area */}
      <View style={[styles.playerArea, isAudioOnly && styles.audioPlayerArea, { backgroundColor: '#000' }]}>
        <SafeAreaView edges={['top']} style={styles.playerHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </Pressable>
          <View style={styles.playerHeaderCenter}>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={getTypeIcon(contentType)} size={12} color="#FFFFFF" />
              <Text style={styles.typeBadgeText}>{getTypeLabel(contentType)}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            onPress={() => {}}
            style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>

        {loading ? (
          <View style={styles.playerLoading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : error ? (
          <View style={styles.playerError}>
            <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.playerErrorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={fetchContent}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.playerPlaceholder}>
            <Ionicons 
              name={isAudioOnly ? 'musical-notes' : 'play-circle'} 
              size={64} 
              color="rgba(255,255,255,0.3)" 
            />
            <Text style={styles.playerPlaceholderText}>
              {isAudioOnly ? 'Audio Player' : 'Video Player'}
            </Text>
            <Text style={styles.playerPlaceholderSubtext}>
              Player will be wired when backend is ready
            </Text>
          </View>
        )}
      </View>

      {/* Content Info & Actions */}
      <ScrollView 
        style={styles.contentScroll} 
        contentContainerStyle={[styles.contentScrollInner, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Creator */}
        <View style={styles.titleSection}>
          <Text style={[styles.contentTitle, { color: colors.text }]} numberOfLines={2}>
            {content?.title || initialTitle || 'Loading...'}
          </Text>
          {content?.creator && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ProfileViewScreen', { 
                profileId: content.creator.id, 
                username: content.creator.username 
              })}
              style={({ pressed }) => [styles.creatorRow, pressed && styles.pressedSoft]}
            >
              <View style={[styles.creatorAvatar, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={16} color={colors.mutedText} />
              </View>
              <Text style={[styles.creatorName, { color: colors.text }]}>
                {content.creator.displayName || content.creator.username}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionsRow, { borderColor: colors.border }]}>
          <ActionButton
            icon={isLiked ? 'heart' : 'heart-outline'}
            label="Like"
            count={content?.likes}
            active={isLiked}
            onPress={handleLike}
            colors={colors}
          />
          <ActionButton
            icon="chatbubble-outline"
            label="Comment"
            count={content?.commentsCount}
            onPress={handleComment}
            colors={colors}
          />
          <ActionButton
            icon="gift-outline"
            label="Gift"
            onPress={handleGift}
            colors={colors}
            accent
          />
          <ActionButton
            icon={isSaved ? 'bookmark' : 'bookmark-outline'}
            label="Save"
            active={isSaved}
            onPress={handleSave}
            colors={colors}
          />
          <ActionButton
            icon="share-outline"
            label="Share"
            onPress={handleShare}
            colors={colors}
          />
        </View>

        {/* Description */}
        {content?.description && (
          <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.descriptionHeader}>
              <Text style={[styles.descriptionMeta, { color: colors.mutedText }]}>
                {content.views?.toLocaleString() || 0} views • {new Date(content.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              {content.description}
            </Text>
          </View>
        )}

        {/* Comments Section Placeholder */}
        <View style={[styles.commentsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={handleComment}
            style={({ pressed }) => [styles.commentsHeader, pressed && styles.pressedSoft]}
          >
            <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments</Text>
            <View style={styles.commentsCountRow}>
              <Text style={[styles.commentsCount, { color: colors.mutedText }]}>
                {content?.commentsCount || 0}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  count,
  active,
  accent,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count?: number;
  active?: boolean;
  accent?: boolean;
  onPress: () => void;
  colors: any;
}) {
  const iconColor = active ? '#EC4899' : accent ? '#EC4899' : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressedSoft]}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      {count !== undefined && count > 0 ? (
        <Text style={[styles.actionCount, { color: colors.mutedText }]}>{count}</Text>
      ) : (
        <Text style={[styles.actionLabel, { color: colors.mutedText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  playerArea: {
    width: '100%',
    height: VIDEO_HEIGHT + 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayerArea: {
    height: 200,
  },
  playerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  playerErrorText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playerPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  playerPlaceholderSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },

  contentScroll: { flex: 1 },
  contentScrollInner: { padding: 16, gap: 16 },

  titleSection: { gap: 10 },
  contentTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  actionCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  descriptionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  commentsSection: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  commentsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentsCount: {
    fontSize: 13,
    fontWeight: '600',
  },

  pressed: { opacity: 0.7 },
  pressedSoft: { opacity: 0.85 },
});
