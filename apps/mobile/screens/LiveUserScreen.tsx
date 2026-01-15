import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import ReportModal from '../components/ReportModal';
import ShareModal from '../components/ShareModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Room, RoomEvent, RemoteTrack, Track, RemoteParticipant } from 'livekit-client';
import { VideoView } from '@livekit/react-native';

import { supabase } from '../lib/supabase';
import { fetchMobileToken, generateSoloRoomName } from '../lib/livekit';
import { sendViewerHeartbeat } from '../lib/liveInteractions';
import ChatOverlay, { ChatMessage, getGifterTierFromCoins } from '../components/live/ChatOverlay';
import WatchGiftModal from '../components/watch/WatchGiftModal';

const API_BASE_URL = 'https://www.mylivelinks.com';

type LiveUserRouteParams = {
  username?: string;
  streamId?: string;
  profileId?: string;
};

interface StreamerData {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  live_stream_id: number | null;
  viewer_count: number;
  is_live: boolean;
}

export default function LiveUserScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: LiveUserRouteParams }, 'params'>>();
  const { username, streamId, profileId } = route.params || {};

  // State
  const [chatInput, setChatInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Streamer data
  const [streamerData, setStreamerData] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LiveKit
  const [isConnected, setIsConnected] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<RemoteTrack | null>(null);
  const roomRef = useRef<Room | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string; avatar_url?: string } | null>(null);

  // Viewer actions
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);

  // Refs
  const mountedRef = useRef(true);
  const chatSubscriptionRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mountedRef.current) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        if (profile && mountedRef.current) {
          setCurrentUserProfile(profile);
        }
      }
    };
    loadCurrentUser();
  }, []);

  // Load streamer data
  const loadStreamerData = useCallback(async () => {
    if (!username && !profileId && !streamId) {
      setError('No stream identifier provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let targetUsername = username;

      // If we have streamId, fetch the stream details
      if (streamId && !targetUsername) {
        const { data: stream } = await supabase
          .from('live_streams')
          .select('profile_id, profiles!inner(username)')
          .eq('id', streamId)
          .single();

        if (stream?.profiles) {
          targetUsername = (stream.profiles as any).username;
        }
      }

      // If we have profileId, get username
      if (profileId && !targetUsername) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', profileId)
          .single();
        if (profile) {
          targetUsername = profile.username;
        }
      }

      if (!targetUsername) {
        throw new Error('Could not find streamer');
      }

      // Fetch full streamer profile and live stream info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_live')
        .eq('username', targetUsername)
        .single();

      if (profileError || !profile) {
        throw new Error('Streamer not found');
      }

      // Get active live stream
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('id, viewer_count')
        .eq('profile_id', profile.id)
        .eq('live_available', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mountedRef.current) return;

      setStreamerData({
        profile_id: profile.id,
        username: profile.username,
        display_name: profile.display_name || profile.username,
        avatar_url: profile.avatar_url,
        live_stream_id: liveStream?.id || null,
        viewer_count: liveStream?.viewer_count || 0,
        is_live: profile.is_live || !!liveStream,
      });

      setViewerCount(liveStream?.viewer_count || 0);

      // Check follow status
      if (currentUserId && profile.id !== currentUserId) {
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id)
          .maybeSingle();
        if (mountedRef.current) {
          setIsFollowing(!!follow);
        }
      }

      // Load like status and count
      if (liveStream?.id) {
        // Get likes count
        const { count: likeCount } = await supabase
          .from('stream_likes')
          .select('id', { count: 'exact', head: true })
          .eq('live_stream_id', liveStream.id);

        if (mountedRef.current) {
          setLikesCount(likeCount ?? 0);
        }

        // Check if current user has liked
        if (currentUserId) {
          const { data: existingLike } = await supabase
            .from('stream_likes')
            .select('id')
            .eq('live_stream_id', liveStream.id)
            .eq('profile_id', currentUserId)
            .maybeSingle();

          if (mountedRef.current) {
            setIsLiked(!!existingLike);
          }
        }
      }
    } catch (err: any) {
      console.error('[LiveUserScreen] Load error:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load stream');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [username, profileId, streamId, currentUserId]);

  useEffect(() => {
    loadStreamerData();
  }, [loadStreamerData]);

  // Connect to LiveKit as viewer
  useEffect(() => {
    if (!streamerData?.profile_id || !streamerData.is_live) return;

    const connectToRoom = async () => {
      try {
        const roomName = generateSoloRoomName(streamerData.profile_id);
        console.log('[LiveUserScreen] Connecting to room:', roomName);

        const { token, url } = await fetchMobileToken(
          roomName,
          currentUserId || `anon_${Date.now()}`,
          currentUserProfile?.username || 'Viewer',
          false // isHost = false (viewer mode)
        );

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Handle track subscriptions
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          console.log('[LiveUserScreen] Track subscribed:', track.kind, participant.identity);
          
          // Skip guest tracks
          if (participant.identity.startsWith('guest_')) return;

          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(track);
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTrack(track);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            setRemoteAudioTrack(null);
          }
        });

        room.on(RoomEvent.Connected, () => {
          console.log('[LiveUserScreen] Connected to room');
          if (mountedRef.current) {
            setIsConnected(true);
          }

          // Attach existing tracks
          room.remoteParticipants.forEach((participant) => {
            if (participant.identity.startsWith('guest_')) return;
            
            participant.trackPublications.forEach((pub) => {
              if (pub.track) {
                if (pub.kind === Track.Kind.Video) {
                  setRemoteVideoTrack(pub.track as RemoteTrack);
                } else if (pub.kind === Track.Kind.Audio) {
                  setRemoteAudioTrack(pub.track as RemoteTrack);
                }
              }
            });
          });
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('[LiveUserScreen] Disconnected from room');
          if (mountedRef.current) {
            setIsConnected(false);
            setRemoteVideoTrack(null);
            setRemoteAudioTrack(null);
          }
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log('[LiveUserScreen] Reconnecting...');
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log('[LiveUserScreen] Reconnected');
          if (mountedRef.current) {
            setIsConnected(true);
          }
        });

        await room.connect(url, token);
      } catch (err: any) {
        console.error('[LiveUserScreen] LiveKit connection error:', err);
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [streamerData?.profile_id, streamerData?.is_live, currentUserId, currentUserProfile?.username]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!streamerData?.live_stream_id) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          profile_id,
          message_type,
          content,
          created_at,
          profiles!inner(username, display_name, avatar_url, lifetime_coins_gifted)
        `)
        .eq('live_stream_id', streamerData.live_stream_id)
        .is('room_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && mountedRef.current) {
        const messages: ChatMessage[] = data.reverse().map((msg: any) => {
          const tierInfo = getGifterTierFromCoins(msg.profiles?.lifetime_coins_gifted || 0);
          return {
            id: String(msg.id),
            type: msg.message_type === 'gift' ? 'gift' : msg.message_type === 'follow' ? 'follow' : msg.message_type === 'system' ? 'system' : 'chat',
            username: msg.profiles?.username || 'User',
            text: msg.content || '',
            avatarUrl: msg.profiles?.avatar_url,
            gifterTierKey: tierInfo.tierKey,
            gifterLevelInTier: tierInfo.levelInTier,
            lifetimeCoins: msg.profiles?.lifetime_coins_gifted || 0,
          };
        });
        setChatMessages(messages);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${streamerData.live_stream_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `live_stream_id=eq.${streamerData.live_stream_id}`,
        },
        async (payload: any) => {
          if (payload.new.room_id !== null) return;

          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, lifetime_coins_gifted')
            .eq('id', payload.new.profile_id)
            .single();

          if (mountedRef.current && profile) {
            const tierInfo = getGifterTierFromCoins(profile.lifetime_coins_gifted || 0);
            const newMsg: ChatMessage = {
              id: String(payload.new.id),
              type: payload.new.message_type === 'gift' ? 'gift' : payload.new.message_type === 'follow' ? 'follow' : payload.new.message_type === 'system' ? 'system' : 'chat',
              username: profile.username || 'User',
              text: payload.new.content || '',
              avatarUrl: profile.avatar_url,
              gifterTierKey: tierInfo.tierKey,
              gifterLevelInTier: tierInfo.levelInTier,
              lifetimeCoins: profile.lifetime_coins_gifted || 0,
            };
            setChatMessages((prev) => [...prev.slice(-49), newMsg]);
          }
        }
      )
      .subscribe();

    chatSubscriptionRef.current = channel;

    return () => {
      if (chatSubscriptionRef.current) {
        supabase.removeChannel(chatSubscriptionRef.current);
        chatSubscriptionRef.current = null;
      }
    };
  }, [streamerData?.live_stream_id]);

  // Send chat message
  const handleSendMessage = useCallback(async () => {
    const message = chatInput.trim();
    if (!message || !currentUserId || !streamerData?.live_stream_id) return;

    setChatInput('');

    try {
      const { error } = await supabase.from('chat_messages').insert({
        live_stream_id: streamerData.live_stream_id,
        profile_id: currentUserId,
        message_type: 'chat',
        content: message,
      });

      if (error) {
        console.error('[LiveUserScreen] Send message error:', error);
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (err) {
      console.error('[LiveUserScreen] Send message error:', err);
    }
  }, [chatInput, currentUserId, streamerData?.live_stream_id]);

  // Follow/unfollow
  const handleFollow = useCallback(async () => {
    if (!currentUserId || !streamerData?.profile_id || followLoading) return;
    if (currentUserId === streamerData.profile_id) return;

    setFollowLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Error', 'Please log in to follow');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetProfileId: streamerData.profile_id }),
      });

      const data = await response.json();

      if (response.ok && data.success && mountedRef.current) {
        setIsFollowing(data.status !== 'none');
      }
    } catch (err) {
      console.error('[LiveUserScreen] Follow error:', err);
    } finally {
      if (mountedRef.current) {
        setFollowLoading(false);
      }
    }
  }, [currentUserId, streamerData?.profile_id, followLoading]);

  // Like stream (wired to real DB)
  const handleLike = useCallback(async () => {
    if (!currentUserId || !streamerData?.live_stream_id) {
      // Optimistic UI update for non-logged-in users (visual only)
      setIsLiked((prev) => !prev);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
      return;
    }

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((prev) => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        // Unlike
        await supabase
          .from('stream_likes')
          .delete()
          .eq('live_stream_id', streamerData.live_stream_id)
          .eq('profile_id', currentUserId);
      } else {
        // Like
        await supabase
          .from('stream_likes')
          .insert({
            live_stream_id: streamerData.live_stream_id,
            profile_id: currentUserId,
          });
      }
    } catch (err) {
      console.error('[LiveUserScreen] Like error:', err);
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount((prev) => wasLiked ? prev + 1 : prev - 1);
    }
  }, [isLiked, currentUserId, streamerData?.live_stream_id]);

  // Close/exit
  const handleClose = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    navigation.goBack();
  }, [navigation]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  // Viewer heartbeat - tracks presence in active_viewers
  useEffect(() => {
    if (!isConnected || !currentUserId || !streamerData?.live_stream_id) {
      // Stop heartbeat if not connected or missing data
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    const liveStreamId = streamerData.live_stream_id;
    const viewerId = currentUserId;

    // Send initial heartbeat
    sendViewerHeartbeat(liveStreamId, viewerId, true);

    // Start heartbeat interval (every 12 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        sendViewerHeartbeat(liveStreamId, viewerId, true);
      }
    }, 12000);

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - send inactive heartbeat
        sendViewerHeartbeat(liveStreamId, viewerId, false);
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - send active heartbeat
        sendViewerHeartbeat(liveStreamId, viewerId, true);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      subscription.remove();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Remove viewer from active_viewers on cleanup
      supabase
        .from('active_viewers')
        .delete()
        .eq('viewer_id', viewerId)
        .eq('live_stream_id', liveStreamId)
        .then(() => {
          console.log('[LiveUserScreen] Viewer presence removed');
        })
        .catch((err) => {
          console.error('[LiveUserScreen] Error removing viewer presence:', err);
        });
    };
  }, [isConnected, currentUserId, streamerData?.live_stream_id]);

  // Format viewer count
  const formatViewerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !streamerData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B9D" />
          <Text style={styles.errorText}>{error || 'Stream not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStreamerData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Video Area */}
      <View style={styles.videoContainer}>
        {remoteVideoTrack ? (
          <VideoView
            style={styles.videoView}
            videoTrack={remoteVideoTrack as any}
            objectFit="cover"
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            {isConnected ? (
              <>
                <ActivityIndicator size="large" color="#FF6B9D" />
                <Text style={styles.videoPlaceholderText}>Waiting for video...</Text>
              </>
            ) : (
              <>
                <Ionicons name="videocam" size={64} color="#666" />
                <Text style={styles.videoPlaceholderText}>
                  {streamerData.is_live ? 'Connecting...' : 'Stream Offline'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Top Overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.creatorInfo}>
            <View style={styles.creatorAvatar}>
              {streamerData.avatar_url ? (
                <Image source={{ uri: streamerData.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#fff" />
              )}
            </View>
            <View style={styles.creatorDetails}>
              <Text style={styles.creatorName}>@{streamerData.username}</Text>
              <Text style={styles.streamTitle}>{streamerData.display_name}</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <View style={styles.viewerCountBadge}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.viewerCountText}>{formatViewerCount(viewerCount)}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right-Side Vertical Actions Rail */}
        <View style={styles.rightRail}>
          <TouchableOpacity style={styles.railAction} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#FF4458" : "#fff"} />
            <Text style={styles.railActionText}>{formatViewerCount(likesCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction}>
            <Ionicons name="chatbubble-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>{chatMessages.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share-social-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction} onPress={() => setShowGiftModal(true)}>
            <Ionicons name="gift-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>Gift</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Area: Chat + Input Bar */}
      <View style={styles.bottomArea}>
        {/* Chat Messages */}
        <View style={styles.chatList}>
          <ChatOverlay messages={chatMessages} />
        </View>

        {/* Input Bar + Quick Actions */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              placeholderTextColor="#999"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setShowGiftModal(true)}>
              <Ionicons name="gift" size={18} color="#FF6B9D" />
              <Text style={styles.quickActionText}>Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton} onPress={handleLike}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color="#FF4458" />
              <Text style={styles.quickActionText}>{isLiked ? 'Liked' : 'Like'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, isFollowing && styles.quickActionButtonActive]} 
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <>
                  <Ionicons name={isFollowing ? "checkmark-circle" : "star"} size={18} color="#FFD700" />
                  <Text style={styles.quickActionText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="stream"
        reportedUserId={streamerData.profile_id}
        reportedUsername={streamerData.username}
        contextDetails={JSON.stringify({
          stream_username: streamerData.username,
          live_stream_id: streamerData.live_stream_id,
          source: 'mobile_live_viewer',
        })}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`https://www.mylivelinks.com/live/${streamerData.username}`}
        shareText={`Check out ${streamerData.display_name}'s live stream on MyLiveLinks!`}
        shareContentType="live"
      />

      {/* Gift Modal */}
      <WatchGiftModal
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipientId={streamerData.profile_id}
        recipientUsername={streamerData.username}
        recipientDisplayName={streamerData.display_name}
        recipientAvatarUrl={streamerData.avatar_url}
        isLive={true}
        liveStreamId={streamerData.live_stream_id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  streamTitle: {
    color: '#ddd',
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
  },
  rightRail: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 20,
  },
  railAction: {
    alignItems: 'center',
    gap: 4,
  },
  railActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomArea: {
    backgroundColor: '#1a1a1a',
    maxHeight: 280,
  },
  chatList: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chatUsername: {
    color: '#FF6B9D',
    fontSize: 13,
    fontWeight: '600',
  },
  chatText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  errorText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#999',
    fontSize: 14,
  },
  videoView: {
    flex: 1,
    backgroundColor: '#000',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
