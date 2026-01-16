/**
 * PlaylistsTab - Curator Playlists Profile Tab (Mobile)
 * 
 * Displays playlists with horizontal scroll of videos (like SeriesTab).
 * Each playlist: Title + "+ Video" button → horizontal scroll of video cards
 * Owner can delete videos directly from the scroll view.
 * 
 * REAL DATA: Fetches from replay_playlists via get_user_playlists RPC
 */

import React, { useCallback, useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert,
  Dimensions,
  Image, 
  Modal,
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput,
  View 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { supabase } from '../../../lib/supabase';
import ShareModal from '../../ShareModal';
import AddToPlaylistModal from '../../playlist/AddToPlaylistModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_CARD_WIDTH = 180;

type PlaylistItem = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  position: number;
};

type PlaylistWithItems = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  category: string;
  subcategory: string | null;
  thumbnailUrl: string | null;
  items: PlaylistItem[];
};

interface PlaylistsTabProps {
  profileId: string;
  username: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Extract YouTube video ID from URL
function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

// Fetch YouTube video metadata using oEmbed API
async function fetchYoutubeMetadata(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title || null,
      author: data.author_name || null,
    };
  } catch {
    return null;
  }
}

function VideoCard({ 
  item, 
  colors, 
  cardRadius,
  isOwner,
  onDelete,
  deleting,
  onPress,
}: { 
  item: PlaylistItem; 
  colors: any;
  cardRadius: number;
  isOwner: boolean;
  onDelete: () => void;
  deleting: boolean;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const thumbnail = item.thumbnailUrl || getYoutubeThumbnail(item.youtubeVideoId);

  return (
    <View style={styles.videoCardContainer}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.videoCard,
          { borderColor: colors.border, borderRadius: cardRadius },
          pressed && styles.pressed,
        ]}
      >
        {/* Thumbnail */}
        <View style={[styles.videoThumbnail, { borderRadius: cardRadius - 2 }]}>
          {!imageError && thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbnailImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.thumbnailImage, styles.thumbnailPlaceholder]}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            </View>
          )}
          {/* Duration badge */}
          {item.durationSeconds && item.durationSeconds > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
            </View>
          )}
        </View>
        {/* Content */}
        <View style={styles.videoContent}>
          <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || 'Untitled Video'}
          </Text>
          {item.author && (
            <Text style={[styles.videoAuthor, { color: colors.mutedText }]} numberOfLines={1}>
              {item.author}
            </Text>
          )}
        </View>
      </Pressable>
      
      {/* Delete button for owner */}
      {isOwner && (
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.pressed,
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="trash" size={14} color="#FFFFFF" />
          )}
        </Pressable>
      )}
    </View>
  );
}

function PlaylistRow({ 
  playlist, 
  colors, 
  cardRadius,
  isOwner,
  onAddVideo,
  onDeleteVideo,
  onDeletePlaylist,
  onPlayVideo,
  buttonColor,
}: { 
  playlist: PlaylistWithItems; 
  colors: any;
  cardRadius: number;
  isOwner: boolean;
  onAddVideo: (playlistId: string, url: string) => Promise<void>;
  onDeleteVideo: (playlistId: string, itemId: string) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => void;
  onPlayVideo: (playlistId: string, itemIndex: number) => void;
  buttonColor: string;
}) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddVideo = async () => {
    const url = newUrl.trim();
    if (!url) return;
    
    setAdding(true);
    try {
      await onAddVideo(playlist.id, url);
      setNewUrl('');
      setShowAddInput(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to add video');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVideo = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await onDeleteVideo(playlist.id, itemId);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  const items = playlist.items || [];

  return (
    <View style={styles.playlistRow}>
      {/* Playlist Header */}
      <View style={styles.playlistHeader}>
        <View style={styles.playlistHeaderLeft}>
          <Ionicons name="list" size={20} color={colors.primary} />
          <Text style={[styles.playlistTitle, { color: colors.text }]} numberOfLines={1}>
            {playlist.title}
          </Text>
          {/* + Video button for owner - next to title */}
          {isOwner && !showAddInput && (
            <Pressable
              onPress={() => setShowAddInput(true)}
              style={({ pressed }) => [
                styles.addVideoBtn,
                { backgroundColor: buttonColor },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.addVideoBtnText}>+ Video</Text>
            </Pressable>
          )}
        </View>
        
        <View style={styles.playlistHeaderRight}>
          <Text style={[styles.playlistCount, { color: colors.mutedText }]}>
            {items.length} video{items.length !== 1 ? 's' : ''}
          </Text>
          
          {/* Delete playlist button */}
          {isOwner && (
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Delete Playlist',
                  'Are you sure you want to delete this playlist?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDeletePlaylist(playlist.id) },
                  ]
                );
              }}
              style={({ pressed }) => [
                styles.menuBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedText} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Add Video Input */}
      {isOwner && showAddInput && (
        <View style={styles.addInputRow}>
          <TextInput
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="Paste YouTube URL..."
            placeholderTextColor={colors.mutedText}
            style={[styles.addInput, { color: colors.text, borderColor: colors.border }]}
            editable={!adding}
            autoFocus
            onSubmitEditing={handleAddVideo}
          />
          <Pressable
            onPress={handleAddVideo}
            disabled={adding || !newUrl.trim()}
            style={({ pressed }) => [
              styles.addSubmitBtn,
              { backgroundColor: buttonColor, opacity: adding || !newUrl.trim() ? 0.5 : 1 },
              pressed && styles.pressed,
            ]}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addSubmitBtnText}>Add</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => { setShowAddInput(false); setNewUrl(''); }}
            disabled={adding}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.cancelBtnText, { color: colors.mutedText }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Horizontal Video Scroll */}
      {items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videoScrollContent}
        >
          {items.map((item, index) => (
            <VideoCard
              key={item.id}
              item={item}
              colors={colors}
              cardRadius={cardRadius}
              isOwner={isOwner}
              onDelete={() => handleDeleteVideo(item.id)}
              deleting={deletingId === item.id}
              onPress={() => onPlayVideo(playlist.id, index)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPlaylist}>
          <Text style={[styles.emptyPlaylistText, { color: colors.mutedText }]}>
            {isOwner ? 'Add YouTube videos to this playlist' : 'This playlist is empty'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function PlaylistsTab({ profileId, username, colors, isOwnProfile = false, cardStyle }: PlaylistsTabProps) {
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Player modal state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<PlaylistWithItems | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Action button states
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [viewCount, setViewCount] = useState(0);
  
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const buttonColor = '#8B5CF6';
  
  // Get current video ID for API calls
  const currentVideoId = activePlaylist?.items[currentIndex]?.youtubeVideoId || null;

  // Open player modal with playlist
  const handlePlayVideo = (playlistId: string, startIndex: number) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.items.length > 0) {
      setActivePlaylist(playlist);
      setCurrentIndex(startIndex);
      setIsPlaying(false);
      setPlayerVisible(true);
    }
  };
  
  const handleClosePlayer = () => {
    setIsPlaying(false);
    setPlayerVisible(false);
    setActivePlaylist(null);
  };
  
  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Keep playing - auto-play the previous video
      setIsPlaying(true);
    }
  };
  
  const handleNextVideo = () => {
    if (activePlaylist && currentIndex < activePlaylist.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Keep playing - auto-play the next video
      setIsPlaying(true);
    }
  };
  
  const onStateChange = useCallback((state: string) => {
    if (state === 'playing') {
      // Increment view count when video starts playing
      incrementViewCount();
    } else if (state === 'ended') {
      // Auto-play next video
      if (activePlaylist && currentIndex < activePlaylist.items.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  }, [activePlaylist, currentIndex, currentVideoId]);
  
  const currentVideo = activePlaylist?.items[currentIndex] || null;
  
  // Track if we've already incremented view for this video session
  const viewIncrementedRef = React.useRef<string | null>(null);
  
  // Reset like/dislike state when video changes
  useEffect(() => {
    if (currentVideoId) {
      setIsLiked(false);
      setIsDisliked(false);
      setLikeCount(0);
      setComments([]);
      setReplyingTo(null);
      setViewCount(0);
      viewIncrementedRef.current = null; // Reset view increment tracker
      
      // Load video like count
      supabase
        .from('video_likes')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', currentVideoId)
        .then(({ count }) => {
          if (count !== null) setLikeCount(count);
        });
      
      // Check if user has liked this video
      if (currentUserId) {
        supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', currentVideoId)
          .eq('user_id', currentUserId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setIsLiked(true);
          });
      }
      // Load comments and view count
      loadComments();
      loadViewCount();
    }
  }, [currentVideoId, currentUserId]);
  
  const loadViewCount = async () => {
    if (!currentVideoId) return;
    // Try replay_playlist_items first
    const { data: playlistItem } = await supabase
      .from('replay_playlist_items')
      .select('view_count')
      .eq('youtube_video_id', currentVideoId)
      .maybeSingle();
    if (playlistItem?.view_count !== undefined && playlistItem?.view_count !== null) {
      setViewCount(playlistItem.view_count);
      return;
    }
    // Fallback to profile_music_videos
    const { data: musicVideo } = await supabase
      .from('profile_music_videos')
      .select('view_count')
      .eq('youtube_id', currentVideoId)
      .maybeSingle();
    if (musicVideo?.view_count !== undefined && musicVideo?.view_count !== null) {
      setViewCount(musicVideo.view_count);
    }
  };
  
  const incrementViewCount = async () => {
    if (!currentVideoId) return;
    // Only increment once per video session
    if (viewIncrementedRef.current === currentVideoId) return;
    viewIncrementedRef.current = currentVideoId;
    
    // Optimistic update
    setViewCount(prev => prev + 1);
    
    try {
      // Call the API to increment view count
      const response = await fetch('https://www.mylivelinks.com/api/video/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentVideoId,
          type: 'playlist_item',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Use the actual view count from the server
        if (data.viewCount) {
          setViewCount(data.viewCount);
        }
      } else {
        // Revert on error
        setViewCount(prev => prev - 1);
        viewIncrementedRef.current = null;
      }
    } catch (e) {
      // Revert on error
      setViewCount(prev => prev - 1);
      viewIncrementedRef.current = null;
      console.error('Failed to increment view count:', e);
    }
  };
  
  const loadComments = async () => {
    if (!currentVideoId) return;
    const orderColumn = commentSort === 'top' ? 'like_count' : 'created_at';
    
    // Fetch top-level comments
    const { data: topLevelData } = await supabase
      .from('video_comments')
      .select(`
        id,
        text_content,
        created_at,
        like_count,
        dislike_count,
        parent_comment_id,
        author:profiles!author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('video_id', currentVideoId)
      .is('parent_comment_id', null)
      .order(orderColumn, { ascending: false })
      .limit(20);
    
    // Fetch replies for these comments
    const parentIds = (topLevelData || []).map((c: any) => c.id);
    let repliesData: any[] = [];
    if (parentIds.length > 0) {
      const { data: replies } = await supabase
        .from('video_comments')
        .select(`
          id,
          text_content,
          created_at,
          like_count,
          dislike_count,
          parent_comment_id,
          author:profiles!author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', currentVideoId)
        .in('parent_comment_id', parentIds)
        .order('created_at', { ascending: true });
      repliesData = replies || [];
    }
    
    // Group replies by parent
    const repliesByParent: Record<string, any[]> = {};
    repliesData.forEach((r: any) => {
      if (!repliesByParent[r.parent_comment_id]) {
        repliesByParent[r.parent_comment_id] = [];
      }
      repliesByParent[r.parent_comment_id].push({
        ...r,
        isLiked: false,
        isDisliked: false,
      });
    });
    
    // Transform and add user like status + replies
    const commentsWithReplies = (topLevelData || []).map((c: any) => ({
      ...c,
      isLiked: false,
      isDisliked: false,
      replies: repliesByParent[c.id] || [],
    }));
    
    // Check user's likes/dislikes for all comments (top-level + replies)
    const allCommentIds = [...parentIds, ...repliesData.map((r: any) => r.id)];
    if (currentUserId && allCommentIds.length > 0) {
      const [likesRes, dislikesRes] = await Promise.all([
        supabase.from('video_comment_likes').select('comment_id').eq('user_id', currentUserId).in('comment_id', allCommentIds),
        supabase.from('video_comment_dislikes').select('comment_id').eq('user_id', currentUserId).in('comment_id', allCommentIds),
      ]);
      const likedIds = new Set((likesRes.data || []).map((l: any) => l.comment_id));
      const dislikedIds = new Set((dislikesRes.data || []).map((d: any) => d.comment_id));
      
      commentsWithReplies.forEach((c: any) => {
        c.isLiked = likedIds.has(c.id);
        c.isDisliked = dislikedIds.has(c.id);
        c.replies.forEach((r: any) => {
          r.isLiked = likedIds.has(r.id);
          r.isDisliked = dislikedIds.has(r.id);
        });
      });
    }
    
    setComments(commentsWithReplies);
  };
  
  // Handle like button
  const handleLike = async () => {
    if (!currentUserId || !currentVideoId) {
      Alert.alert('Sign In', 'Please sign in to like videos');
      return;
    }
    
    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    if (isDisliked) setIsDisliked(false);
    
    try {
      if (wasLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', currentVideoId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('video_likes')
          .upsert({ video_id: currentVideoId, user_id: currentUserId });
      }
    } catch (e) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Failed to toggle like:', e);
    }
  };
  
  // Handle dislike button
  const handleDislike = () => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to dislike videos');
      return;
    }
    if (isLiked) setIsLiked(false);
    setIsDisliked(!isDisliked);
  };
  
  // Handle share button
  const handleShare = () => {
    if (!currentVideo) return;
    setShowShareModal(true);
  };
  
  // Handle save/add to playlist button
  const handleSave = () => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to save videos');
      return;
    }
    setShowAddToPlaylist(true);
  };
  
  // Helper to find comment or reply
  const findCommentOrReply = (commentId: string): any => {
    // Check top-level comments
    const topLevel = comments.find(c => c.id === commentId);
    if (topLevel) return topLevel;
    // Check replies
    for (const c of comments) {
      const reply = c.replies?.find((r: any) => r.id === commentId);
      if (reply) return reply;
    }
    return null;
  };
  
  // Helper to update comment or reply state
  const updateCommentOrReply = (commentId: string, updates: any) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, ...updates };
      }
      // Check if it's a reply
      if (c.replies?.some((r: any) => r.id === commentId)) {
        return {
          ...c,
          replies: c.replies.map((r: any) => 
            r.id === commentId ? { ...r, ...updates } : r
          )
        };
      }
      return c;
    }));
  };
  
  // Handle comment like
  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to like comments');
      return;
    }
    const comment = findCommentOrReply(commentId);
    if (!comment) return;
    
    const wasLiked = comment.isLiked;
    // Optimistic update
    updateCommentOrReply(commentId, {
      isLiked: !wasLiked,
      isDisliked: false,
      like_count: wasLiked ? comment.like_count - 1 : comment.like_count + 1
    });
    
    try {
      if (wasLiked) {
        await supabase.from('video_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      } else {
        await supabase.from('video_comment_likes').upsert({ comment_id: commentId, user_id: currentUserId });
        // Remove dislike if exists
        await supabase.from('video_comment_dislikes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      }
    } catch (e) {
      // Revert on error
      updateCommentOrReply(commentId, {
        isLiked: wasLiked,
        like_count: wasLiked ? comment.like_count + 1 : comment.like_count - 1
      });
    }
  };
  
  // Handle comment dislike
  const handleCommentDislike = async (commentId: string) => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to dislike comments');
      return;
    }
    const comment = findCommentOrReply(commentId);
    if (!comment) return;
    
    const wasDisliked = comment.isDisliked;
    // Optimistic update
    updateCommentOrReply(commentId, {
      isDisliked: !wasDisliked,
      isLiked: false,
      dislike_count: wasDisliked ? comment.dislike_count - 1 : comment.dislike_count + 1
    });
    
    try {
      if (wasDisliked) {
        await supabase.from('video_comment_dislikes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      } else {
        await supabase.from('video_comment_dislikes').upsert({ comment_id: commentId, user_id: currentUserId });
        // Remove like if exists
        await supabase.from('video_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      }
    } catch (e) {
      // Revert on error
      updateCommentOrReply(commentId, {
        isDisliked: wasDisliked,
        dislike_count: wasDisliked ? comment.dislike_count + 1 : comment.dislike_count - 1
      });
    }
  };
  
  // Handle reply to comment - parentId is the top-level comment ID for threading
  const handleReply = (parentId: string, username: string) => {
    setReplyingTo({ id: parentId, username });
    setCommentText(`@${username} `);
  };
  
  // Handle edit comment
  const handleEditComment = (commentId: string, currentText: string) => {
    Alert.prompt(
      'Edit Comment',
      'Update your comment:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newText) => {
            if (!newText?.trim() || newText.trim() === currentText) return;
            try {
              await supabase
                .from('video_comments')
                .update({ text_content: newText.trim() })
                .eq('id', commentId)
                .eq('author_id', currentUserId);
              // Update local state
              setComments(prev => prev.map(c => 
                c.id === commentId 
                  ? { ...c, text_content: newText.trim() }
                  : { ...c, replies: c.replies?.map((r: any) => r.id === commentId ? { ...r, text_content: newText.trim() } : r) }
              ));
            } catch (e) {
              Alert.alert('Error', 'Failed to update comment');
            }
          },
        },
      ],
      'plain-text',
      currentText
    );
  };
  
  // Handle delete comment
  const handleDeleteComment = (commentId: string, isReply: boolean = false) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('video_comments')
                .delete()
                .eq('id', commentId)
                .eq('author_id', currentUserId);
              // Update local state
              if (isReply) {
                setComments(prev => prev.map(c => ({
                  ...c,
                  replies: c.replies?.filter((r: any) => r.id !== commentId)
                })));
              } else {
                setComments(prev => prev.filter(c => c.id !== commentId));
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };
  
  // Show comment menu (edit/delete)
  const showCommentMenu = (commentId: string, authorId: string, currentText: string, isReply: boolean = false) => {
    if (authorId !== currentUserId) return;
    Alert.alert(
      'Comment Options',
      '',
      [
        { text: 'Edit', onPress: () => handleEditComment(commentId, currentText) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteComment(commentId, isReply) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  // Handle comment submit
  const handleSubmitComment = async () => {
    if (!currentUserId || !currentVideoId || !commentText.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: currentVideoId,
          author_id: currentUserId,
          text_content: commentText.trim(),
          parent_comment_id: replyingTo?.id || null,
        })
        .select(`
          id,
          text_content,
          created_at,
          author:profiles!author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setComments(prev => [{ ...data, isLiked: false, isDisliked: false, like_count: 0, dislike_count: 0 }, ...prev]);
        setCommentText('');
        setReplyingTo(null);
      }
    } catch (e) {
      console.error('Failed to post comment:', e);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Reload comments when sort changes
  useEffect(() => {
    if (currentVideoId) {
      loadComments();
    }
  }, [commentSort]);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First get basic playlists
      const { data: basicData, error: basicError } = await supabase.rpc('get_user_playlists', {
        p_profile_id: profileId,
      });
      
      if (basicError) throw basicError;
      
      if (!basicData || basicData.length === 0) {
        setPlaylists([]);
        return;
      }
      
      // Load items for each playlist
      const playlistsWithItems: PlaylistWithItems[] = [];
      for (const p of basicData) {
        const { data: itemsData } = await supabase.rpc('get_playlist_with_items', {
          p_playlist_id: p.id,
        });
        
        const items = (itemsData?.items || []).map((item: any) => ({
          id: item.id,
          youtubeUrl: item.youtube_url,
          youtubeVideoId: item.youtube_video_id,
          title: item.title,
          author: item.author,
          thumbnailUrl: item.thumbnail_url,
          durationSeconds: item.duration_seconds,
          position: item.position,
        }));
        
        playlistsWithItems.push({
          id: p.id,
          profileId: p.profile_id,
          title: p.title,
          description: p.description,
          visibility: p.visibility,
          category: p.category,
          subcategory: p.subcategory,
          thumbnailUrl: p.thumbnail_url,
          items,
        });
      }
      
      setPlaylists(playlistsWithItems);
    } catch (e: any) {
      console.error('[PlaylistsTab] Error:', e);
      setError(e?.message || 'Failed to load playlists');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleCreatePlaylist = async () => {
    const title = newPlaylistTitle.trim();
    if (!title) return;
    
    setCreating(true);
    try {
      const { error } = await supabase.rpc('create_playlist', {
        p_title: title,
        p_description: null,
        p_visibility: 'public',
        p_category: 'mixed',
        p_subcategory: null,
        p_thumbnail_url: null,
      });
      
      if (error) throw error;
      
      setNewPlaylistTitle('');
      setShowCreateModal(false);
      await fetchPlaylists();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase.rpc('delete_playlist', {
        p_playlist_id: playlistId,
      });
      if (error) throw error;
      await fetchPlaylists();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete playlist');
    }
  };

  const handleAddVideo = async (playlistId: string, youtubeUrl: string) => {
    // Extract video ID and fetch metadata
    const videoId = extractYoutubeVideoId(youtubeUrl);
    let title: string | null = null;
    let author: string | null = null;
    
    if (videoId) {
      const metadata = await fetchYoutubeMetadata(videoId);
      if (metadata) {
        title = metadata.title;
        author = metadata.author;
      }
    }
    
    const { error } = await supabase.rpc('add_playlist_item', {
      p_playlist_id: playlistId,
      p_youtube_url: youtubeUrl,
      p_title: title,
      p_author: author,
    });
    if (error) throw error;
    await fetchPlaylists();
  };

  const handleDeleteVideo = async (playlistId: string, itemId: string) => {
    const { error } = await supabase.rpc('remove_playlist_item', {
      p_item_id: itemId,
    });
    if (error) throw error;
    await fetchPlaylists();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={fetchPlaylists}
          style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="list-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Playlists Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Create a playlist to curate YouTube videos' : 'Playlists will appear here'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCreateModal(true)}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: buttonColor }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>+ Playlist</Text>
          </Pressable>
        )}
        
        {/* Create Modal */}
        <Modal visible={showCreateModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Playlist</Text>
              <TextInput
                value={newPlaylistTitle}
                onChangeText={setNewPlaylistTitle}
                placeholder="Playlist title..."
                placeholderTextColor={colors.mutedText}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => { setShowCreateModal(false); setNewPlaylistTitle(''); }}
                  style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                >
                  <Text style={[styles.modalCancelText, { color: colors.mutedText }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreatePlaylist}
                  disabled={creating || !newPlaylistTitle.trim()}
                  style={({ pressed }) => [
                    styles.modalCreateBtn, 
                    { backgroundColor: buttonColor, opacity: creating || !newPlaylistTitle.trim() ? 0.5 : 1 },
                    pressed && styles.pressed,
                  ]}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalCreateText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Header with + Playlist button */}
      {isOwnProfile && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="list" size={24} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Playlists</Text>
          </View>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={({ pressed }) => [styles.createBtn, { backgroundColor: buttonColor }, pressed && styles.pressed]}
          >
            <Text style={styles.createBtnText}>+ Playlist</Text>
          </Pressable>
        </View>
      )}

      {/* Playlist rows */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {playlists.map((playlist) => (
          <PlaylistRow
            key={playlist.id}
            playlist={playlist}
            colors={colors}
            cardRadius={cardRadius}
            isOwner={isOwnProfile}
            onAddVideo={handleAddVideo}
            onDeleteVideo={handleDeleteVideo}
            onDeletePlaylist={handleDeletePlaylist}
            onPlayVideo={handlePlayVideo}
            buttonColor={buttonColor}
          />
        ))}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Playlist</Text>
            <TextInput
              value={newPlaylistTitle}
              onChangeText={setNewPlaylistTitle}
              placeholder="Playlist title..."
              placeholderTextColor={colors.mutedText}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => { setShowCreateModal(false); setNewPlaylistTitle(''); }}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedText }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreatePlaylist}
                disabled={creating || !newPlaylistTitle.trim()}
                style={({ pressed }) => [
                  styles.modalCreateBtn, 
                  { backgroundColor: buttonColor, opacity: creating || !newPlaylistTitle.trim() ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* YouTube Player Modal */}
      <Modal
        visible={playerVisible}
        animationType="slide"
        onRequestClose={handleClosePlayer}
        transparent={false}
      >
        <View style={[styles.playerModalContainer, { backgroundColor: '#0f0f0f', paddingTop: insets.top }]}>
          {/* Video Player */}
          {currentVideo && (
            <View style={styles.playerVideoContainer}>
              {!isPlaying ? (
                <Pressable 
                  style={styles.playerThumbnailOverlay}
                  onPress={() => setIsPlaying(true)}
                >
                  <Image
                    source={{ uri: currentVideo.thumbnailUrl || `https://img.youtube.com/vi/${currentVideo.youtubeVideoId}/maxresdefault.jpg` }}
                    style={styles.playerThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.playerPlayOverlay}>
                    <View style={styles.playerPlayButton}>
                      <Ionicons name="play" size={32} color="#fff" />
                    </View>
                  </View>
                </Pressable>
              ) : (
                <YoutubePlayer
                  height={Math.round(SCREEN_WIDTH * 9 / 16)}
                  width={SCREEN_WIDTH}
                  play={isPlaying}
                  videoId={currentVideo.youtubeVideoId}
                  onChangeState={onStateChange}
                  initialPlayerParams={{
                    preventFullScreen: false,
                    modestbranding: true,
                  }}
                  webViewProps={{
                    androidLayerType: 'hardware',
                  }}
                />
              )}
            </View>
          )}

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.playerScrollView}
            contentContainerStyle={styles.playerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Control Bar - evenly spaced */}
            <View style={styles.playerControlBar}>
              <Pressable onPress={handleClosePlayer} style={styles.playerControlBtn}>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={handleLike} style={styles.playerControlBtnWithCount}>
                <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={20} color={isLiked ? "#8B5CF6" : "#fff"} />
                {likeCount > 0 && <Text style={styles.playerControlCount}>{likeCount}</Text>}
              </Pressable>
              <Pressable onPress={handleDislike} style={styles.playerControlBtn}>
                <Ionicons name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={20} color={isDisliked ? "#EF4444" : "#fff"} />
              </Pressable>
              <Pressable onPress={handleShare} style={styles.playerControlBtn}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={handleSave} style={styles.playerControlBtn}>
                <Ionicons name="add-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable 
                onPress={handlePrevVideo} 
                disabled={currentIndex === 0}
                style={[styles.playerControlBtn, currentIndex === 0 && styles.playerControlBtnDisabled]}
              >
                <Ionicons name="play-skip-back" size={20} color={currentIndex === 0 ? '#666' : '#fff'} />
              </Pressable>
              <Pressable 
                onPress={handleNextVideo}
                disabled={!activePlaylist || currentIndex >= activePlaylist.items.length - 1}
                style={[styles.playerControlBtn, (!activePlaylist || currentIndex >= activePlaylist.items.length - 1) && styles.playerControlBtnDisabled]}
              >
                <Ionicons name="play-skip-forward" size={20} color={(!activePlaylist || currentIndex >= activePlaylist.items.length - 1) ? '#666' : '#fff'} />
              </Pressable>
            </View>

            {/* Video Title & Info - compact */}
            <View style={styles.playerVideoInfo}>
              <Text style={styles.playerVideoTitleSmall} numberOfLines={1}>
                {currentVideo?.title || 'Untitled Video'}
              </Text>
              <View style={styles.playerVideoMeta}>
                {currentVideo?.author && (
                  <Text style={styles.playerVideoAuthorSmall}>{currentVideo.author}</Text>
                )}
                <Text style={styles.playerViewCount}>• {viewCount.toLocaleString()} views</Text>
              </View>
            </View>

            {/* Horizontal Playlist Videos Scroll */}
            <View style={styles.playerPlaylistVideos}>
              <View style={styles.playerUpNextHeader}>
                <Text style={styles.playerPlaylistHeader}>Up Next</Text>
                <Text style={styles.playerUpNextCount}>
                  {currentIndex + 1}/{activePlaylist?.items.length}
                </Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playerHorizontalScroll}
              >
                {activePlaylist?.items.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setCurrentIndex(index);
                      setIsPlaying(true);
                    }}
                    style={[
                      styles.playerVideoCardHorizontal,
                      index === currentIndex && styles.playerVideoCardActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl || `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg` }}
                      style={styles.playerVideoThumbHorizontal}
                    />
                    {index === currentIndex && (
                      <View style={styles.playerNowPlayingBadge}>
                        <Ionicons name="play" size={10} color="#fff" />
                      </View>
                    )}
                    <Text 
                      style={[styles.playerVideoTitleHorizontal, index === currentIndex && styles.playerVideoTitleActive]} 
                      numberOfLines={2}
                    >
                      {item.title || 'Untitled'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Comments Section with Input */}
            <View style={styles.playerCommentsSection}>
              {/* Header with sort toggle */}
              <View style={styles.playerCommentsHeaderRow}>
                <Text style={styles.playerCommentsHeader}>Comments ({comments.length})</Text>
                <View style={styles.playerCommentSortRow}>
                  <Pressable 
                    onPress={() => setCommentSort('top')}
                    style={[styles.playerCommentSortBtn, commentSort === 'top' && styles.playerCommentSortBtnActive]}
                  >
                    <Text style={[styles.playerCommentSortText, commentSort === 'top' && styles.playerCommentSortTextActive]}>Top</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setCommentSort('newest')}
                    style={[styles.playerCommentSortBtn, commentSort === 'newest' && styles.playerCommentSortBtnActive]}
                  >
                    <Text style={[styles.playerCommentSortText, commentSort === 'newest' && styles.playerCommentSortTextActive]}>Newest</Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Reply indicator */}
              {replyingTo && (
                <View style={styles.playerReplyIndicator}>
                  <Text style={styles.playerReplyText}>Replying to @{replyingTo.username}</Text>
                  <Pressable onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#888" />
                  </Pressable>
                </View>
              )}
              
              <View style={styles.playerCommentInputRow}>
                <TextInput
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                  placeholderTextColor="#666"
                  style={styles.playerCommentInput}
                  value={commentText}
                  onChangeText={setCommentText}
                  editable={!isSubmittingComment}
                  onSubmitEditing={handleSubmitComment}
                />
                <Pressable 
                  onPress={handleSubmitComment} 
                  disabled={!commentText.trim() || isSubmittingComment}
                  style={[styles.playerCommentSendBtn, (!commentText.trim() || isSubmittingComment) && { opacity: 0.5 }]}
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Ionicons name="send" size={18} color="#8B5CF6" />
                  )}
                </Pressable>
              </View>
              {comments.length === 0 ? (
                <View style={styles.playerCommentsPlaceholder}>
                  <Text style={styles.playerCommentsPlaceholderText}>No comments yet. Be the first!</Text>
                </View>
              ) : (
                <View style={styles.playerCommentsList}>
                  {comments.map((comment: any) => (
                    <View key={comment.id}>
                      {/* Parent comment */}
                      <View style={styles.playerCommentItem}>
                        <View style={styles.playerCommentAvatar}>
                          {comment.author?.avatar_url ? (
                            <Image source={{ uri: comment.author.avatar_url }} style={styles.playerCommentAvatarImg} />
                          ) : (
                            <Ionicons name="person-circle" size={28} color="#666" />
                          )}
                        </View>
                        <View style={styles.playerCommentContent}>
                          <View style={styles.playerCommentHeader}>
                            <Text style={styles.playerCommentAuthor}>
                              {comment.author?.display_name || comment.author?.username || 'Anonymous'}
                            </Text>
                            {comment.author?.id === currentUserId && (
                              <Pressable 
                                onPress={() => showCommentMenu(comment.id, comment.author?.id, comment.text_content, false)}
                                style={styles.playerCommentMenuBtn}
                              >
                                <Ionicons name="ellipsis-vertical" size={16} color="#888" />
                              </Pressable>
                            )}
                          </View>
                          <Text style={styles.playerCommentText}>{comment.text_content}</Text>
                          {/* Comment actions */}
                          <View style={styles.playerCommentActions}>
                            <Pressable onPress={() => handleCommentLike(comment.id)} style={styles.playerCommentActionBtn}>
                              <Ionicons name={comment.isLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={comment.isLiked ? "#8B5CF6" : "#888"} />
                              {comment.like_count > 0 && <Text style={styles.playerCommentActionCount}>{comment.like_count}</Text>}
                            </Pressable>
                            <Pressable onPress={() => handleCommentDislike(comment.id)} style={styles.playerCommentActionBtn}>
                              <Ionicons name={comment.isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={comment.isDisliked ? "#EF4444" : "#888"} />
                            </Pressable>
                            <Pressable onPress={() => handleReply(comment.id, comment.author?.username || 'user')} style={styles.playerCommentActionBtn}>
                              <Text style={styles.playerCommentReplyBtn}>Reply</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <View style={styles.playerRepliesContainer}>
                          {comment.replies.map((reply: any) => (
                            <View key={reply.id} style={styles.playerReplyItem}>
                              <View style={styles.playerReplyAvatar}>
                                {reply.author?.avatar_url ? (
                                  <Image source={{ uri: reply.author.avatar_url }} style={styles.playerReplyAvatarImg} />
                                ) : (
                                  <Ionicons name="person-circle" size={22} color="#666" />
                                )}
                              </View>
                              <View style={styles.playerCommentContent}>
                                <View style={styles.playerCommentHeader}>
                                  <Text style={styles.playerReplyAuthor}>
                                    {reply.author?.display_name || reply.author?.username || 'Anonymous'}
                                  </Text>
                                  {reply.author?.id === currentUserId && (
                                    <Pressable 
                                      onPress={() => showCommentMenu(reply.id, reply.author?.id, reply.text_content, true)}
                                      style={styles.playerCommentMenuBtn}
                                    >
                                      <Ionicons name="ellipsis-vertical" size={14} color="#888" />
                                    </Pressable>
                                  )}
                                </View>
                                <Text style={styles.playerReplyTextContent}>{reply.text_content}</Text>
                                <View style={styles.playerCommentActions}>
                                  <Pressable onPress={() => handleCommentLike(reply.id)} style={styles.playerCommentActionBtn}>
                                    <Ionicons name={reply.isLiked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={reply.isLiked ? "#8B5CF6" : "#888"} />
                                    {reply.like_count > 0 && <Text style={styles.playerCommentActionCount}>{reply.like_count}</Text>}
                                  </Pressable>
                                  <Pressable onPress={() => handleCommentDislike(reply.id)} style={styles.playerCommentActionBtn}>
                                    <Ionicons name={reply.isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={reply.isDisliked ? "#EF4444" : "#888"} />
                                  </Pressable>
                                  <Pressable onPress={() => handleReply(comment.id, reply.author?.username || 'user')} style={styles.playerCommentActionBtn}>
                                    <Text style={[styles.playerCommentReplyBtn, { fontSize: 11 }]}>Reply</Text>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`https://www.mylivelinks.com/replay/${username}/${currentVideoId}`}
        shareText={currentVideo?.title || 'Check out this video!'}
        shareThumbnail={currentVideo?.thumbnailUrl || (currentVideoId ? `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg` : null)}
        shareContentType="video"
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        youtubeUrl={currentVideo?.youtubeUrl || `https://www.youtube.com/watch?v=${currentVideoId}`}
        youtubeVideoId={currentVideoId || ''}
        videoTitle={currentVideo?.title || undefined}
        videoAuthor={currentVideo?.author || undefined}
        videoThumbnail={currentVideo?.thumbnailUrl || undefined}
        onSuccess={() => setShowAddToPlaylist(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: 200,
  },
  centered: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  playlistRow: {
    marginBottom: 20,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playlistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  playlistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  playlistCount: {
    fontSize: 13,
  },
  addVideoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  addVideoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  menuBtn: {
    padding: 4,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
  },
  videoScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  videoCardContainer: {
    position: 'relative',
    width: VIDEO_CARD_WIDTH,
  },
  videoCard: {
    width: VIDEO_CARD_WIDTH,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  videoContent: {
    padding: 8,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  videoAuthor: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 6,
  },
  emptyPlaylist: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyPlaylistText: {
    fontSize: 13,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalCreateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCreateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Player modal styles
  playerModalContainer: {
    flex: 1,
  },
  playerVideoContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  playerThumbnailOverlay: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playerThumbnail: {
    width: '100%',
    height: '100%',
  },
  playerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playerPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerScrollView: {
    flex: 1,
  },
  playerScrollContent: {
    paddingBottom: 40,
  },
  playerCloseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerCloseButton: {
    padding: 8,
  },
  playerNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playerNavBtn: {
    padding: 8,
  },
  playerNavBtnDisabled: {
    opacity: 0.5,
  },
  playerVideoInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  playerVideoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  playerVideoTitleSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerVideoAuthor: {
    color: '#aaa',
    fontSize: 14,
  },
  playerVideoAuthorSmall: {
    color: '#888',
    fontSize: 12,
  },
  playerPlaylistVideos: {
    paddingHorizontal: 16,
  },
  playerUpNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerPlaylistHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerUpNextCount: {
    color: '#888',
    fontSize: 12,
  },
  playerVideoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  playerVideoItemActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  playerVideoIndex: {
    color: '#666',
    fontSize: 14,
    width: 24,
    textAlign: 'center',
  },
  playerVideoIndexActive: {
    color: '#8B5CF6',
  },
  playerVideoThumb: {
    width: 80,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  playerVideoItemInfo: {
    flex: 1,
  },
  playerVideoItemTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  playerVideoItemTitleActive: {
    color: '#8B5CF6',
  },
  playerVideoItemAuthor: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  // Control bar - evenly spaced
  playerControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playerControlBtn: {
    padding: 8,
  },
  playerControlBtnWithCount: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerControlCount: {
    color: '#fff',
    fontSize: 12,
  },
  playerControlBtnDisabled: {
    opacity: 0.5,
  },
  playerHorizontalScroll: {
    paddingRight: 16,
    gap: 12,
  },
  playerVideoCardHorizontal: {
    width: 140,
  },
  playerVideoCardActive: {
    opacity: 1,
  },
  playerVideoThumbHorizontal: {
    width: 140,
    height: 79,
    borderRadius: 8,
    backgroundColor: '#333',
    marginBottom: 6,
  },
  playerNowPlayingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  playerVideoTitleHorizontal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  playerVideoTitleActive: {
    color: '#8B5CF6',
  },
  playerCommentsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  playerCommentsHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  playerCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  playerCommentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  playerCommentSendBtn: {
    padding: 8,
  },
  playerCommentsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  playerCommentsPlaceholderText: {
    color: '#666',
    fontSize: 13,
  },
  playerCommentsList: {
    gap: 12,
  },
  playerCommentItem: {
    flexDirection: 'row',
    gap: 10,
  },
  playerCommentAvatar: {
    width: 28,
    height: 28,
  },
  playerCommentAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  playerCommentContent: {
    flex: 1,
  },
  playerCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerCommentAuthor: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    flex: 1,
  },
  playerCommentMenuBtn: {
    padding: 4,
  },
  playerCommentText: {
    color: '#ccc',
    fontSize: 13,
  },
  // New styles for video meta, sorting, and comment actions
  playerVideoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerViewCount: {
    color: '#888',
    fontSize: 12,
  },
  playerCommentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerCommentSortRow: {
    flexDirection: 'row',
    gap: 4,
  },
  playerCommentSortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playerCommentSortBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  playerCommentSortText: {
    color: '#888',
    fontSize: 12,
  },
  playerCommentSortTextActive: {
    color: '#fff',
  },
  playerReplyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerReplyText: {
    color: '#8B5CF6',
    fontSize: 12,
  },
  playerCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  playerCommentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerCommentActionCount: {
    color: '#888',
    fontSize: 12,
  },
  playerCommentReplyBtn: {
    color: '#888',
    fontSize: 12,
  },
  // Nested replies styles
  playerRepliesContainer: {
    marginLeft: 38,
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
    paddingLeft: 12,
  },
  playerReplyItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  playerReplyAvatar: {
    width: 22,
    height: 22,
  },
  playerReplyAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  playerReplyAuthor: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerReplyTextContent: {
    color: '#ccc',
    fontSize: 12,
  },
});
