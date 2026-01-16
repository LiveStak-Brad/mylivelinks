import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../state/AuthContext';
import { useNavigation } from '@react-navigation/native';
import VideoPlayerModal, { VideoItem } from '../../VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * GRID_SPACING) / NUM_COLUMNS;

interface MusicVideosTabProps {
  profileId: string;
  colors: any;
  isOwner?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface MusicVideo {
  id: string;
  media_url: string;
  youtube_id?: string;
  title?: string;
  thumbnail_url?: string;
  views_count: number;
  created_at: string;
}

interface ProfileInfo {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export default function MusicVideosTab({ profileId, colors, isOwner = false, cardStyle }: MusicVideosTabProps) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Player modal state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Profile info
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);

  useEffect(() => {
    loadVideos();
    loadProfileInfo();
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

  const handleVideoPress = (video: MusicVideo, index: number) => {
    setSelectedIndex(index);
    setPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setPlayerVisible(false);
  };
  
  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (video: MusicVideo): string | null => {
    const videoId = video.youtube_id || getYouTubeId(video.media_url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  // Convert MusicVideo[] to VideoItem[] for VideoPlayerModal
  const videoItems: VideoItem[] = videos.map(v => ({
    id: v.id,
    youtubeVideoId: v.youtube_id || getYouTubeId(v.media_url) || '',
    youtubeUrl: v.media_url,
    title: v.title || null,
    author: null,
    thumbnailUrl: v.thumbnail_url || null,
  }));

  const renderVideo = ({ item, index }: { item: MusicVideo; index: number }) => {
    const thumbnailUrl = getYouTubeThumbnail(item);
    
    return (
      <Pressable style={styles.videoItem} onPress={() => handleVideoPress(item, index)}>
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
        <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
          <Feather name="music" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No music videos yet
          </Text>
          {isOwner && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'music_video' })}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Creator Studio</Text>
            </Pressable>
          )}
        </View>
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
      <View style={[styles.outerContainer, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        {/* Owner Add Button - pill style inside container */}
        {isOwner && (
          <View style={styles.headerRow}>
            <Pressable
              style={[styles.creatorStudioPill, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'music_video' })}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.creatorStudioPillText}>Creator Studio</Text>
            </Pressable>
          </View>
        )}
        
        <View style={styles.gridContainer}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((item, itemIndex) => (
                <View key={item.id}>{renderVideo({ item, index: rowIndex * NUM_COLUMNS + itemIndex })}</View>
              ))}
            </View>
          ))}
        </View>
      </View>

      <VideoPlayerModal
        visible={playerVisible}
        onClose={handleClosePlayer}
        videos={videoItems}
        initialIndex={selectedIndex}
        playlistTitle="Music Videos"
        currentUserId={user?.id}
        username={profileInfo?.username}
      />
    </>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
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
  gridContainer: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
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
