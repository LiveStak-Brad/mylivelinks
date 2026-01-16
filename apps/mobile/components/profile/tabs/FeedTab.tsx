import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../state/AuthContext';
import ModuleEmptyState from '../ModuleEmptyState';
import FeedComposerModal from '../../feed/FeedComposerModal';

function getMediaKindFromUrl(url: string): 'image' | 'video' {
  const clean = url.split('?')[0] ?? url;
  if (/\.(mp4|mov|m4v|webm|m3u8)$/i.test(clean)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(clean)) return 'image';
  return 'image';
}

interface FeedTabProps {
  profileId: string;
  profileUsername?: string;
  isOwnProfile?: boolean;
  onAddPost?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface Post {
  id: string;
  text_content?: string;
  media_url?: string;
  created_at: string;
  profiles: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

export default function FeedTab({ profileId, profileUsername, isOwnProfile = false, onAddPost, colors, cardStyle }: FeedTabProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposerModal, setShowComposerModal] = useState(false);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;

  // Check if current user can post (either own profile or viewer posting to someone's page)
  const canPost = Boolean(user);

  const loadPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          text_content,
          media_url,
          created_at,
          profiles!posts_author_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts((data as any) || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius }]}>
      <View style={styles.postHeader}>
        <Image
          source={{ uri: item.profiles?.avatar_url || undefined }}
          style={styles.avatar}
        />
        <View style={styles.postHeaderText}>
          <Text style={[styles.displayName, { color: colors.text }]}>
            {item.profiles?.display_name || item.profiles?.username}
          </Text>
          <Text style={[styles.timestamp, { color: colors.mutedText }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.text_content && (
        <Text style={[styles.content, { color: colors.text }]}>
          {item.text_content}
        </Text>
      )}

      {item.media_url && (
        getMediaKindFromUrl(item.media_url) === 'video' ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item.media_url }}
              style={styles.postVideo}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls={false}
              shouldPlay={false}
              isMuted
              posterSource={{ uri: item.media_url }}
            />
            <View style={styles.playOverlay}>
              <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
                <Feather name="play" size={24} color="#fff" />
              </View>
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: item.media_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )
      )}

      <View style={styles.postActions}>
        <Pressable style={styles.actionButton}>
          <Feather name="heart" size={20} color={colors.mutedText} />
          <Text style={[styles.actionText, { color: colors.mutedText }]}>
            {item._count?.likes || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Feather name="message-circle" size={20} color={colors.mutedText} />
          <Text style={[styles.actionText, { color: colors.mutedText }]}>
            {item._count?.comments || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Feather name="share" size={20} color={colors.mutedText} />
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    if (!isOwnProfile) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: cardBg }]}>
          <Feather name="file-text" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No posts yet
          </Text>
        </View>
      );
    }
    
    return (
      <ModuleEmptyState
        icon="file-text"
        title="No Posts Yet"
        description="Share updates, photos, and thoughts with your followers."
        ctaLabel="Add Post"
        onCtaPress={onAddPost}
        colors={colors}
        cardStyle={cardStyle}
      />
    );
  }

  return (
    <View style={styles.listContainer}>
      {/* Composer trigger - visible to any logged-in user */}
      {canPost && (
        <Pressable
          onPress={() => setShowComposerModal(true)}
          style={[styles.composerTrigger, { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius }]}
        >
          <View style={[styles.composerAvatar, { backgroundColor: colors.primary }]}>
            <Feather name="edit-2" size={16} color="#fff" />
          </View>
          <Text style={[styles.composerPlaceholder, { color: colors.mutedText }]}>
            {isOwnProfile ? "What's on your mind?" : `Write something to ${profileUsername || 'this user'}...`}
          </Text>
        </Pressable>
      )}

      {posts.map((item) => (
        <View key={item.id}>{renderPost({ item })}</View>
      ))}

      {/* Composer Modal */}
      <FeedComposerModal
        visible={showComposerModal}
        onClose={() => setShowComposerModal(false)}
        onPostCreated={() => {
          setShowComposerModal(false);
          loadPosts();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 16,
  },
  composerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: 14,
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
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  postHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#333',
  },
  videoContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  postVideo: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
});
