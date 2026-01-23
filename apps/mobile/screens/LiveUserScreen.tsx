import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReportModal from '../components/ReportModal';
import ShareModal from '../components/ShareModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Room, RoomEvent, RemoteTrack, Track, RemoteParticipant } from 'livekit-client';
import { VideoView, AudioSession } from '@livekit/react-native';

import { supabase } from '../lib/supabase';
import { fetchMobileToken, generateSoloRoomName } from '../lib/livekit';
import { sendViewerHeartbeat } from '../lib/liveInteractions';
import ChatOverlay, { ChatMessage, getGifterTierFromCoins } from '../components/live/ChatOverlay';
import GiftOverlay, { GiftOverlayData } from '../components/live/GiftOverlay';
import WatchGiftModal from '../components/watch/WatchGiftModal';
import { playGiftSound } from '../lib/giftAudio';

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
  const insets = useSafeAreaInsets();

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
  const [videoReady, setVideoReady] = useState(false);
  const roomRef = useRef<Room | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string; avatar_url?: string } | null>(null);
  const [giftOverlays, setGiftOverlays] = useState<GiftOverlayData[]>([]);

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
  const seenGiftOverlayRef = useRef<Set<string>>(new Set());

  const addGiftOverlay = useCallback((gift: GiftOverlayData) => {
    setGiftOverlays((prev) => [...prev, gift]);
    if (gift.giftIconUrl) {
      void playGiftSound('https://www.mylivelinks.com/sfx/live_alert.wav');
    }
  }, []);

  const parseGiftNameFromChat = (text: string): string | null => {
    if (!text) return null;
    const sentIdx = text.indexOf(' sent "');
    if (sentIdx < 0) return null;
    const rest = text.slice(sentIdx + ' sent "'.length);
    const endIdx = rest.indexOf('" to ');
    if (endIdx < 0) return null;
    return rest.slice(0, endIdx).trim() || null;
  };

  // Configure audio session for media playback
  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

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

  // Keep viewer count in sync for solo live (active_viewers)
  useEffect(() => {
    if (!streamerData?.live_stream_id || !streamerData.is_live) return;

    let cancelled = false;
    const liveStreamId = streamerData.live_stream_id;

    const loadViewerCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/active-viewers?live_stream_id=${liveStreamId}`);
        if (!res.ok) {
          console.error('[LiveUserScreen] Viewer count fetch failed:', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && typeof data.viewer_count === 'number') {
          setViewerCount(data.viewer_count);
        }
      } catch (err) {
        console.error('[LiveUserScreen] Error loading viewer count:', err);
      }
    };

    loadViewerCount();

    const viewerChannel = supabase
      .channel(`active-viewers-viewer-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) {
            setViewerCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) {
            setViewerCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[LiveUserScreen] Viewer channel error:', status);
        }
      });

    const interval = setInterval(() => {
      if (!cancelled) loadViewerCount();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      viewerChannel.unsubscribe();
    };
  }, [streamerData?.live_stream_id, streamerData?.is_live]);

  // Connect to LiveKit as viewer
  useEffect(() => {
    if (!streamerData?.profile_id || !streamerData.is_live) {
      return;
    }

    // Prevent duplicate connections
    if (roomRef.current?.state === 'connected') {
      return;
    }

    let mounted = true;
    const connectToRoom = async () => {
      try {
        const roomName = generateSoloRoomName(streamerData.profile_id);

        const { token, url } = await fetchMobileToken(
          roomName,
          currentUserId || `anon_${Date.now()}`,
          currentUserProfile?.username || 'Viewer',
          false // isHost = false (viewer mode)
        );

        if (!mounted || !mountedRef.current) {
          return;
        }

        // Double-check we're not already connected
        if (roomRef.current?.state === 'connected') {
          return;
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          // Mobile-specific optimizations
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        });

        roomRef.current = room;

        // Handle track subscriptions
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          if (!mounted) return;
          
          // Skip guest tracks
          if (participant.identity.startsWith('guest_')) {
            return;
          }

          try {
            if (track.kind === Track.Kind.Video) {
              // Detach old video track before setting new one
              if (remoteVideoTrack) {
                setVideoReady(false);
                setRemoteVideoTrack(null);
              }
              // Set new track after a small delay
              setTimeout(() => {
                if (mounted) {
                  setRemoteVideoTrack(track);
                  setTimeout(() => {
                    if (mounted) {
                      setVideoReady(true);
                    }
                  }, 100);
                }
              }, 50);
            } else if (track.kind === Track.Kind.Audio) {
              // Detach old audio track before setting new one
              if (remoteAudioTrack) {
                setRemoteAudioTrack(null);
              }
              setTimeout(() => {
                if (mounted) {
                  setRemoteAudioTrack(track);
                }
              }, 50);
            }
          } catch (err) {
            console.error('[LiveUserScreen] Error handling track:', err);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (!mounted) return;
          try {
            if (track.kind === Track.Kind.Video) {
              setRemoteVideoTrack(null);
              setVideoReady(false);
            } else if (track.kind === Track.Kind.Audio) {
              setRemoteAudioTrack(null);
            }
          } catch (err) {
            console.error('[LiveUserScreen] Error unsubscribing track:', err);
          }
        });

        room.on(RoomEvent.Connected, () => {
          console.log('[LiveUserScreen] Connected to room');
          if (!mounted || !mountedRef.current) return;
          
          try {
            setIsConnected(true);

            // Attach existing tracks
            room.remoteParticipants.forEach((participant) => {
              if (participant.identity.startsWith('guest_')) {
                return;
              }
              
              participant.trackPublications.forEach((pub) => {
                if (pub.track && pub.isSubscribed) {
                  try {
                    if (pub.kind === Track.Kind.Video) {
                      setRemoteVideoTrack(pub.track as RemoteTrack);
                      setTimeout(() => {
                        if (mounted) {
                          setVideoReady(true);
                        }
                      }, 100);
                    } else if (pub.kind === Track.Kind.Audio) {
                      setRemoteAudioTrack(pub.track as RemoteTrack);
                    }
                  } catch (err) {
                    console.error('[LiveUserScreen] Error attaching existing track:', err);
                  }
                }
              });
            });
          } catch (err) {
            console.error('[LiveUserScreen] Error in Connected handler:', err);
          }
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          if (mountedRef.current) {
            setIsConnected(false);
            setRemoteVideoTrack(null);
            setRemoteAudioTrack(null);
            setVideoReady(false);
          }
        });

        room.on(RoomEvent.Reconnecting, () => {
          // Reconnecting
        });

        room.on(RoomEvent.Reconnected, () => {
          if (mountedRef.current) {
            setIsConnected(true);
          }
        });

        await room.connect(url, token);
      } catch (err: any) {
        console.error('[LiveUserScreen] LiveKit connection error:', err);
        if (mounted && mountedRef.current) {
          // Don't show error for intentional disconnects
          if (!err.message?.includes('Client initiated disconnect')) {
            setError('Failed to connect to stream. Please try again.');
          }
          setIsConnected(false);
        }
      }
    };

    connectToRoom();

    return () => {
      mounted = false;
      
      // DON'T disconnect here - let the final cleanup handle it
      // This cleanup runs on every dependency change
    };
  }, [streamerData?.profile_id]);

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
          profiles!inner(username, display_name, avatar_url, total_spent)
        `)
        .eq('live_stream_id', streamerData.live_stream_id)
        .is('room_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && mountedRef.current) {
        const messages: ChatMessage[] = data.reverse().map((msg: any) => {
          const tierInfo = getGifterTierFromCoins(msg.profiles?.total_spent || 0);
          return {
            id: String(msg.id),
            type: msg.message_type === 'gift' ? 'gift' : msg.message_type === 'follow' ? 'follow' : msg.message_type === 'system' ? 'system' : 'chat',
            username: msg.profiles?.username || 'User',
            text: msg.content || '',
            avatarUrl: msg.profiles?.avatar_url,
            gifterTierKey: tierInfo.tierKey,
            gifterLevelInTier: tierInfo.levelInTier,
            lifetimeCoins: msg.profiles?.total_spent || 0,
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
            .select('username, display_name, avatar_url, total_spent')
            .eq('id', payload.new.profile_id)
            .single();

          if (mountedRef.current && profile) {
            const tierInfo = getGifterTierFromCoins(profile.total_spent || 0);
            const newMsg: ChatMessage = {
              id: String(payload.new.id),
              type: payload.new.message_type === 'gift' ? 'gift' : payload.new.message_type === 'follow' ? 'follow' : payload.new.message_type === 'system' ? 'system' : 'chat',
              username: profile.username || 'User',
              text: payload.new.content || '',
              avatarUrl: profile.avatar_url,
              gifterTierKey: tierInfo.tierKey,
              gifterLevelInTier: tierInfo.levelInTier,
              lifetimeCoins: profile.total_spent || 0,
            };
            setChatMessages((prev) => [...prev.slice(-49), newMsg]);

            if (payload.new.message_type === 'gift') {
              const overlayKey = `chat-${payload.new.id}`;
              if (!seenGiftOverlayRef.current.has(overlayKey)) {
                seenGiftOverlayRef.current.add(overlayKey);
                const giftName = parseGiftNameFromChat(payload.new.content || '');
                if (giftName) {
                  const { data: giftType } = await supabase
                    .from('gift_types')
                    .select('name, icon_url')
                    .eq('name', giftName)
                    .maybeSingle();
                  addGiftOverlay({
                    id: overlayKey,
                    giftName: giftType?.name || giftName,
                    giftIconUrl: giftType?.icon_url || null,
                    senderUsername: profile.username || null,
                    coinAmount: null,
                  });
                } else {
                  addGiftOverlay({
                    id: overlayKey,
                    giftName: 'Gift',
                    giftIconUrl: null,
                    senderUsername: profile.username || null,
                    coinAmount: null,
                  });
                }
              }
            }
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

  // Fallback: derive overlay from gift chat messages already in state
  useEffect(() => {
    if (!chatMessages.length) return;
    chatMessages.forEach((msg) => {
      if (msg.type !== 'gift') return;
      const overlayKey = `chat-local-${msg.id}`;
      if (seenGiftOverlayRef.current.has(overlayKey)) return;
      seenGiftOverlayRef.current.add(overlayKey);

      const giftName = parseGiftNameFromChat(msg.text || '') || msg.text || 'Gift';
      void (async () => {
        const { data: giftType } = await supabase
          .from('gift_types')
          .select('name, icon_url')
          .eq('name', giftName)
          .maybeSingle();
        addGiftOverlay({
          id: overlayKey,
          giftName: giftType?.name || giftName,
          giftIconUrl: giftType?.icon_url || null,
          senderUsername: msg.username || null,
          coinAmount: null,
        });
      })();
    });
  }, [chatMessages, addGiftOverlay]);

  // Subscribe to gifts for overlay
  useEffect(() => {
    if (!streamerData?.profile_id) return;

    const recipientId = streamerData.profile_id;
    const channel = supabase
      .channel(`gifts:recipient:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `recipient_id=eq.${recipientId}`,
        },
        async (payload: any) => {
          const gift = payload.new as any;
          const overlayKey = `gift-${gift.id}`;
          if (seenGiftOverlayRef.current.has(overlayKey)) return;
          seenGiftOverlayRef.current.add(overlayKey);
          const [{ data: senderProfile }, { data: giftType }] = await Promise.all([
            supabase.from('profiles').select('username').eq('id', gift.sender_id).maybeSingle(),
            supabase.from('gift_types').select('name, icon_url').eq('id', gift.gift_type_id).maybeSingle(),
          ]);

          addGiftOverlay({
            id: overlayKey,
            giftName: giftType?.name || 'Gift',
            giftIconUrl: giftType?.icon_url || null,
            senderUsername: senderProfile?.username || null,
            coinAmount: gift.coin_amount ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addGiftOverlay, streamerData?.profile_id]);

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
      
      // Clear tracks first to prevent render after cleanup
      setRemoteVideoTrack(null);
      setRemoteAudioTrack(null);
      setVideoReady(false);
      setIsConnected(false);
      
      // Then cleanup room connection
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (err) {
          console.error('[LiveUserScreen] Error disconnecting on unmount:', err);
        }
        roomRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount/unmount

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
          // Viewer presence removed
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
      <View style={styles.fullScreenContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !streamerData) {
    return (
      <View style={styles.fullScreenContainer}>
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
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
      {/* Video Area - Full screen background */}
      <View style={styles.videoContainer}>
        {remoteVideoTrack && videoReady && remoteVideoTrack.kind === Track.Kind.Video ? (
          <VideoView
            style={styles.videoView}
            videoTrack={remoteVideoTrack as any}
            objectFit="cover"
            mirror={false}
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
      </View>

      {/* Gift Overlay */}
      <GiftOverlay
        gifts={giftOverlays}
        onComplete={(giftId) => {
          setGiftOverlays((prev) => prev.filter((gift) => gift.id !== giftId));
        }}
      />

      {/* Top Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Top Overlay */}
      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 12) }]}>
          {/* Left: Profile Info (no back button) */}
          <View style={styles.leftTopSection}>
            {/* Profile Info Container */}
            <View style={styles.profileInfoContainer}>
              {/* Main profile bubble with avatar, name, stats, star */}
              <View style={styles.profileBubble}>
                <TouchableOpacity style={styles.avatarButton}>
                  {streamerData.avatar_url ? (
                    <Image source={{ uri: streamerData.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.profileDetails}>
                  {/* Username row */}
                  <Text style={styles.usernameText}>{streamerData.display_name || streamerData.username}</Text>
                  
                  {/* Trending & Leaderboard row */}
                  <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statButton}>
                      <Ionicons name="flame" size={16} color="#FF6B35" />
                      <Text style={styles.statText}>1</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.statDivider}>•</Text>
                    
                    <TouchableOpacity style={styles.statButton}>
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={styles.statText}>1</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Follow Star Button */}
                {currentUserId && currentUserId !== streamerData.profile_id && (
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={followLoading}
                    style={styles.starButton}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color="#FFD700" />
                    ) : (
                      <Ionicons
                        name={isFollowing ? "star" : "star-outline"}
                        size={20}
                        color="#FFD700"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Rank badge below profile bubble */}
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>1st</Text>
                <Text style={styles.rankDivider}>•</Text>
                <Ionicons name="trophy" size={12} color="#FFE168" />
                <Text style={styles.rankDivider}>•</Text>
                <Text style={styles.rankPointsText}>+0</Text>
              </View>
            </View>
          </View>

          {/* Right: Actions vertical */}
          <View style={styles.rightTopSection}>
            {/* Top row: Viewer Count and X */}
            <View style={styles.topRightRow}>
              {/* Viewer Count */}
              <TouchableOpacity style={styles.viewerCountBadge}>
                <Ionicons name="eye" size={14} color="#fff" />
                <Text style={styles.viewerCountText}>{formatViewerCount(viewerCount)}</Text>
              </TouchableOpacity>

              {/* Close/X Button */}
              <TouchableOpacity
                style={styles.topIconButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Report Button */}
            <TouchableOpacity
              style={styles.topIconButton}
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.topIconButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

      {/* Bottom Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Bottom Area: Chat + Input Bar */}
      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Chat Messages */}
        <View style={styles.chatList}>
          <ChatOverlay messages={chatMessages} />
        </View>

        {/* Input Bar with icons matching screenshot */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            {/* Settings/Gear icon */}
            <TouchableOpacity style={styles.inputIconButton}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Chat Input */}
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#ccc"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />

            {/* Add Friend icon */}
            <TouchableOpacity style={styles.inputIconButton}>
              <Ionicons name="person-add-outline" size={24} color="#A855F7" />
            </TouchableOpacity>

            {/* Gift icon */}
            <TouchableOpacity
              style={styles.inputIconButton}
              onPress={() => setShowGiftModal(true)}
            >
              <Ionicons name="gift" size={24} color="#FF6B9D" />
            </TouchableOpacity>

            {/* Heart/Like icon */}
            <TouchableOpacity
              style={styles.inputIconButton}
              onPress={handleLike}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color="#FF4458"
              />
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    paddingHorizontal: 0,
    paddingBottom: 8,
    zIndex: 20,
  },
  leftTopSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingLeft: 12,
  },
  profileInfoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  profileBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flexDirection: 'column',
    gap: 2,
  },
  usernameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  starButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    marginLeft: 8,
    gap: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  rankDivider: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  rankPointsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rightTopSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
    paddingRight: 12,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 5,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 5,
  },
  bottomArea: {
    maxHeight: 200,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  chatList: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
