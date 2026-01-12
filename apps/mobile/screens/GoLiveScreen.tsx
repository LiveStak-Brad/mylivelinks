import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { VideoView } from '@livekit/react-native';
import { createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack, VideoPresets, Room, RoomEvent } from 'livekit-client';
import { useAuth } from '../state/AuthContext';
import { fetchMobileToken, generateSoloRoomName, startLiveStreamRecord, endLiveStreamRecord } from '../lib/livekit';
import { supabase } from '../lib/supabase';

import SoloHostOverlay from '../components/live/SoloHostOverlay';
import type { ChatMessage, ChatFontColor } from '../components/live/ChatOverlay';
import { getGifterTierFromCoins } from '../components/live/ChatOverlay';
import type { TopGifter } from '../components/live/TopGifterBubbles';
import { attachFiltersToLocalVideoTrack, setFilterParams as setNativeFilterParams } from '../lib/videoFilters';
import {
  DEFAULT_HOST_CAMERA_FILTERS,
  loadHostCameraFilters,
  saveHostCameraFilters,
  type HostCameraFilters,
} from '../lib/hostCameraFilters';

// Default font color for chat
const DEFAULT_CHAT_FONT_COLOR: ChatFontColor = '#FFFFFF';

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('irl');
  const [audience, setAudience] = useState<'Public' | 'Team'>('Public');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Permission states
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  // Preview/Live track state
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cameraFilters, setCameraFilters] = useState<HostCameraFilters>(DEFAULT_HOST_CAMERA_FILTERS);
  const didUserEditCameraFiltersRef = useRef(false);

  // Load persisted camera filter params (host camera filters)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const saved = await loadHostCameraFilters(user.id);
      if (cancelled) return;
      if (!didUserEditCameraFiltersRef.current) setCameraFilters(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Apply native filter params whenever JS cameraFilters changes (Phase 1: brightness/contrast/saturation)
  useEffect(() => {
    setNativeFilterParams({
      brightness: cameraFilters.brightness,
      contrast: cameraFilters.contrast,
      saturation: cameraFilters.saturation,
      softSkinLevel: cameraFilters.softSkinLevel,
    });
  }, [cameraFilters.brightness, cameraFilters.contrast, cameraFilters.saturation, cameraFilters.softSkinLevel]);

  // Live state
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const [liveStreamId, setLiveStreamId] = useState<number | null>(null);

  // Host profile (fetched from Supabase like web)
  const [hostProfile, setHostProfile] = useState<{
    displayName: string;
    avatarUrl?: string;
    isPro?: boolean;
  } | null>(null);

  // Top gifters (fetched from gifts table like web)
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);

  // Chat messages (fetched from chat_messages table like web)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Ranking data (mocked for now - will fetch from Supabase like web)
  const [trendingRank, setTrendingRank] = useState<number>(0);
  const [leaderboardRank, setLeaderboardRank] = useState<{ currentRank: number; pointsToNextRank: number } | null>(null);

  const categories = useMemo(
    () => [
      { id: 'irl', label: 'IRL', icon: 'walk-outline' as const },
      { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
      { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' as const },
      { id: 'comedy', label: 'Comedy', icon: 'happy-outline' as const },
      { id: 'just-chatting', label: 'Just Chatting', icon: 'chatbubbles-outline' as const },
    ],
    []
  );

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId)?.label ?? 'IRL';
  }, [categories, selectedCategoryId]);

  const needsPermissions = !cameraGranted || !micGranted;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrack) videoTrack.stop();
      if (audioTrack) audioTrack.stop();
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      // Note: Database cleanup handled by handleClose/handleEndLive
    };
  }, [videoTrack, audioTrack]);

  // Load host profile from Supabase (like web SoloHostStream)
  useEffect(() => {
    if (!user?.id) return;

    const loadHostProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, is_mll_pro')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[GoLive] Error loading host profile:', error);
          return;
        }

        if (profile) {
          setHostProfile({
            displayName: profile.display_name || profile.username || 'Host',
            avatarUrl: profile.avatar_url || undefined,
            isPro: profile.is_mll_pro ?? false,
          });
        }
      } catch (err) {
        console.error('[GoLive] Error loading host profile:', err);
      }
    };

    loadHostProfile();
  }, [user?.id]);

  // Load top gifters from gifts table (like web useStreamTopGifters)
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      setTopGifters([]);
      return;
    }

    let cancelled = false;

    const loadTopGifters = async () => {
      try {
        const { data, error } = await supabase
          .from('gifts')
          .select(`
            sender_id,
            coin_amount,
            sender:profiles!gifts_sender_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .not('sender_id', 'is', null);

        if (error) {
          console.error('[GoLive] Error loading top gifters:', error);
          return;
        }

        if (cancelled) return;

        // Aggregate by sender
        const gifterMap = new Map<string, { total: number; profile: any }>();
        (data ?? []).forEach((gift: any) => {
          const senderId = gift?.sender_id;
          const profile = gift?.sender;
          if (!senderId || !profile) return;

          const amount = Number(gift?.coin_amount ?? 0);
          const existing = gifterMap.get(senderId);
          if (existing) {
            existing.total += amount;
          } else {
            gifterMap.set(senderId, { total: amount, profile });
          }
        });

        // Sort and take top 3
        const sorted = Array.from(gifterMap.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3)
          .map(([senderId, v]) => ({
            id: senderId,
            username: v.profile?.username || 'Unknown',
            avatarUrl: v.profile?.avatar_url || undefined,
            totalCoins: v.total,
          }));

        setTopGifters(sorted);
      } catch (err) {
        console.error('[GoLive] Error loading top gifters:', err);
      }
    };

    // Initial load
    loadTopGifters();

    // Subscribe to new gifts (like web)
    const giftChannel = supabase
      .channel(`gifts-stream-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) loadTopGifters();
        }
      )
      .subscribe();

    // Fallback polling every 30s
    const interval = setInterval(() => {
      if (!cancelled) loadTopGifters();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      giftChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Load and subscribe to chat messages (like web StreamChat)
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      setChatMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            profile_id,
            content,
            message_type,
            created_at,
            profile:profiles!chat_messages_profile_id_fkey(
              username,
              display_name,
              avatar_url,
              lifetime_coins_gifted
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[GoLive] Error loading chat messages:', error);
          return;
        }

        if (cancelled) return;

        // Get unique profile IDs and fetch their chat settings
        const profileIds = [...new Set((data ?? []).map((msg: any) => msg.profile_id).filter(Boolean))];
        const { data: chatSettingsData } = await supabase
          .from('chat_settings')
          .select('profile_id, chat_bubble_color')
          .in('profile_id', profileIds);
        
        const chatSettingsMap = new Map(
          (chatSettingsData ?? []).map((s: any) => [s.profile_id, s.chat_bubble_color])
        );

        // Data is newest-first from DB, pass directly to inverted FlatList so newest shows at bottom
        const messages: ChatMessage[] = (data ?? []).map((msg: any) => {
          const lifetimeCoins = msg.profile?.lifetime_coins_gifted || 0;
          const gifterInfo = getGifterTierFromCoins(lifetimeCoins);
          
          return {
            id: String(msg.id),
            type: mapMessageType(msg.message_type),
            username: msg.profile?.display_name || msg.profile?.username || 'User',
            text: msg.content || '',
            avatarUrl: msg.profile?.avatar_url || undefined,
            giftAmount: msg.message_type === 'gift' ? extractGiftAmount(msg.content) : undefined,
            chatColor: chatSettingsMap.get(msg.profile_id) || undefined,
            gifterTierKey: gifterInfo.tierKey,
            gifterLevelInTier: gifterInfo.levelInTier,
            lifetimeCoins: lifetimeCoins,
          };
        });

        setChatMessages(messages);
      } catch (err) {
        console.error('[GoLive] Error loading chat messages:', err);
      }
    };

    // Initial load
    loadMessages();

    // Subscribe to new messages (like web)
    const chatChannel = supabase
      .channel(`chat-stream-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        async (payload) => {
          if (cancelled) return;
          
          const msg = payload.new as any;
          // Fetch profile info and chat settings for new message
          const [profileResult, chatSettingsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('username, display_name, avatar_url, lifetime_coins_gifted')
              .eq('id', msg.profile_id)
              .single(),
            supabase
              .from('chat_settings')
              .select('chat_bubble_color')
              .eq('profile_id', msg.profile_id)
              .maybeSingle(),
          ]);
          
          if (cancelled) return;
          
          const profile = profileResult.data;
          const chatSettings = chatSettingsResult.data;
          const lifetimeCoins = (profile as any)?.lifetime_coins_gifted || 0;
          const gifterInfo = getGifterTierFromCoins(lifetimeCoins);
          
          const newMessage: ChatMessage = {
            id: String(msg.id),
            type: mapMessageType(msg.message_type),
            username: profile?.display_name || profile?.username || 'User',
            text: msg.content || '',
            avatarUrl: profile?.avatar_url || undefined,
            giftAmount: msg.message_type === 'gift' ? extractGiftAmount(msg.content) : undefined,
            chatColor: chatSettings?.chat_bubble_color || undefined,
            gifterTierKey: gifterInfo.tierKey,
            gifterLevelInTier: gifterInfo.levelInTier,
            lifetimeCoins: lifetimeCoins,
          };

          // Prepend new message (array is newest-first for inverted FlatList)
          setChatMessages((prev) => [newMessage, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      chatChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Load viewer count from active_viewers table (like web SoloHostStream)
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      return;
    }

    let cancelled = false;

    const loadViewerCount = async () => {
      try {
        const { count, error } = await supabase
          .from('active_viewers')
          .select('*', { count: 'exact', head: true })
          .eq('live_stream_id', liveStreamId);

        if (error) {
          console.error('[GoLive] Error loading viewer count:', error);
          return;
        }

        if (!cancelled && typeof count === 'number') {
          setViewerCount(count);
        }
      } catch (err) {
        console.error('[GoLive] Error loading viewer count:', err);
      }
    };

    // Initial load
    loadViewerCount();

    // Subscribe to viewer changes (like web)
    const viewerChannel = supabase
      .channel(`active-viewers-host-${liveStreamId}`)
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
      .subscribe();

    // Fallback polling every 60s
    const interval = setInterval(() => {
      if (!cancelled) loadViewerCount();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      viewerChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Load trending rank and leaderboard rank (like web SoloStreamViewer)
  useEffect(() => {
    if (!liveStreamId || !isLive || !user?.id) {
      return;
    }

    let cancelled = false;

    const loadTrendingRank = async () => {
      try {
        const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', {
          p_limit: 100,
          p_offset: 0,
        });

        if (error) {
          console.error('[GoLive] Error fetching trending rank:', error);
          return;
        }

        if (data && Array.isArray(data) && !cancelled) {
          const rank = data.findIndex((s: any) => s.stream_id === liveStreamId);
          setTrendingRank(rank !== -1 ? rank + 1 : 0);
        }
      } catch (err) {
        console.error('[GoLive] Error loading trending rank:', err);
      }
    };

    const loadLeaderboardRank = async () => {
      try {
        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_type: 'top_streamers',
          p_period: 'daily',
          p_limit: 100,
          p_room_id: null,
        });

        if (error) {
          console.error('[GoLive] Error fetching leaderboard rank:', error);
          return;
        }

        if (data && Array.isArray(data) && !cancelled) {
          const myEntry = data.find((r: any) => r.profile_id === user.id);
          if (myEntry) {
            const myRank = Number(myEntry.rank ?? 0);
            const myValue = Number(myEntry.metric_value ?? 0);
            
            // Calculate points to next rank
            let pointsToNext = 0;
            if (myRank === 1) {
              // If first place, show how far ahead we are
              const secondPlace = data.find((r: any) => Number(r.rank) === 2);
              pointsToNext = secondPlace ? myValue - Number(secondPlace.metric_value ?? 0) : myValue;
            } else if (myRank > 1) {
              // Find the person above us
              const aboveMe = data.find((r: any) => Number(r.rank) === myRank - 1);
              pointsToNext = aboveMe ? Number(aboveMe.metric_value ?? 0) - myValue : 0;
            }
            
            setLeaderboardRank({
              currentRank: myRank,
              pointsToNextRank: Math.max(0, pointsToNext),
            });
          } else {
            setLeaderboardRank(null);
          }
        }
      } catch (err) {
        console.error('[GoLive] Error loading leaderboard rank:', err);
      }
    };

    // Initial load
    loadTrendingRank();
    loadLeaderboardRank();

    // Refresh every 60s
    const interval = setInterval(() => {
      if (!cancelled) {
        loadTrendingRank();
        loadLeaderboardRank();
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveStreamId, isLive, user?.id]);

  // Helper: Map message_type to ChatMessage type
  const mapMessageType = (type: string): 'chat' | 'gift' | 'follow' | 'system' => {
    switch (type) {
      case 'gift':
        return 'gift';
      case 'follow':
        return 'follow';
      case 'system':
        return 'system';
      default:
        return 'chat';
    }
  };

  // Helper: Extract gift amount from content (e.g., "💎+100")
  const extractGiftAmount = (content: string): number | undefined => {
    const match = content?.match(/💎\+(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  };

  // Handle camera flip
  const handleFlipCamera = useCallback(async () => {
    if (!videoTrack) return;
    
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    
    // Stop old track and create new one with new facing
    videoTrack.stop();
    
    try {
      const newTrack = await createLocalVideoTrack({
        facingMode: newFacing,
        resolution: VideoPresets.h720.resolution,
      });
      attachFiltersToLocalVideoTrack(newTrack);
      setNativeFilterParams({
        brightness: cameraFilters.brightness,
        contrast: cameraFilters.contrast,
        saturation: cameraFilters.saturation,
        softSkinLevel: cameraFilters.softSkinLevel,
      });
      setVideoTrack(newTrack);
      
      // If live, republish the new track
      if (isLive && roomRef.current) {
        await roomRef.current.localParticipant.publishTrack(newTrack);
      }
    } catch (err) {
      console.error('[GoLive] Flip camera error:', err);
    }
  }, [cameraFacing, videoTrack, isLive]);

  // Handle Enable button - request permissions and start preview
  const handleRequestPermissions = useCallback(async () => {
    console.log('[GoLive] Enable button pressed');
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      // Check if we're in Expo Go
      // @ts-ignore
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants?.appOwnership === 'expo';
      
      if (isExpoGo) {
        throw new Error('Camera preview requires a development build.');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[GoLive] Creating local tracks...');
      const video = await createLocalVideoTrack({
        facingMode: cameraFacing,
        resolution: VideoPresets.h720.resolution,
      });
      attachFiltersToLocalVideoTrack(video);
      setNativeFilterParams({
        brightness: cameraFilters.brightness,
        contrast: cameraFilters.contrast,
        saturation: cameraFilters.saturation,
        softSkinLevel: cameraFilters.softSkinLevel,
      });
      
      const audio = await createLocalAudioTrack();

      setVideoTrack(video);
      setAudioTrack(audio);
      setCameraGranted(true);
      setMicGranted(true);
      console.log('[GoLive] Tracks created');
    } catch (err: any) {
      console.error('[GoLive] Camera error:', err?.message || err);
      setPreviewError(err?.message || 'Failed to access camera');
    } finally {
      setPreviewLoading(false);
    }
  }, [cameraFacing]);

  // Handle close
  const handleClose = useCallback(async () => {
    // Stop tracks
    if (videoTrack) videoTrack.stop();
    if (audioTrack) audioTrack.stop();
    
    // Disconnect from room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    // If we were live, end the stream record
    if (isLive && user?.id) {
      // Also clear room presence so you stop appearing in category rooms (IRL/Music/etc)
      try {
        const userName = user.email?.split('@')[0] || 'Host';
        await supabase.rpc('upsert_room_presence', {
          p_profile_id: user.id,
          p_username: userName,
          p_room_id: selectedCategoryId,
          p_is_live_available: false,
        });
      } catch (err) {
        console.warn('[GoLive] Failed to clear room presence on close:', err);
      }
      await endLiveStreamRecord(user.id);
    }
    
    navigation.goBack();
  }, [navigation, videoTrack, audioTrack, isLive, user, selectedCategoryId]);

  // Handle Go Live - connect and publish on SAME screen
  const handleGoLive = useCallback(async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a stream title.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Not Logged In', 'Please log in to go live.');
      return;
    }
    if (needsPermissions || !videoTrack || !audioTrack) {
      Alert.alert('Permissions Required', 'Please enable camera and microphone first.');
      return;
    }

    setIsConnecting(true);

    try {
      const roomName = generateSoloRoomName(user.id);
      const userName = user.email?.split('@')[0] || 'Host';

      // Mark host as live in the selected category "room" (IRL/Music/etc).
      // This is what powers room-based LiveTV sections on the backend (room_presence.room_id).
      try {
        await supabase.rpc('upsert_room_presence', {
          p_profile_id: user.id,
          p_username: userName,
          p_room_id: selectedCategoryId,
          p_is_live_available: true,
        });
      } catch (err) {
        console.warn('[GoLive] Failed to upsert room presence:', err);
      }

      // Create live_streams record in database (makes stream visible on LiveTV)
      // Matches web GoLiveButton.tsx implementation
      const { liveStreamId: newLiveStreamId, error: dbError } = await startLiveStreamRecord(user.id);
      if (dbError) {
        console.warn('[GoLive] DB record warning:', dbError);
        // Continue anyway - stream will work, just may not show on LiveTV immediately
      } else {
        console.log('[GoLive] Created live_stream ID:', newLiveStreamId);
        // Store the live_stream_id so we can fetch chat/gifters/viewers like web
        setLiveStreamId(newLiveStreamId ?? null);

        // Best-effort: tag the live_stream row with the selected category label
        // so LiveTV category tabs (IRL/Music/etc) can match it.
        try {
          if (newLiveStreamId) {
            const { error: tagError } = await supabase
              .from('live_streams')
              .update({ room_name: selectedCategoryLabel })
              .eq('id', newLiveStreamId);
            if (tagError) {
              console.warn('[GoLive] Failed to tag live_stream room_name:', tagError.message);
            }
          }
        } catch (err) {
          console.warn('[GoLive] Failed to tag live_stream room_name exception:', err);
        }
      }

      // Fetch token
      const { token, url } = await fetchMobileToken(roomName, user.id, userName, true);

      // Create room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(room.remoteParticipants.size);
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(room.remoteParticipants.size);
      });

      // Connect
      await room.connect(url, token);
      roomRef.current = room;

      // Publish existing tracks
      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);
      // Ensure processor params are applied after publish as well (some platforms start capturer on publish)
      setNativeFilterParams({
        brightness: cameraFilters.brightness,
        contrast: cameraFilters.contrast,
        saturation: cameraFilters.saturation,
        softSkinLevel: cameraFilters.softSkinLevel,
      });

      setIsLive(true);
      console.log('[GoLive] Now live! Stream should appear on LiveTV.');
    } catch (err: any) {
      console.error('[GoLive] Connect error:', err);
      // If we created a DB record but connection failed, clean it up
      if (user?.id) {
        // Clear room presence if we failed to go live
        try {
          const userName = user.email?.split('@')[0] || 'Host';
          await supabase.rpc('upsert_room_presence', {
            p_profile_id: user.id,
            p_username: userName,
            p_room_id: selectedCategoryId,
            p_is_live_available: false,
          });
        } catch (presenceErr) {
          console.warn('[GoLive] Failed to clear room presence after connect error:', presenceErr);
        }
        await endLiveStreamRecord(user.id);
      }
      Alert.alert('Connection Failed', err.message || 'Failed to go live.');
    } finally {
      setIsConnecting(false);
    }
  }, [streamTitle, user, needsPermissions, videoTrack, audioTrack, selectedCategoryId, selectedCategoryLabel]);

  // Handle End Live - full cleanup and reset to preview state
  const handleEndLive = useCallback(() => {
    Alert.alert('End Stream', 'Are you sure you want to end your stream?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: async () => {
          console.log('[GoLive] Ending stream and cleaning up...');
          
          // Disconnect from LiveKit room
          if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
          }
          
          // Stop and clear tracks (they become stale after room disconnect)
          if (videoTrack) {
            videoTrack.stop();
          }
          if (audioTrack) {
            audioTrack.stop();
          }
          setVideoTrack(null);
          setAudioTrack(null);
          
          // End the live_streams record in database
          if (user?.id) {
            // Clear room presence so you stop appearing in category rooms (IRL/Music/etc)
            try {
              const userName = user.email?.split('@')[0] || 'Host';
              await supabase.rpc('upsert_room_presence', {
                p_profile_id: user.id,
                p_username: userName,
                p_room_id: selectedCategoryId,
                p_is_live_available: false,
              });
            } catch (err) {
              console.warn('[GoLive] Failed to clear room presence on end:', err);
            }
            await endLiveStreamRecord(user.id);
          }
          
          // Reset all state to initial
          setIsLive(false);
          setViewerCount(0);
          setLiveStreamId(null);
          setTopGifters([]);
          setChatMessages([]);
          setTrendingRank(0);
          setLeaderboardRank(null);
          setCameraGranted(false);
          setMicGranted(false);
          setPreviewError(null);
          
          console.log('[GoLive] Stream ended. Tap Enable to start a new preview.');
        },
      },
    ]);
  }, [user, videoTrack, audioTrack, selectedCategoryId]);

  return (
    <View style={styles.container}>
      {/* Camera Preview / Live Video */}
      <View style={styles.cameraPreview}>
        {videoTrack ? (
          <VideoView
            style={styles.videoView}
            videoTrack={videoTrack}
            mirror={cameraFacing === 'user'}
            objectFit="cover"
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.previewText}>
              {previewError || (previewLoading ? 'Starting camera...' : 'Camera Preview')}
            </Text>
            <Text style={styles.previewHint}>
              {cameraFacing === 'user' ? 'Front camera' : 'Back camera'}
            </Text>
          </View>
        )}

        {/* Permissions Banner */}
        {needsPermissions && !isLive && (
          <View style={[styles.permissionsBanner, { top: insets.top + 60 }]}>
            <View style={styles.permissionsContent}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.warning} />
              <View style={styles.permissionsText}>
                <Text style={styles.permissionsTitle}>Permissions needed</Text>
                <Text style={styles.permissionsHint}>Camera & microphone access required</Text>
              </View>
              <Pressable
                onPress={handleRequestPermissions}
                disabled={previewLoading}
                style={({ pressed }) => [styles.permissionsButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.permissionsButtonText}>
                  {previewLoading ? '...' : 'Enable'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Live indicator - OLD (now handled by SoloHostOverlay) */}
      </View>

      {/* Top Controls - Only show when NOT live (overlay has its own) */}
      {!isLive && (
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
          >
            <Ionicons name="close" size={24} color={COLORS.white} />
          </Pressable>

          <View style={styles.topSpacer} />

          {videoTrack && (
            <Pressable
              onPress={handleFlipCamera}
              style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
            >
              <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
            </Pressable>
          )}
        </View>
      )}

      {/* Setup Modal - Hidden when live */}
      {!isLive && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Go Live</Text>
          </View>

          <View style={styles.modalContent}>
            {/* Title */}
            <View style={styles.titleRow}>
              <View style={styles.titleField}>
                <Text style={styles.fieldLabel}>Title</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={streamTitle}
                    onChangeText={setStreamTitle}
                    placeholder="What are you streaming?"
                    placeholderTextColor={COLORS.mutedText}
                    style={styles.input}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                  />
                </View>
              </View>
              <Pressable style={styles.thumbnailButton}>
                <Ionicons name="image-outline" size={18} color={COLORS.mutedText} />
              </Pressable>
            </View>

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categorySlider}
              style={styles.categoryScrollView}
            >
              {categories.map((c) => {
                const isSelected = c.id === selectedCategoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCategoryId(c.id)}
                    style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.chipPressed]}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={isSelected ? COLORS.white : COLORS.mutedText}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Audience */}
            <Text style={styles.fieldLabel}>Audience</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => setAudience('Public')}
                style={[styles.segmentButton, audience === 'Public' && styles.segmentButtonActive]}
              >
                <Ionicons name="globe-outline" size={14} color={audience === 'Public' ? COLORS.white : COLORS.mutedText} style={{ marginRight: 4 }} />
                <Text style={[styles.segmentText, audience === 'Public' && styles.segmentTextActive]}>Public</Text>
              </Pressable>
              <Pressable
                onPress={() => setAudience('Team')}
                style={[styles.segmentButton, audience === 'Team' && styles.segmentButtonActive]}
              >
                <Ionicons name="people-outline" size={14} color={audience === 'Team' ? COLORS.white : COLORS.mutedText} style={{ marginRight: 4 }} />
                <Text style={[styles.segmentText, audience === 'Team' && styles.segmentTextActive]}>Team</Text>
              </Pressable>
            </View>
          </View>

          {/* Go Live Button */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              onPress={handleGoLive}
              disabled={isConnecting || needsPermissions}
              style={({ pressed }) => [
                styles.goLiveButton,
                pressed && styles.goLiveButtonPressed,
                (isConnecting || needsPermissions) && styles.goLiveButtonDisabled,
              ]}
            >
              {isConnecting ? (
                <Text style={styles.goLiveText}>Connecting...</Text>
              ) : (
                <>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.goLiveText}>Go Live</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Solo Host Overlay - Full UI when live (web parity - real data from Supabase) */}
      {isLive && (
        <View style={styles.liveOverlay} pointerEvents="box-none">
          <SoloHostOverlay
            profileId={user?.id}
            hostName={hostProfile?.displayName || user?.email?.split('@')[0] || 'Host'}
            hostAvatarUrl={hostProfile?.avatarUrl}
            isPro={hostProfile?.isPro ?? false}
            viewerCount={viewerCount}
            trendingRank={trendingRank}
            leaderboardRank={leaderboardRank ?? undefined}
            topGifters={topGifters}
            messages={chatMessages}
            isMuted={false}
            isCameraFlipped={cameraFacing === 'environment'}
            chatFontColor={DEFAULT_CHAT_FONT_COLOR}
            cameraFilters={cameraFilters}
            onCameraFiltersChange={(patch) => {
              if (!user?.id) return;
              didUserEditCameraFiltersRef.current = true;
              setCameraFilters((prev) => {
                const next = { ...prev, ...patch };
                void saveHostCameraFilters(user.id, next);
                return next;
              });
            }}
            onEndStream={handleEndLive}
            onFlipCamera={handleFlipCamera}
          />
        </View>
      )}
    </View>
  );
}

const COLORS = {
  bg: '#000000',
  modal: '#12131A',
  modalBorder: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.95)',
  mutedText: 'rgba(255,255,255,0.50)',
  white: '#FFFFFF',
  primary: '#EF4444',
  primaryPressed: '#DC2626',
  inputBg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  warning: '#F59E0B',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    zIndex: 0,
  },
  liveOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  videoView: {
    flex: 1,
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
  },
  previewHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
  },
  permissionsBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  permissionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  permissionsText: {
    flex: 1,
  },
  permissionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.warning,
  },
  permissionsHint: {
    fontSize: 11,
    color: 'rgba(245, 158, 11, 0.8)',
    marginTop: 1,
  },
  permissionsButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  permissionsButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  liveStatusBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  liveStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  liveStatusText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  viewerCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  topButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topSpacer: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    bottom: '15%',
    left: 16,
    right: 16,
    backgroundColor: COLORS.modal,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.modalBorder,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalContent: {
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  titleField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  thumbnailButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScrollView: {
    marginHorizontal: -16,
    marginBottom: 12,
  },
  categorySlider: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderColor: 'transparent',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  goLiveButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goLiveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  goLiveButtonDisabled: {
    opacity: 0.5,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  goLiveText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  endLiveContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    alignItems: 'center',
  },
  endLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  endLiveText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 15,
  },
});
