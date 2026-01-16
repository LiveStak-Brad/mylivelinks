/**
 * VideoPlayerModal - Universal Long-Form Video Player (Mobile)
 * 
 * Extracted from PlaylistsTab. This is THE video player for all long-form content.
 * Used by: PlaylistsTab, MusicVideosTab, ReplayScreen, ReplayPlaylistsScreen,
 *          ComedyTab, EducationTab, MoviesTab, PodcastsTab, SeriesTab, UsernameTVTab
 * 
 * Features:
 * - YoutubePlayer with auto-skip to next video
 * - Like/dislike with database integration
 * - Comments with replies, sorting, like/dislike
 * - Share modal
 * - Add to playlist modal
 * - View count tracking
 * - Previous/Next navigation
 * - "Up Next" horizontal scroll
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { supabase } from '../lib/supabase';
import ShareModal from './ShareModal';
import AddToPlaylistModal from './playlist/AddToPlaylistModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Video item type - generic enough for all use cases
export interface VideoItem {
  id: string;
  youtubeVideoId: string;
  youtubeUrl?: string;
  title: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  ownerUsername?: string;
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
}

interface VideoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videos: VideoItem[];
  initialIndex?: number;
  playlistTitle?: string; // For playlists/series - shows in header
  currentUserId?: string | null;
  username?: string; // For share URL
}

export default function VideoPlayerModal({
  visible,
  onClose,
  videos,
  initialIndex = 0,
  playlistTitle,
  currentUserId,
  username,
}: VideoPlayerModalProps) {
  const insets = useSafeAreaInsets();
  
  // Player state
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Action button states
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  
  // Comments state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  
  // Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  
  // Track if we've already incremented view for this video session
  const viewIncrementedRef = useRef<string | null>(null);
  
  const currentVideo = videos[currentIndex] || null;
  const currentVideoId = currentVideo?.youtubeVideoId || null;
  
  // Reset state when modal opens or video changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsPlaying(false);
    }
  }, [visible, initialIndex]);
  
  // Reset like/dislike state when video changes
  useEffect(() => {
    if (currentVideoId) {
      setIsLiked(false);
      setIsDisliked(false);
      setLikeCount(0);
      setComments([]);
      setReplyingTo(null);
      setViewCount(0);
      viewIncrementedRef.current = null;
      
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
        if (data.viewCount) {
          setViewCount(data.viewCount);
        }
      } else {
        setViewCount(prev => prev - 1);
        viewIncrementedRef.current = null;
      }
    } catch (e) {
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
    
    // Check user's likes/dislikes for all comments
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
  
  // Reload comments when sort changes
  useEffect(() => {
    if (currentVideoId) {
      loadComments();
    }
  }, [commentSort]);
  
  const handleClosePlayer = () => {
    setIsPlaying(false);
    onClose();
  };
  
  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };
  
  const handleNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }
  };
  
  const onStateChange = useCallback((state: string) => {
    if (state === 'playing') {
      incrementViewCount();
    } else if (state === 'ended') {
      // Auto-play next video
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentIndex, videos.length]);
  
  // Handle like button
  const handleLike = async () => {
    if (!currentUserId || !currentVideoId) {
      Alert.alert('Sign In', 'Please sign in to like videos');
      return;
    }
    
    const wasLiked = isLiked;
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
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Failed to toggle like:', e);
    }
  };
  
  const handleDislike = () => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to dislike videos');
      return;
    }
    if (isLiked) setIsLiked(false);
    setIsDisliked(!isDisliked);
  };
  
  const handleShare = () => {
    if (!currentVideo) return;
    setShowShareModal(true);
  };
  
  const handleSave = () => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to save videos');
      return;
    }
    setShowAddToPlaylist(true);
  };
  
  // Comment helpers
  const findCommentOrReply = (commentId: string): any => {
    const topLevel = comments.find(c => c.id === commentId);
    if (topLevel) return topLevel;
    for (const c of comments) {
      const reply = c.replies?.find((r: any) => r.id === commentId);
      if (reply) return reply;
    }
    return null;
  };
  
  const updateCommentOrReply = (commentId: string, updates: any) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, ...updates };
      }
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
  
  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to like comments');
      return;
    }
    const comment = findCommentOrReply(commentId);
    if (!comment) return;
    
    const wasLiked = comment.isLiked;
    updateCommentOrReply(commentId, {
      isLiked: !wasLiked,
      isDisliked: false,
      like_count: wasLiked ? comment.like_count - 1 : comment.like_count + 1,
    });
    
    try {
      if (wasLiked) {
        await supabase.from('video_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      } else {
        await supabase.from('video_comment_dislikes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
        await supabase.from('video_comment_likes').upsert({ comment_id: commentId, user_id: currentUserId });
      }
    } catch (e) {
      updateCommentOrReply(commentId, {
        isLiked: wasLiked,
        like_count: comment.like_count,
      });
      console.error('Failed to toggle comment like:', e);
    }
  };
  
  const handleCommentDislike = async (commentId: string) => {
    if (!currentUserId) {
      Alert.alert('Sign In', 'Please sign in to dislike comments');
      return;
    }
    const comment = findCommentOrReply(commentId);
    if (!comment) return;
    
    const wasDisliked = comment.isDisliked;
    updateCommentOrReply(commentId, {
      isDisliked: !wasDisliked,
      isLiked: false,
      like_count: comment.isLiked ? comment.like_count - 1 : comment.like_count,
    });
    
    try {
      if (wasDisliked) {
        await supabase.from('video_comment_dislikes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      } else {
        await supabase.from('video_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
        await supabase.from('video_comment_dislikes').upsert({ comment_id: commentId, user_id: currentUserId });
      }
    } catch (e) {
      updateCommentOrReply(commentId, {
        isDisliked: wasDisliked,
        isLiked: comment.isLiked,
        like_count: comment.like_count,
      });
      console.error('Failed to toggle comment dislike:', e);
    }
  };
  
  const handleReply = (parentCommentId: string, authorUsername: string) => {
    setReplyingTo({ id: parentCommentId, username: authorUsername });
  };
  
  const handleSubmitComment = async () => {
    if (!currentUserId || !currentVideoId || !commentText.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from('video_comments').insert({
        video_id: currentVideoId,
        author_id: currentUserId,
        text_content: commentText.trim(),
        parent_comment_id: replyingTo?.id || null,
      });
      
      if (error) throw error;
      
      setCommentText('');
      setReplyingTo(null);
      await loadComments();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  if (!visible || !currentVideo) return null;
  
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClosePlayer}
        transparent={false}
      >
        <View style={[styles.playerModalContainer, { backgroundColor: '#0f0f0f', paddingTop: insets.top }]}>
          {/* Video Player */}
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

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.playerScrollView}
            contentContainerStyle={styles.playerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Control Bar */}
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
                disabled={currentIndex >= videos.length - 1}
                style={[styles.playerControlBtn, currentIndex >= videos.length - 1 && styles.playerControlBtnDisabled]}
              >
                <Ionicons name="play-skip-forward" size={20} color={currentIndex >= videos.length - 1 ? '#666' : '#fff'} />
              </Pressable>
            </View>

            {/* Video Title & Info */}
            <View style={styles.playerVideoInfo}>
              <Text style={styles.playerVideoTitleSmall} numberOfLines={1}>
                {currentVideo.title || 'Untitled Video'}
              </Text>
              <View style={styles.playerVideoMeta}>
                {currentVideo.author && (
                  <Text style={styles.playerVideoAuthorSmall}>{currentVideo.author}</Text>
                )}
                <Text style={styles.playerViewCount}>• {viewCount.toLocaleString()} views</Text>
              </View>
            </View>

            {/* Up Next Section */}
            <View style={styles.playerPlaylistVideos}>
              <View style={styles.playerUpNextHeader}>
                <Text style={styles.playerPlaylistHeader}>
                  {playlistTitle ? playlistTitle : 'Up Next'}
                </Text>
                <Text style={styles.playerUpNextCount}>
                  {currentIndex + 1}/{videos.length}
                </Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playerHorizontalScroll}
              >
                {videos.map((item, index) => (
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

            {/* Comments Section */}
            <View style={styles.playerCommentsSection}>
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
                      <View style={styles.playerCommentItem}>
                        <View style={styles.playerCommentAvatar}>
                          {comment.author?.avatar_url ? (
                            <Image source={{ uri: comment.author.avatar_url }} style={styles.playerCommentAvatarImg} />
                          ) : (
                            <Ionicons name="person-circle" size={28} color="#666" />
                          )}
                        </View>
                        <View style={styles.playerCommentContent}>
                          <Text style={styles.playerCommentAuthor}>
                            {comment.author?.display_name || comment.author?.username || 'Anonymous'}
                          </Text>
                          <Text style={styles.playerCommentText}>{comment.text_content}</Text>
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
                                <Text style={styles.playerReplyAuthor}>
                                  {reply.author?.display_name || reply.author?.username || 'Anonymous'}
                                </Text>
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
        shareUrl={`https://www.mylivelinks.com/replay/${username || 'video'}/${currentVideoId}`}
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
    </>
  );
}

const styles = StyleSheet.create({
  playerModalContainer: {
    flex: 1,
  },
  playerVideoContainer: {
    width: SCREEN_WIDTH,
    height: Math.round(SCREEN_WIDTH * 9 / 16),
    backgroundColor: '#000',
  },
  playerThumbnailOverlay: {
    width: '100%',
    height: '100%',
  },
  playerThumbnail: {
    width: '100%',
    height: '100%',
  },
  playerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playerPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerScrollView: {
    flex: 1,
  },
  playerScrollContent: {
    paddingBottom: 40,
  },
  playerControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  playerControlBtn: {
    padding: 8,
  },
  playerControlBtnWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  playerControlCount: {
    color: '#fff',
    fontSize: 12,
  },
  playerControlBtnDisabled: {
    opacity: 0.4,
  },
  playerVideoInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerVideoTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  playerVideoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  playerVideoAuthorSmall: {
    fontSize: 13,
    color: '#aaa',
  },
  playerViewCount: {
    fontSize: 13,
    color: '#888',
  },
  playerPlaylistVideos: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  playerUpNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerPlaylistHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  playerUpNextCount: {
    fontSize: 13,
    color: '#888',
  },
  playerHorizontalScroll: {
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
  },
  playerNowPlayingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    padding: 4,
  },
  playerVideoTitleHorizontal: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
  },
  playerVideoTitleActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  playerCommentsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  playerCommentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerCommentsHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  playerCommentSortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playerCommentSortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  playerCommentSortBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  playerCommentSortText: {
    fontSize: 12,
    color: '#888',
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
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerReplyText: {
    fontSize: 12,
    color: '#8B5CF6',
  },
  playerCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  playerCommentInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 12,
  },
  playerCommentSendBtn: {
    padding: 8,
  },
  playerCommentsPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  playerCommentsPlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  playerCommentsList: {
    gap: 16,
  },
  playerCommentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  playerCommentAvatar: {},
  playerCommentAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  playerCommentContent: {
    flex: 1,
  },
  playerCommentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  playerCommentText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  playerCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  playerCommentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerCommentActionCount: {
    fontSize: 12,
    color: '#888',
  },
  playerCommentReplyBtn: {
    fontSize: 12,
    color: '#888',
  },
  playerRepliesContainer: {
    marginLeft: 40,
    marginTop: 12,
    gap: 12,
  },
  playerReplyItem: {
    flexDirection: 'row',
    gap: 10,
  },
  playerReplyAvatar: {},
  playerReplyAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  playerReplyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  playerReplyTextContent: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
});
