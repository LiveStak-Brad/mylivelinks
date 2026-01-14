import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Dimensions, Modal, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../state/AuthContext';
import ShareModal from '../../ShareModal';
import WatchGiftModal from '../../watch/WatchGiftModal';
import MusicVideoEditModal from '../MusicVideoEditModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;
const SAVED_VIDEOS_KEY = '@saved_music_videos';

interface MusicVideosTabProps {
  profileId: string;
  colors: any;
  isOwner?: boolean;
}

interface MusicVideo {
  id: string;
  media_url: string;
  youtube_id?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  views_count: number;
  created_at: string;
}

interface VideoComment {
  id: string;
  author_id: string;
  text_content: string;
  created_at: string;
  like_count: number;
  is_liked_by_me: boolean;
  author: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface ProfileInfo {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export default function MusicVideosTab({ profileId, colors, isOwner = false }: MusicVideosTabProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Profile info for gifting
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  
  // Modal states
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  
  // Saved videos
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  
  // Like state for video
  const [videoLiked, setVideoLiked] = useState(false);
  const [videoLikeCount, setVideoLikeCount] = useState(0);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
    loadProfileInfo();
    loadSavedVideos();
  }, [profileId]);

  // Load profile info for gifting
  const loadProfileInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', profileId)
        .single();
      
      if (!error && data) {
        setProfileInfo(data as ProfileInfo);
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error loading profile:', err);
    }
  };

  // Load saved videos from local storage
  const loadSavedVideos = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_VIDEOS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedVideoIds(new Set(parsed.map((v: any) => v.id)));
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error loading saved videos:', err);
    }
  };

  // Save video for offline viewing
  const handleSaveVideo = async () => {
    if (!selectedVideo) return;
    
    try {
      const saved = await AsyncStorage.getItem(SAVED_VIDEOS_KEY);
      let savedVideos = saved ? JSON.parse(saved) : [];
      
      const isAlreadySaved = savedVideos.some((v: any) => v.id === selectedVideo.id);
      
      if (isAlreadySaved) {
        // Remove from saved
        savedVideos = savedVideos.filter((v: any) => v.id !== selectedVideo.id);
        setSavedVideoIds(prev => {
          const next = new Set(prev);
          next.delete(selectedVideo.id);
          return next;
        });
        Alert.alert('Removed', 'Video removed from saved');
      } else {
        // Add to saved
        savedVideos.push({
          ...selectedVideo,
          savedAt: new Date().toISOString(),
          profileId,
          profileInfo,
        });
        setSavedVideoIds(prev => new Set(prev).add(selectedVideo.id));
        Alert.alert('Saved', 'Video saved for offline viewing');
      }
      
      await AsyncStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify(savedVideos));
    } catch (err) {
      console.error('[MusicVideosTab] Error saving video:', err);
      Alert.alert('Error', 'Failed to save video');
    }
  };

  // Load comments for selected video
  const loadComments = async (videoId: string) => {
    setCommentsLoading(true);
    try {
      // For now, we'll use a simple comments table structure
      // In production, you'd have a music_video_comments table
      const { data, error } = await supabase
        .from('music_video_comments')
        .select(`
          id,
          author_id,
          text_content,
          created_at,
          like_count,
          profiles!music_video_comments_author_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const formattedComments: VideoComment[] = data.map((c: any) => ({
          id: c.id,
          author_id: c.author_id,
          text_content: c.text_content,
          created_at: c.created_at,
          like_count: c.like_count || 0,
          is_liked_by_me: false, // TODO: Check if user liked
          author: c.profiles || { username: 'Unknown' },
        }));
        setComments(formattedComments);
      } else {
        // Table might not exist yet, show empty
        setComments([]);
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error loading comments:', err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Post a new comment
  const handlePostComment = async () => {
    if (!selectedVideo || !newComment.trim() || !user?.id || postingComment) return;
    
    setPostingComment(true);
    try {
      const { data, error } = await supabase
        .from('music_video_comments')
        .insert({
          video_id: selectedVideo.id,
          author_id: user.id,
          text_content: newComment.trim(),
        })
        .select(`
          id,
          author_id,
          text_content,
          created_at,
          like_count,
          profiles!music_video_comments_author_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('[MusicVideosTab] Error posting comment:', error);
        Alert.alert('Error', 'Failed to post comment. Comments may not be enabled yet.');
        return;
      }
      
      if (data) {
        const newCommentObj: VideoComment = {
          id: data.id,
          author_id: data.author_id,
          text_content: data.text_content,
          created_at: data.created_at,
          like_count: 0,
          is_liked_by_me: false,
          author: (data as any).profiles || { username: 'You' },
        };
        setComments(prev => [newCommentObj, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error posting comment:', err);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  // Like/unlike a comment
  const handleLikeComment = async (commentId: string) => {
    if (!user?.id) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    const wasLiked = comment.is_liked_by_me;
    
    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          is_liked_by_me: !wasLiked,
          like_count: wasLiked ? c.like_count - 1 : c.like_count + 1,
        };
      }
      return c;
    }));

    try {
      if (wasLiked) {
        // Unlike - delete the like
        await supabase
          .from('music_video_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Like - insert
        await supabase
          .from('music_video_comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
      }
    } catch (err) {
      // Revert on error
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            is_liked_by_me: wasLiked,
            like_count: wasLiked ? c.like_count + 1 : c.like_count - 1,
          };
        }
        return c;
      }));
      console.error('[MusicVideosTab] Error liking comment:', err);
    }
  };

  // Handle video like
  const handleLikeVideo = async () => {
    if (!user?.id || !selectedVideo) return;
    
    // Optimistic update
    const wasLiked = videoLiked;
    setVideoLiked(!wasLiked);
    setVideoLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      const { data, error } = await supabase.rpc('toggle_music_video_like', {
        p_video_id: selectedVideo.id,
      });
      
      if (error) {
        // Revert on error
        setVideoLiked(wasLiked);
        setVideoLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
        console.error('[MusicVideosTab] Error toggling like:', error);
      }
    } catch (err) {
      // Revert on error
      setVideoLiked(wasLiked);
      setVideoLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('[MusicVideosTab] Error toggling like:', err);
    }
  };

  // Load video like status when video is selected
  const loadVideoLikeStatus = async (videoId: string) => {
    if (!user?.id) return;
    
    try {
      const { data: isLiked } = await supabase.rpc('check_music_video_liked', {
        p_video_id: videoId,
      });
      setVideoLiked(isLiked || false);
      
      // Also get like count from the video
      const { data: videoData } = await supabase
        .from('profile_music_videos')
        .select('like_count')
        .eq('id', videoId)
        .single();
      
      if (videoData) {
        setVideoLikeCount(videoData.like_count || 0);
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error loading like status:', err);
    }
  };

  // Track video view
  const trackVideoView = async (videoId: string) => {
    try {
      const { error } = await supabase.rpc('rpc_track_content_view', {
        p_content_type: 'music_video',
        p_content_id: videoId,
        p_view_source: 'mobile',
        p_view_type: 'playback',
      });
      if (error) {
        console.error('[MusicVideosTab] Error tracking view:', error);
      }
    } catch (err) {
      console.error('[MusicVideosTab] Error tracking view:', err);
    }
  };

  // Format view count
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const loadVideos = async () => {
    try {
      // Load from profile_music_videos table (music videos specifically)
      const { data, error } = await supabase
        .from('profile_music_videos')
        .select(`
          id,
          video_url,
          youtube_id,
          title,
          thumbnail_url,
          views_count,
          created_at
        `)
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Map to our interface
      const formattedVideos: MusicVideo[] = (data || []).map((item: any) => ({
        id: item.id,
        media_url: item.video_url,
        youtube_id: item.youtube_id,
        title: item.title,
        description: item.description || '',
        thumbnail_url: item.thumbnail_url,
        views_count: item.views_count || 0,
        created_at: item.created_at,
      }));
      
      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading music videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video: MusicVideo) => {
    setSelectedVideo(video);
    setIsPlaying(false);
    setVideoLiked(false);
    setVideoLikeCount(0);
    setComments([]);
    setModalVisible(true);
    loadComments(video.id);
    loadVideoLikeStatus(video.id);
    trackVideoView(video.id);
  };

  const handleCloseModal = () => {
    setIsPlaying(false);
    setModalVisible(false);
    setSelectedVideo(null);
    setComments([]);
    setNewComment('');
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (video: MusicVideo): string | null => {
    const videoId = video.youtube_id || getYouTubeId(video.media_url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const renderVideo = ({ item }: { item: MusicVideo }) => {
    const thumbnailUrl = getYouTubeThumbnail(item);
    
    return (
      <Pressable style={styles.videoItem} onPress={() => handleVideoPress(item)}>
        <View style={styles.videoThumbnail}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.surface }]}>
              <Feather name="music" size={24} color={colors.mutedText} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={20} color="#fff" />
            </View>
          </View>
          {/* Music emblem */}
          <View style={[styles.musicBadge, { backgroundColor: colors.primary }]}>
            <Feather name="music" size={10} color="#fff" />
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <>
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Feather name="music" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No music videos yet
          </Text>
          {isOwner && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setEditingVideo(null);
                setEditModalVisible(true);
              }}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add Video</Text>
            </Pressable>
          )}
        </View>
        
        <MusicVideoEditModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSave={loadVideos}
          profileId={profileId}
          editingVideo={null}
          colors={colors}
        />
      </>
    );
  }

  // Group videos into rows of NUM_COLUMNS
  const rows: MusicVideo[][] = [];
  for (let i = 0; i < videos.length; i += NUM_COLUMNS) {
    rows.push(videos.slice(i, i + NUM_COLUMNS));
  }

  return (
    <>
      {/* Owner Add Button */}
      {isOwner && (
        <View style={styles.ownerHeader}>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setEditingVideo(null);
              setEditModalVisible(true);
            }}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Video</Text>
          </Pressable>
        </View>
      )}
      
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id}>{renderVideo({ item })}</View>
            ))}
          </View>
        ))}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
        transparent={false}
      >
        <View style={[styles.modalContainer, { backgroundColor: '#0f0f0f', paddingTop: insets.top }]}>
          {/* Video Player - Fixed at top */}
          {selectedVideo && (
            <View style={styles.videoPlayerContainer}>
              {(() => {
                const videoId = selectedVideo.youtube_id || getYouTubeId(selectedVideo.media_url);
                if (videoId) {
                  return (
                    <View style={styles.playerWrapper}>
                      {!isPlaying && (
                        <Pressable 
                          style={styles.thumbnailOverlay}
                          onPress={() => setIsPlaying(true)}
                        >
                          <Image
                            source={{ uri: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` }}
                            style={styles.modalThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.youtubePlayOverlay}>
                            <View style={[styles.youtubePlayButton, { backgroundColor: '#FF0000' }]}>
                              <Feather name="play" size={32} color="#fff" />
                            </View>
                          </View>
                        </Pressable>
                      )}
                      <View style={[styles.playerContainer, { opacity: isPlaying ? 1 : 0 }]}>
                        <YoutubePlayer
                          height={Math.round(SCREEN_WIDTH * 9 / 16)}
                          width={SCREEN_WIDTH}
                          play={isPlaying}
                          videoId={videoId}
                          onChangeState={onStateChange}
                          initialPlayerParams={{
                            preventFullScreen: false,
                            modestbranding: true,
                          }}
                          webViewProps={{
                            androidLayerType: 'hardware',
                          }}
                        />
                      </View>
                    </View>
                  );
                }
                return (
                  <View style={styles.noVideoContainer}>
                    <Feather name="video-off" size={48} color="#666" />
                    <Text style={styles.noVideoText}>Video not available</Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Scrollable Content Below Video */}
          <ScrollView 
            style={styles.ytScrollView}
            contentContainerStyle={styles.ytScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Close Button Row */}
            <View style={styles.ytCloseRow}>
              <Pressable onPress={handleCloseModal} style={styles.ytCloseButton}>
                <Feather name="chevron-down" size={24} color="#fff" />
              </Pressable>
              <View style={{ flex: 1 }} />
              {isOwner && selectedVideo && (
                <Pressable 
                  style={styles.ytEditButton}
                  onPress={() => {
                    handleCloseModal();
                    setEditingVideo({
                      id: selectedVideo.id,
                      title: selectedVideo.title || '',
                      description: selectedVideo.description || '',
                      video_type: selectedVideo.youtube_id ? 'youtube' : 'upload',
                      video_url: selectedVideo.media_url,
                      youtube_id: selectedVideo.youtube_id,
                      thumbnail_url: selectedVideo.thumbnail_url,
                    });
                    setEditModalVisible(true);
                  }}
                >
                  <Feather name="edit-2" size={18} color="#fff" />
                  <Text style={styles.ytEditButtonText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {/* Video Title & Info */}
            <View style={styles.ytVideoInfo}>
              <Text style={styles.ytVideoTitle} numberOfLines={2}>
                {selectedVideo?.title || 'Music Video'}
              </Text>
              <View style={styles.ytVideoMeta}>
                <Feather name="eye" size={14} color="#aaa" />
                <Text style={styles.ytVideoMetaText}>
                  {formatViewCount(selectedVideo?.views_count || 0)} views
                </Text>
                <Text style={styles.ytVideoDot}>•</Text>
                <Text style={styles.ytVideoMetaText}>
                  {selectedVideo?.created_at ? new Date(selectedVideo.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
              {selectedVideo?.description && (
                <Text style={styles.ytVideoDescription} numberOfLines={3}>
                  {selectedVideo.description}
                </Text>
              )}
            </View>

            {/* Action Buttons Row */}
            <View style={styles.ytActionsRow}>
              <Pressable style={styles.ytActionButton} onPress={handleLikeVideo}>
                <Feather 
                  name="thumbs-up" 
                  size={20} 
                  color={videoLiked ? '#3B82F6' : '#fff'} 
                />
                <Text style={[styles.ytActionText, videoLiked && { color: '#3B82F6' }]}>
                  {videoLikeCount > 0 ? videoLikeCount : 'Like'}
                </Text>
              </Pressable>
              <Pressable 
                style={styles.ytActionButton} 
                onPress={() => setGiftModalVisible(true)}
              >
                <Ionicons name="gift" size={20} color="#EC4899" />
                <Text style={[styles.ytActionText, { color: '#EC4899' }]}>Gift</Text>
              </Pressable>
              <Pressable 
                style={styles.ytActionButton} 
                onPress={() => setShareModalVisible(true)}
              >
                <Feather name="share" size={20} color="#fff" />
                <Text style={styles.ytActionText}>Share</Text>
              </Pressable>
              <Pressable 
                style={styles.ytActionButton} 
                onPress={handleSaveVideo}
              >
                <Feather 
                  name={selectedVideo && savedVideoIds.has(selectedVideo.id) ? 'check' : 'bookmark'} 
                  size={20} 
                  color={selectedVideo && savedVideoIds.has(selectedVideo.id) ? '#22C55E' : '#fff'} 
                />
                <Text style={[
                  styles.ytActionText, 
                  selectedVideo && savedVideoIds.has(selectedVideo.id) && { color: '#22C55E' }
                ]}>
                  {selectedVideo && savedVideoIds.has(selectedVideo.id) ? 'Saved' : 'Save'}
                </Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.ytDivider} />

            {/* Up Next Section */}
            {videos.length > 1 && (
              <View style={styles.ytUpNextSection}>
                <View style={styles.ytUpNextHeader}>
                  <Text style={styles.ytUpNextTitle}>Up next</Text>
                  <Text style={styles.ytUpNextCount}>{videos.length} videos</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.ytUpNextScroll}
                >
                  {videos
                    .filter(v => v.id !== selectedVideo?.id)
                    .map((video) => {
                      const thumbUrl = getYouTubeThumbnail(video);
                      return (
                        <Pressable 
                          key={video.id} 
                          style={styles.ytUpNextItem}
                          onPress={() => {
                            setIsPlaying(false);
                            setSelectedVideo(video);
                            setTimeout(() => setIsPlaying(true), 100);
                          }}
                        >
                          <View style={styles.ytUpNextThumbContainer}>
                            {thumbUrl ? (
                              <Image
                                source={{ uri: thumbUrl }}
                                style={styles.ytUpNextThumb}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.ytUpNextThumbPlaceholder}>
                                <Feather name="music" size={20} color="#666" />
                              </View>
                            )}
                            <View style={styles.ytUpNextPlayIcon}>
                              <Feather name="play" size={16} color="#fff" />
                            </View>
                          </View>
                          <Text style={styles.ytUpNextItemTitle} numberOfLines={2}>
                            {video.title || 'Untitled'}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              </View>
            )}

            {/* Divider */}
            <View style={styles.ytDivider} />

            {/* Comments Section */}
            <View style={styles.ytCommentsSection}>
              <View style={styles.ytCommentsHeader}>
                <Text style={styles.ytCommentsTitle}>Comments</Text>
                <Text style={styles.ytCommentsCount}>{comments.length}</Text>
              </View>
              
              {/* Comment Input */}
              {user ? (
                <View style={styles.ytCommentInputRow}>
                  <View style={styles.ytCommentAvatar}>
                    <Feather name="user" size={16} color="#666" />
                  </View>
                  <TextInput
                    style={styles.ytCommentTextInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#666"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                  />
                  {newComment.trim().length > 0 && (
                    <Pressable 
                      style={styles.ytCommentSendBtn}
                      onPress={handlePostComment}
                      disabled={postingComment}
                    >
                      {postingComment ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Feather name="send" size={18} color="#3B82F6" />
                      )}
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.ytCommentInput}>
                  <View style={styles.ytCommentAvatar}>
                    <Feather name="user" size={16} color="#666" />
                  </View>
                  <Text style={styles.ytCommentPlaceholder}>Sign in to comment</Text>
                </View>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <View style={styles.ytCommentsLoading}>
                  <ActivityIndicator size="small" color="#666" />
                </View>
              ) : comments.length > 0 ? (
                <View style={styles.ytCommentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.ytCommentItem}>
                      <View style={styles.ytCommentAvatarSmall}>
                        {comment.author.avatar_url ? (
                          <Image 
                            source={{ uri: comment.author.avatar_url }} 
                            style={styles.ytCommentAvatarImg}
                          />
                        ) : (
                          <Feather name="user" size={14} color="#666" />
                        )}
                      </View>
                      <View style={styles.ytCommentContent}>
                        <View style={styles.ytCommentHeader}>
                          <Text style={styles.ytCommentAuthor}>
                            {comment.author.display_name || comment.author.username}
                          </Text>
                          <Text style={styles.ytCommentTime}>
                            {formatTimeAgo(comment.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.ytCommentText}>{comment.text_content}</Text>
                        <View style={styles.ytCommentActions}>
                          <Pressable 
                            style={styles.ytCommentLikeBtn}
                            onPress={() => handleLikeComment(comment.id)}
                          >
                            <Feather 
                              name="thumbs-up" 
                              size={14} 
                              color={comment.is_liked_by_me ? '#3B82F6' : '#666'} 
                            />
                            {comment.like_count > 0 && (
                              <Text style={[
                                styles.ytCommentLikeCount,
                                comment.is_liked_by_me && { color: '#3B82F6' }
                              ]}>
                                {comment.like_count}
                              </Text>
                            )}
                          </Pressable>
                          <Pressable style={styles.ytCommentReplyBtn}>
                            <Text style={styles.ytCommentReplyText}>Reply</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.ytEmptyComments}>
                  <Feather name="message-circle" size={32} color="#444" />
                  <Text style={styles.ytEmptyCommentsText}>No comments yet</Text>
                  <Text style={styles.ytEmptyCommentsSubtext}>Be the first to comment</Text>
                </View>
              )}
            </View>

            {/* Bottom Padding */}
            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>

          {/* Share Modal - Inside video player modal so it renders on top */}
          <ShareModal
            visible={shareModalVisible}
            onClose={() => setShareModalVisible(false)}
            shareUrl={selectedVideo ? `https://www.mylivelinks.com/music-video/${selectedVideo.id}` : ''}
            shareText={selectedVideo?.title || 'Check out this music video!'}
            shareThumbnail={selectedVideo ? getYouTubeThumbnail(selectedVideo) : null}
            shareContentType="video"
          />

          {/* Gift Modal - Inside video player modal so it renders on top */}
          {profileInfo && (
            <WatchGiftModal
              visible={giftModalVisible}
              onClose={() => setGiftModalVisible(false)}
              recipientId={profileId}
              recipientUsername={profileInfo.username}
              recipientDisplayName={profileInfo.display_name || profileInfo.username}
              recipientAvatarUrl={profileInfo.avatar_url || null}
              postId={null}
              isLive={false}
              liveStreamId={null}
            />
          )}
        </View>
      </Modal>

      {/* Edit Modal */}
      <MusicVideoEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={loadVideos}
        profileId={profileId}
        editingVideo={editingVideo}
        colors={colors}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    paddingBottom: 16,
    marginHorizontal: -14, // Counteract parent paddingHorizontal: 14
  },
  row: {
    flexDirection: 'row',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
    marginHorizontal: 0,
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
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
  },
  videoPlayerContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  youtubeNote: {
    fontSize: 12,
    textAlign: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  youtubeLink: {
    flex: 1,
    position: 'relative',
  },
  modalThumbnail: {
    width: '100%',
    height: '100%',
  },
  youtubePlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubePlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbnailOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 1,
  },
  noVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noVideoText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    color: '#888',
  },
  // YouTube-style modal styles
  ytScrollView: {
    flex: 1,
  },
  ytScrollContent: {
    paddingHorizontal: 16,
  },
  ytCloseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  ytCloseButton: {
    padding: 8,
    marginLeft: -8,
  },
  ytEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  ytEditButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  ytVideoInfo: {
    marginBottom: 16,
  },
  ytVideoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  ytVideoDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginTop: 8,
  },
  ytVideoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ytVideoMetaText: {
    fontSize: 13,
    color: '#aaa',
  },
  ytVideoDot: {
    fontSize: 13,
    color: '#666',
  },
  ytActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 8,
  },
  ytActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  ytActionText: {
    fontSize: 12,
    color: '#fff',
  },
  ytDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  ytUpNextSection: {
    marginBottom: 8,
  },
  ytUpNextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ytUpNextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ytUpNextCount: {
    fontSize: 13,
    color: '#aaa',
  },
  ytUpNextScroll: {
    gap: 12,
  },
  ytUpNextItem: {
    width: 160,
  },
  ytUpNextThumbContainer: {
    width: 160,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    position: 'relative',
    marginBottom: 8,
  },
  ytUpNextThumb: {
    width: '100%',
    height: '100%',
  },
  ytUpNextThumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  ytUpNextPlayIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytUpNextItemTitle: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  ytCommentsSection: {
    marginBottom: 16,
  },
  ytCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ytCommentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ytCommentsCount: {
    fontSize: 14,
    color: '#aaa',
  },
  ytCommentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
  },
  ytCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytCommentPlaceholder: {
    fontSize: 14,
    color: '#888',
  },
  ytEmptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  ytEmptyCommentsText: {
    fontSize: 15,
    color: '#888',
    marginTop: 12,
  },
  ytEmptyCommentsSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  // New comment input styles
  ytCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  ytCommentTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    maxHeight: 100,
  },
  ytCommentSendBtn: {
    padding: 8,
    marginTop: 4,
  },
  ytCommentsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  ytCommentsList: {
    gap: 16,
  },
  ytCommentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  ytCommentAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ytCommentAvatarImg: {
    width: '100%',
    height: '100%',
  },
  ytCommentContent: {
    flex: 1,
  },
  ytCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ytCommentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  ytCommentTime: {
    fontSize: 12,
    color: '#666',
  },
  ytCommentText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  ytCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  ytCommentLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ytCommentLikeCount: {
    fontSize: 12,
    color: '#666',
  },
  ytCommentReplyBtn: {
    paddingVertical: 4,
  },
  ytCommentReplyText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
