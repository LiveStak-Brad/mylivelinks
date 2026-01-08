/**
 * Solo Host Stream Screen
 * 
 * Full-screen camera preview for the streamer/host
 * Features:
 * - Full screen video (host's camera)
 * - Semi-transparent chat overlay (1/3 of screen, bottom)
 * - Go Live / Stop Live button
 * - Viewer count
 * - Minimal UI (streamer-focused)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatMessages } from '../hooks/useChatMessages';
import { supabase } from '../lib/supabase';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { canUserGoLive } from '../lib/livekit-constants';
import { Modal, Input } from '../components/ui';
import { useActiveViewerCount } from '../hooks/useActiveViewerCount';
import { useGiftFeed } from '../hooks/useGiftFeed';
import { ensureLiveKitReady } from '../lib/livekit/ensureLiveKitReady';

type SoloHostStreamScreenProps = {
  onExit?: () => void;
};

type LeaderboardRank = {
  current_rank: number;
  total_entries: number;
  metric_value: number;
  rank_tier: string | null;
  points_to_next_rank: number;
  next_rank: number;
};

// Local minimal participant type to avoid importing any LiveKit-linked types in this screen.
type TileParticipant = {
  identity: string;
  username: string;
  isSpeaking: boolean;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isLocal: boolean;
  viewerCount?: number;
};

type LiveKitDeps = {
  useLiveRoomParticipants: null | ((opts: { enabled: boolean }) => any);
  Tile: null | React.ComponentType<any>;
};

const LK: LiveKitDeps = {
  useLiveRoomParticipants: null,
  Tile: null,
};

export default function SoloHostStreamScreen({ onExit }: SoloHostStreamScreenProps) {
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  const { user } = useAuthContext();

  const isOwner = useMemo(() => canUserGoLive(user ? { id: user.id, email: user.email } : null), [user?.email, user?.id]);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Safe-shell rule: DO NOT evaluate LiveKit until after mount and after registerGlobals().
  useEffect(() => {
    if (!isOwner) return;
    if (ready) return;

    let mounted = true;
    (async () => {
      try {
        setInitError(null);
        await ensureLiveKitReady();

        // Import LiveKit-dependent modules ONLY after registerGlobals is complete.
        const hookMod: any = await import('../hooks/useLiveRoomParticipants');
        const tileMod: any = await import('../components/live/Tile');

        const useLiveRoomParticipants = hookMod?.useLiveRoomParticipants;
        const Tile = tileMod?.Tile;
        if (typeof useLiveRoomParticipants !== 'function') {
          throw new Error('useLiveRoomParticipants missing');
        }
        if (!Tile) {
          throw new Error('Tile export missing');
        }

        LK.useLiveRoomParticipants = useLiveRoomParticipants;
        LK.Tile = Tile;

        if (mounted) setReady(true);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        if (mounted) setInitError(msg);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOwner, ready]);

  if (!isOwner) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: (insets.top || 0) + 24 }]}>
        <View style={styles.centered}>
          <Text style={[styles.subtleText, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
            Go Live is currently limited to the owner account.
          </Text>
          <TouchableOpacity
            style={[styles.goLiveButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              onExit?.();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.goLiveButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: (insets.top || 0) + 24 }]}>
        <View style={styles.centered}>
          <Text style={[{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 10, textAlign: 'center' }]}>
            LiveKit failed to load
          </Text>
          <Text style={[styles.subtleText, { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
            {initError}
          </Text>
          <TouchableOpacity
            style={[styles.goLiveButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => onExit?.()}
            activeOpacity={0.85}
          >
            <Text style={styles.goLiveButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: (insets.top || 0) + 24 }]}>
        <View style={styles.centered}>
          <Text style={[{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 10 }]}>
            Preparing LiveKit…
          </Text>
          <Text style={[styles.subtleText, { color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 18 }]}>
            Loading video system. This should only take a moment.
          </Text>
          <View style={{ width: '100%', maxWidth: 320, aspectRatio: 9 / 16, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.15)', marginBottom: 18 }} />
          <TouchableOpacity
            style={[styles.goLiveButton, { backgroundColor: theme.colors.cardSurface }]}
            onPress={() => onExit?.()}
            activeOpacity={0.85}
          >
            <Text style={[styles.goLiveButtonText, { color: theme.colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <SoloHostStreamScreenLive onExit={onExit} />;
}

function SoloHostStreamScreenLive({ onExit }: SoloHostStreamScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  const { user } = useAuthContext();
  const { height: windowHeight } = useWindowDimensions();

  const isOwner = useMemo(() => canUserGoLive(user ? { id: user.id, email: user.email } : null), [user?.email, user?.id]);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; display_name?: string | null; avatar_url?: string | null } | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<LeaderboardRank | null>(null);
  const [trendingRank, setTrendingRank] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [showSetupModal, setShowSetupModal] = useState(true);
  const [showAlreadyLiveModal, setShowAlreadyLiveModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  
  // LiveKit streaming - SOLO STREAM FIX: Use unique room per user profile
  const useLiveRoomParticipants = LK.useLiveRoomParticipants as any;
  // Each solo host gets their own dedicated room: solo_${profile_id}
  const soloRoomName = user?.id ? `solo_${user.id}` : undefined;
  
  const {
    goLive,
    stopLive,
    endOtherStream,
    resumeOnThisDevice,
    isLive,
    isConnected,
    room,
    participants,
    liveStreamId,
    localMicEnabled,
    localCameraEnabled,
    cameraFacingMode,
    setMicrophoneEnabled,
    setCameraEnabled,
    flipCamera,
    connectionError,
    lastConnectError,
    lastTokenError,
    isPublishing,
  } = useLiveRoomParticipants({ enabled: true, roomName: soloRoomName });

  const { messages, loading: loadingMessages, retryMessage } = useChatMessages({
    liveStreamId: liveStreamId ?? undefined,
  });
  const { topGifters, recentGifts } = useGiftFeed(currentUser?.id);
  const fallbackViewerCount = useMemo(() => {
    if (!room) return 0;
    const remote = room.remoteParticipants?.size ?? 0;
    return Math.max(0, remote);
  }, [room]);
  const { viewerCount } = useActiveViewerCount({
    liveStreamId,
    fallbackCount: fallbackViewerCount,
  });
  const displayViewerCount = liveStreamId ? viewerCount : fallbackViewerCount;

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: user.id,
            username: profile.username,
            display_name: (profile as any).display_name ?? null,
            avatar_url: (profile as any).avatar_url ?? null,
          });
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!showSetupModal) return;
    if (permissionsGranted || requestingPermissions || permissionsRequested) return;

    let cancelled = false;
    const requestPermissions = async () => {
      setRequestingPermissions(true);
      setPermissionsRequested(true);
      try {
        const expoCamera = require('expo-camera') as any;
        const Camera = expoCamera?.Camera;
        const camera = await Camera.requestCameraPermissionsAsync();
        const mic = await Camera.requestMicrophonePermissionsAsync();
        if (cancelled) return;
        setPermissionsGranted(camera.status === 'granted' && mic.status === 'granted');
      } catch (err) {
        if (cancelled) return;
        console.warn('[SoloHostStreamScreen] Permission request failed:', err);
        setPermissionsGranted(false);
      } finally {
        if (!cancelled) setRequestingPermissions(false);
      }
    };

    requestPermissions();
    return () => {
      cancelled = true;
    };
  }, [permissionsGranted, permissionsRequested, requestingPermissions, showSetupModal]);

  useEffect(() => {
    if (!showSetupModal) return;
    setPermissionsRequested(false);
  }, [showSetupModal]);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    const loadLeaderboardRank = async () => {
      try {
        const { data, error } = await supabase.rpc('rpc_get_leaderboard_rank', {
          p_profile_id: currentUser.id,
          p_leaderboard_type: 'top_streamers_daily',
        });
        if (cancelled) return;
        if (error || !Array.isArray(data) || data.length === 0) {
          setLeaderboardRank(null);
          return;
        }
        setLeaderboardRank(data[0] as LeaderboardRank);
      } catch (err) {
        if (!cancelled) {
          console.warn('[SoloHostStreamScreen] Failed to load leaderboard rank:', err);
          setLeaderboardRank(null);
        }
      }
    };

    const loadTrendingRank = async () => {
      if (!isLive || !liveStreamId) {
        setTrendingRank(null);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', {
          p_limit: 100,
          p_offset: 0,
        });
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setTrendingRank(null);
          return;
        }
        const index = data.findIndex((entry: any) => entry.stream_id === liveStreamId);
        setTrendingRank(index >= 0 ? index + 1 : null);
      } catch (err) {
        if (!cancelled) {
          console.warn('[SoloHostStreamScreen] Failed to load trending rank:', err);
          setTrendingRank(null);
        }
      }
    };

    void loadLeaderboardRank();
    void loadTrendingRank();
    const interval = setInterval(() => {
      void loadLeaderboardRank();
      void loadTrendingRank();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUser?.id, isLive, liveStreamId]);


  const attemptStartStream = useCallback(async () => {
    try {
      setShowSetupModal(false);
      const trimmedTitle = streamTitle.trim();
      await goLive({ streamTitle: trimmedTitle });
    } catch (err: any) {
      if (err?.message === 'ALREADY_LIVE_ELSEWHERE') {
        setShowAlreadyLiveModal(true);
        setShowSetupModal(false);
        return;
      }
      setShowSetupModal(true);
      Alert.alert('Live error', err?.message || 'Failed to start stream');
    }
  }, [goLive, streamTitle]);

  const handleStartStream = useCallback(() => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please log in to go live.');
      return;
    }

    if (!permissionsGranted) {
      Alert.alert('Permissions required', 'Camera and microphone access is required to go live.');
      return;
    }

    if (!streamTitle.trim()) {
      Alert.alert('Stream title required', 'Please enter a stream title.');
      return;
    }

    if (!isConnected) {
      Alert.alert('Connecting…', 'Please wait for LiveKit to connect, then try again.');
      return;
    }

    Alert.alert(
      'Go Live?',
      'Are you sure you want to start streaming right now?',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Go Live', style: 'default', onPress: () => void attemptStartStream() },
      ]
    );
  }, [attemptStartStream, currentUser?.id, isConnected, permissionsGranted, streamTitle]);

  const handleEndOtherAndStartHere = useCallback(async () => {
    setShowAlreadyLiveModal(false);
    try {
      await endOtherStream();
      // Wait a moment then start on this device
      await new Promise(resolve => setTimeout(resolve, 500));
      await goLive({ streamTitle: streamTitle.trim() });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to end other stream and start here');
      setShowSetupModal(true);
    }
  }, [endOtherStream, goLive, streamTitle]);

  const handleResumeHere = useCallback(async () => {
    setShowAlreadyLiveModal(false);
    try {
      await resumeOnThisDevice();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resume stream on this device');
      setShowSetupModal(true);
    }
  }, [resumeOnThisDevice]);

  const handleToggleMic = useCallback(async () => {
    try {
      await setMicrophoneEnabled(!localMicEnabled);
    } catch (err: any) {
      Alert.alert('Mic error', err?.message || 'Failed to toggle microphone');
    }
  }, [localMicEnabled, setMicrophoneEnabled]);

  const handleToggleCam = useCallback(async () => {
    try {
      await setCameraEnabled(!localCameraEnabled);
    } catch (err: any) {
      Alert.alert('Camera error', err?.message || 'Failed to toggle camera');
    }
  }, [localCameraEnabled, setCameraEnabled]);

  const handleFlipCamera = useCallback(async () => {
    try {
      await flipCamera();
    } catch (err: any) {
      Alert.alert('Camera error', err?.message || 'Failed to flip camera');
    }
  }, [flipCamera]);

  const localParticipant = participants.find((p) => p.isLocal) || null;

  const tileParticipant: TileParticipant = {
    identity: localParticipant?.identity || currentUser?.id || 'local',
    username: currentUser?.display_name || currentUser?.username || 'You',
    isSpeaking: false,
    isCameraEnabled: localCameraEnabled,
    isMicEnabled: localMicEnabled,
    isLocal: true,
    viewerCount: undefined,
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getFallbackBubbleColor = (profileId: string) => {
    const colors = [
      'rgba(168, 85, 247, 0.28)',
      'rgba(236, 72, 153, 0.28)',
      'rgba(59, 130, 246, 0.28)',
      'rgba(99, 102, 241, 0.28)',
      'rgba(139, 92, 246, 0.28)',
      'rgba(217, 70, 239, 0.28)',
      'rgba(244, 63, 94, 0.28)',
      'rgba(34, 211, 238, 0.24)',
    ];
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const toHexWithAlpha = (hex: string, alphaHex: string) => {
    const raw = (hex || '').trim();
    if (!raw) return null;
    if (!raw.startsWith('#')) return null;
    const body = raw.slice(1);
    if (body.length !== 6) return null;
    return `#${body}${alphaHex}`;
  };

  const canChat = !!isLive && !!liveStreamId;

  const handleExit = useCallback(async () => {
    if (isLive) {
      Alert.alert(
        'End Stream?',
        'Are you sure you want to stop streaming?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Stream',
            style: 'destructive',
            onPress: async () => {
              await stopLive();
              onExit?.();
            },
          },
        ]
      );
    } else {
      onExit?.();
    }
  }, [isLive, onExit, stopLive]);

  const handleEndStreamPress = useCallback(() => {
    if (!isLive) return;
    Alert.alert('End stream', 'End your live stream now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: () => {
          stopLive().catch((err: any) => {
            Alert.alert('End failed', err?.message || 'Failed to end stream');
          });
        },
      },
    ]);
  }, [isLive, stopLive]);

  const headerName = currentUser?.display_name || currentUser?.username || 'Streamer';
  const headerStreamTitle = streamTitle.trim().length > 0 ? streamTitle.trim() : `${headerName}'s stream`;
  const liveErrorMessage = connectionError || lastConnectError || lastTokenError?.message || null;
  const trendingLabel = trendingRank != null ? `#${trendingRank}` : '—';
  const leaderboardLabel =
    leaderboardRank?.current_rank != null ? `#${leaderboardRank.current_rank}` : '—';
  const optionsBottom = Math.max(12, (insets.bottom || 0) + 12);
  const chatBottom = optionsBottom + 72;
  const chatHeight = Math.max(190, Math.min(windowHeight * 0.3, 320));

  const handleShare = useCallback(async () => {
    try {
      const handle = currentUser?.username ? `@${currentUser.username}` : 'MyLiveLinks';
      const url = currentUser?.username
        ? `https://www.mylivelinks.com/live/${encodeURIComponent(currentUser.username)}`
        : 'https://www.mylivelinks.com';

      await Share.share({
        message: `${handle} is live on MyLiveLinks. Join: ${url}`,
        url,
        title: `${handle} • Live`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Could not open share sheet');
    }
  }, [currentUser?.username]);

  const handleTrendingPress = useCallback(() => {
    if (!trendingRank) {
      Alert.alert('Trending', 'You are not currently on the trending board. Keep streaming!');
      return;
    }
    Alert.alert('Trending rank', `You are currently ranked #${trendingRank} on trending streams.`);
  }, [trendingRank]);

  const handleLeaderboardPress = useCallback(() => {
    if (!leaderboardRank) {
      Alert.alert('Leaderboard', 'Leaderboard data is unavailable right now.');
      return;
    }
    Alert.alert(
      'Leaderboard rank',
      `Current rank: #${leaderboardRank.current_rank}\nPoints to next: ${leaderboardRank.points_to_next_rank ?? 0}`
    );
  }, [leaderboardRank]);

  if (!isOwner) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: (insets.top || 0) + 24 }]}> 
        <View style={styles.centered}>
          <Text style={[styles.subtleText, { color: theme.colors.textSecondary, textAlign: 'center' }]}> 
            Go Live is currently limited to the owner account.
          </Text>
          <TouchableOpacity
            style={[styles.goLiveButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              onExit?.();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.goLiveButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.videoStage}>
        <View style={styles.videoStageInner}>
          {LK.Tile ? (
            <LK.Tile
              item={{ id: tileParticipant.identity, participant: tileParticipant, isAutofill: false }}
              isEditMode={false}
              isFocused={false}
              isMinimized={false}
              room={room as any}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                Loading video…
              </Text>
            </View>
          )}
        </View>

        <View pointerEvents="none" style={styles.videoTopShade} />
        <View pointerEvents="none" style={styles.videoBottomShade} />

        <View style={[styles.topOverlayRow, { top: (insets.top || 0) + 10, left: 12, right: 12 }]}>
          <BlurView intensity={22} tint="dark" style={styles.streamerPill}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Alert.alert('Profile', 'Mini profile coming soon.')}
              style={styles.streamerPillInner}
            >
              <View style={styles.streamerAvatarWrap}>
                {currentUser?.avatar_url ? (
                  <Image source={{ uri: currentUser.avatar_url }} style={styles.streamerAvatar} />
                ) : (
                  <View style={[styles.streamerAvatarFallback, { backgroundColor: theme.colors.cardSurface }]} />
                )}
              </View>
              <View style={styles.streamerTextWrap}>
                <Text style={styles.streamerName} numberOfLines={1}>
                  {headerName}
                </Text>
                <Text style={styles.streamerTitle} numberOfLines={1}>
                  {headerStreamTitle}
                </Text>
                <View style={styles.streamerStatsRow}>
                  <View
                    style={[
                      styles.liveStatusPill,
                      isLive ? styles.liveStatusActive : styles.liveStatusIdle,
                    ]}
                  >
                    <Text style={styles.liveStatusText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
                  </View>
                  <TouchableOpacity onPress={handleTrendingPress} activeOpacity={0.8} style={styles.streamerStatButton}>
                    <Ionicons name="flame" size={14} color="#f97316" />
                    <Text style={styles.streamerStatValue}>{trendingLabel}</Text>
                  </TouchableOpacity>
                  <Text style={styles.dotSep}>•</Text>
                  <TouchableOpacity onPress={handleLeaderboardPress} activeOpacity={0.8} style={styles.streamerStatButton}>
                    <Ionicons name="trophy" size={14} color="#eab308" />
                    <Text style={styles.streamerStatValue}>{leaderboardLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </BlurView>

          <View style={styles.topOverlayCenter}>
            <TouchableOpacity
              onPress={() => Alert.alert('Viewers', `${displayViewerCount} watching`)}
              activeOpacity={0.85}
            >
              <BlurView intensity={22} tint="dark" style={styles.viewerCountPill}>
                <Ionicons name="eye" size={14} color="#fff" />
                <Text style={styles.viewerCountText}>{displayViewerCount}</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={styles.topOverlayRight}>
            {topGifters.length > 0 && (
              <View style={styles.gifterRow}>
                {topGifters.slice(0, 3).map((gifter, index) => {
                  const ringColors = ['#fbbf24', '#d1d5db', '#c2410c'];
                  const ringColor = ringColors[index] || ringColors[2];
                  return (
                    <TouchableOpacity
                      key={gifter.profile_id}
                      onPress={() =>
                        Alert.alert('Top Supporter', `${gifter.username} • ${gifter.total_coins.toLocaleString()} coins`)
                      }
                      activeOpacity={0.85}
                      style={[styles.gifterBubble, { borderColor: ringColor }]}
                    >
                      {gifter.avatar_url ? (
                        <Image source={{ uri: gifter.avatar_url }} style={styles.gifterAvatar} />
                      ) : (
                        <View style={[styles.gifterAvatarFallback, { backgroundColor: theme.colors.cardSurface }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <BlurView intensity={18} tint="dark" style={styles.closeButtonWrap}>
              <TouchableOpacity onPress={handleExit} activeOpacity={0.85} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </BlurView>

            <BlurView intensity={18} tint="dark" style={styles.shareButtonWrap}>
              <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={styles.iconButton}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>

        {liveErrorMessage && (
          <View style={[styles.liveErrorBanner, { top: (insets.top || 0) + 78, left: 12, right: 12 }]}>
            <Text style={styles.liveErrorTitle}>Live connection issue</Text>
            <Text style={styles.liveErrorText} numberOfLines={3}>
              {liveErrorMessage}
            </Text>
          </View>
        )}

        {recentGifts.length > 0 && (
          <View style={[styles.giftTicker, { top: (insets.top || 0) + 120 }]}>
            {recentGifts.slice(0, 4).map((gift) => (
              <View key={gift.id} style={styles.giftTickerItem}>
                {gift.avatarUrl ? (
                  <Image source={{ uri: gift.avatarUrl }} style={styles.giftTickerAvatar} />
                ) : (
                  <View style={styles.giftTickerAvatarFallback} />
                )}
                <View style={styles.giftTickerTextWrap}>
                  <Text style={styles.giftTickerUser} numberOfLines={1}>
                    {gift.senderUsername}
                  </Text>
                  <Text style={styles.giftTickerText} numberOfLines={1}>
                    sent {gift.coinValue.toLocaleString()} coins{gift.giftName ? ` • ${gift.giftName}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.chatOverlay, { height: chatHeight, bottom: chatBottom }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {loadingMessages ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>Loading messages…</Text>
              </View>
            ) : !canChat ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>Go live to enable chat</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>No messages yet. Be the first to chat!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isSystem = msg.profile_id == null || msg.message_type === 'system';
                const bubbleColor = msg.profile_id
                  ? (toHexWithAlpha(msg.chat_bubble_color || '', '66') || getFallbackBubbleColor(msg.profile_id))
                  : 'rgba(0,0,0,0.2)';

                if (isSystem) {
                  return (
                    <View key={String(msg.id)} style={styles.systemMessageWrap}>
                      <Text style={[styles.systemMessageText, { color: theme.colors.textSecondary }]}>{msg.content}</Text>
                    </View>
                  );
                }

                return (
                  <View key={String(msg.id)} style={styles.messageRow}>
                    <View style={[styles.bubble, { backgroundColor: bubbleColor }]}
                    >
                      <View style={styles.bubbleAvatarWrap}>
                        {msg.avatar_url ? (
                          <Image source={{ uri: msg.avatar_url }} style={styles.messageAvatar} />
                        ) : (
                          <View style={[styles.messageAvatarFallback, { backgroundColor: theme.colors.cardSurface }]} />
                        )}
                      </View>

                      <View style={styles.bubbleContent}>
                        <View style={styles.bubbleHeaderRow}>
                          <Text
                            style={[styles.messageUsername, msg.chat_font ? { fontFamily: msg.chat_font } : null]}
                            numberOfLines={1}
                          >
                            {msg.username || 'Unknown'}
                          </Text>
                          <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                          {msg.client_status === 'failed' && (
                            <TouchableOpacity
                              onPress={() => {
                                if (typeof msg.id === 'string') retryMessage(msg.id);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.messageStatusFailed}>Failed • Tap to retry</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {typeof msg.gifter_level === 'number' && msg.gifter_level > 0 ? (
                          <View style={styles.levelRow}>
                            <View style={styles.levelPill}>
                              <Text style={styles.levelPillText}>Lv {msg.gifter_level}</Text>
                            </View>
                            <Text
                              style={[styles.messageTextInline, msg.chat_font ? { fontFamily: msg.chat_font } : null]}
                            >
                              {msg.content}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.messageText, msg.chat_font ? { fontFamily: msg.chat_font } : null]}>
                            {msg.content}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={[styles.controlOverlay, { bottom: optionsBottom, left: 12, right: 12 }]}>
          {isLive ? (
            <View style={styles.controlBar}>
              <TouchableOpacity
                style={[styles.controlButton, !localMicEnabled && styles.controlButtonMuted]}
                onPress={handleToggleMic}
                activeOpacity={0.85}
              >
                <Ionicons name={localMicEnabled ? 'mic' : 'mic-off'} size={22} color="#fff" />
                <Text style={styles.controlLabel}>{localMicEnabled ? 'Mic on' : 'Mic off'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, !localCameraEnabled && styles.controlButtonMuted]}
                onPress={handleToggleCam}
                activeOpacity={0.85}
              >
                <Ionicons name={localCameraEnabled ? 'videocam' : 'videocam-off'} size={22} color="#fff" />
                <Text style={styles.controlLabel}>{localCameraEnabled ? 'Camera on' : 'Camera off'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, !localCameraEnabled && styles.controlButtonDisabled]}
                onPress={handleFlipCamera}
                activeOpacity={0.85}
                disabled={!localCameraEnabled}
              >
                <Ionicons name="sync" size={22} color="#fff" />
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={handleEndStreamPress}
                activeOpacity={0.85}
              >
                <Ionicons name="stop-circle" size={22} color="#fff" />
                <Text style={styles.controlLabel}>End</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryGoLiveButton}
              onPress={() => setShowSetupModal(true)}
              activeOpacity={0.9}
            >
              {requestingPermissions || isPublishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="radio" size={22} color="#fff" />
              )}
              <Text style={styles.primaryGoLiveLabel}>Go Live</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showSetupModal}
        onRequestClose={() => {
          setShowSetupModal(false);
          onExit?.();
        }}
      >
        <View style={styles.setupModalBody}>
          <Text style={[styles.setupTitle, { color: theme.colors.textPrimary }]}>Ready to Go Live?</Text>
          <Text style={[styles.setupSubtitle, { color: theme.colors.textSecondary }]}>Set up your stream</Text>

          <Input
            placeholder="Stream title"
            value={streamTitle}
            onChangeText={setStreamTitle}
            autoCapitalize="sentences"
          />

          {!permissionsGranted && (
            <Text style={[styles.setupHint, { color: theme.colors.textSecondary }]}>Camera and mic permissions are required.</Text>
          )}

          <View style={styles.setupButtonsRow}>
            <TouchableOpacity
              style={[styles.setupButton, { backgroundColor: theme.colors.cardSurface }]}
              onPress={() => {
                setShowSetupModal(false);
                onExit?.();
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.setupButtonText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.setupButton,
                { backgroundColor: theme.colors.danger },
                (!permissionsGranted || !streamTitle.trim() || !isConnected || requestingPermissions) ? { opacity: 0.5 } : null,
              ]}
              onPress={handleStartStream}
              activeOpacity={0.85}
              disabled={!permissionsGranted || !streamTitle.trim() || !isConnected || requestingPermissions}
            >
              <Text style={[styles.setupButtonText, { color: '#fff' }]}>Go Live</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Already Live Modal */}
      <Modal
        visible={showAlreadyLiveModal}
        onRequestClose={() => setShowAlreadyLiveModal(false)}
      >
        <View style={styles.setupModalBody}>
          <View style={styles.alreadyLiveHeader}>
            <Text style={styles.alreadyLiveIcon}>📡</Text>
            <Text style={[styles.setupTitle, { color: theme.colors.textPrimary, marginTop: 12 }]}>Already Streaming</Text>
            <Text style={[styles.setupSubtitle, { color: theme.colors.textSecondary }]}>
              You're already live on another device or browser
            </Text>
          </View>

          <View style={styles.alreadyLiveOptions}>
            <View style={[styles.optionCard, { backgroundColor: theme.colors.accent + '20' }]}>
              <Text style={styles.optionIcon}>📱</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>Resume on This Device</Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.textSecondary }]}>
                  Continue your stream from this device
                </Text>
              </View>
            </View>

            <View style={[styles.optionCard, { backgroundColor: '#FCD34D20' }]}>
              <Text style={styles.optionIcon}>⚠️</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>End Other Stream</Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.textSecondary }]}>
                  Stop streaming on the other device and start here
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.alreadyLiveButtons}>
            <TouchableOpacity
              style={[styles.alreadyLiveButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleResumeHere}
              activeOpacity={0.85}
            >
              <Text style={styles.alreadyLiveButtonIcon}>📱</Text>
              <Text style={styles.alreadyLiveButtonText}>Resume on This Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alreadyLiveButton, { backgroundColor: theme.colors.danger }]}
              onPress={handleEndOtherAndStartHere}
              activeOpacity={0.85}
            >
              <Text style={styles.alreadyLiveButtonIcon}>🛑</Text>
              <Text style={styles.alreadyLiveButtonText}>End Other & Start Here</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alreadyLiveCancelButton, { backgroundColor: theme.colors.cardSurface }]}
              onPress={() => {
                setShowAlreadyLiveModal(false);
                setShowSetupModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.alreadyLiveCancelButtonText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goLiveButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  videoStage: {
    flex: 1,
    backgroundColor: '#000',
  },
  chatOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 18,
  },
  controlOverlay: {
    position: 'absolute',
    zIndex: 19,
  },
  videoTopShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 112,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoBottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  topOverlayRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topOverlayCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamerPill: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  streamerPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 210,
  },
  streamerAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  streamerAvatar: {
    width: 28,
    height: 28,
  },
  streamerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  streamerTextWrap: {
    minWidth: 0,
  },
  streamerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    maxWidth: 160,
  },
  streamerTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 200,
  },
  streamerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  liveStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveStatusActive: {
    backgroundColor: 'rgba(239,68,68,0.35)',
    borderColor: 'rgba(239,68,68,0.7)',
  },
  liveStatusIdle: {
    backgroundColor: 'rgba(75,85,99,0.45)',
    borderColor: 'rgba(156,163,175,0.5)',
  },
  liveStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  streamerStatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streamerStatValue: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '800',
  },
  dotSep: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    fontWeight: '800',
    marginTop: -1,
  },
  viewerCountPill: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  liveErrorBanner: {
    position: 'absolute',
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.6)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveErrorTitle: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  liveErrorText: {
    color: '#ffe4e6',
    fontSize: 12,
    fontWeight: '600',
  },
  topOverlayRight: {
    alignItems: 'flex-end',
    position: 'relative',
    minWidth: 96,
  },
  gifterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gifterBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifterAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  gifterAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  giftTicker: {
    position: 'absolute',
    right: 12,
    width: 220,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 19,
  },
  giftTickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  giftTickerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  giftTickerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  giftTickerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  giftTickerUser: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  giftTickerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  closeButtonWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shareButtonWrap: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupModalBody: {
    gap: 12,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  setupSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  setupButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  setupButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  videoStageInner: {
    flex: 1,
    backgroundColor: '#000',
  },
  controlBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  controlButtonMuted: {
    backgroundColor: 'rgba(239,68,68,0.28)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  endButton: {
    backgroundColor: 'rgba(239,68,68,0.4)',
    borderColor: 'rgba(239,68,68,0.7)',
  },
  primaryGoLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  primaryGoLiveLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingBottom: 10,
    gap: 10,
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  systemMessageWrap: {
    paddingHorizontal: 12,
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageRow: {
    width: '100%',
  },
  bubbleAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 2,
  },
  messageAvatar: {
    width: 28,
    height: 28,
  },
  messageAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleContent: {
    flex: 1,
    minWidth: 0,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  messageUsername: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  messageTime: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
  messageStatusFailed: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '700',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  levelPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
  },
  messageTextInline: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  // Already Live Modal Styles
  alreadyLiveHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  alreadyLiveIcon: {
    fontSize: 48,
  },
  alreadyLiveOptions: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  optionIcon: {
    fontSize: 24,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  alreadyLiveButtons: {
    gap: 12,
  },
  alreadyLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  alreadyLiveButtonIcon: {
    fontSize: 18,
  },
  alreadyLiveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  alreadyLiveCancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  alreadyLiveCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

