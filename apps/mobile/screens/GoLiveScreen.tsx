import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { VideoView } from '@livekit/react-native';
import { createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack, VideoPresets, Room, RoomEvent } from 'livekit-client';
import { useAuth } from '../state/AuthContext';
import { fetchMobileToken, generateSoloRoomName, startLiveStreamRecord, endLiveStreamRecord } from '../lib/livekit';

import SoloHostOverlay from '../components/live/SoloHostOverlay';
import type { ChatMessage, ChatFontColor } from '../components/live/ChatOverlay';
import type { TopGifter } from '../components/live/TopGifterBubbles';

// ============================================================================
// MOCK DATA - Top gifters and chat messages for overlay (UI-only)
// ============================================================================

const MOCK_TOP_GIFTERS: TopGifter[] = [
  { id: '1', username: 'BigSpender', avatarUrl: 'https://i.pravatar.cc/100?u=bigspender', totalCoins: 5000 },
  { id: '2', username: 'GenGifter', avatarUrl: 'https://i.pravatar.cc/100?u=gengifter', totalCoins: 2500 },
  { id: '3', username: 'CoinKing', avatarUrl: 'https://i.pravatar.cc/100?u=coinking', totalCoins: 1200 },
];

const MOCK_CHAT_FONT_COLOR: ChatFontColor = '#FFFFFF';

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', type: 'system', username: 'System', text: 'Stream started' },
  { id: '2', type: 'follow', username: 'NewFollower123', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=newfollower123' },
  { id: '3', type: 'chat', username: 'CoolViewer', text: 'Hey! Great stream!', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '4', type: 'chat', username: 'MusicFan', text: 'Love this vibe 🔥', avatarUrl: 'https://i.pravatar.cc/100?u=musicfan' },
  { id: '5', type: 'gift', username: 'BigSpender', text: 'sent a Rose', giftAmount: 100, avatarUrl: 'https://i.pravatar.cc/100?u=bigspender' },
  { id: '6', type: 'chat', username: 'RandomUser', text: 'First time here, this is awesome!', avatarUrl: 'https://i.pravatar.cc/100?u=randomuser' },
  { id: '7', type: 'chat', username: 'NightOwl', text: 'What city are you in?', avatarUrl: 'https://i.pravatar.cc/100?u=nightowl' },
  { id: '8', type: 'follow', username: 'StreamWatcher', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=streamwatcher' },
  { id: '9', type: 'chat', username: 'CoolViewer', text: 'The quality is so good!', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '10', type: 'gift', username: 'GenGifter', text: 'sent a Diamond', giftAmount: 500, avatarUrl: 'https://i.pravatar.cc/100?u=gengifter' },
  { id: '11', type: 'chat', username: 'MusicFan', text: 'Can you play some jazz?', avatarUrl: 'https://i.pravatar.cc/100?u=musicfan' },
  { id: '12', type: 'chat', username: 'ChillMode', text: '👋👋👋', avatarUrl: 'https://i.pravatar.cc/100?u=chillmode' },
  { id: '13', type: 'chat', username: 'ViewerX', text: 'How long have you been streaming?', avatarUrl: 'https://i.pravatar.cc/100?u=viewerx' },
  { id: '14', type: 'gift', username: 'CoinKing', text: 'sent a Crown', giftAmount: 1000, avatarUrl: 'https://i.pravatar.cc/100?u=coinking' },
  { id: '15', type: 'chat', username: 'NightOwl', text: 'This chat is so chill', avatarUrl: 'https://i.pravatar.cc/100?u=nightowl' },
  { id: '16', type: 'follow', username: 'LateNightFan', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=latenightfan' },
  { id: '17', type: 'chat', username: 'RandomUser', text: 'Followed! Keep it up!', avatarUrl: 'https://i.pravatar.cc/100?u=randomuser' },
  { id: '18', type: 'chat', username: 'CoolViewer', text: 'The lighting is perfect', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '19', type: 'system', username: 'System', text: '100 viewers reached!' },
  { id: '20', type: 'chat', username: 'ChillMode', text: 'Love this community', avatarUrl: 'https://i.pravatar.cc/100?u=chillmode' },
];

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

  // Live state
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const roomRef = useRef<Room | null>(null);

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
      await endLiveStreamRecord(user.id);
    }
    
    navigation.goBack();
  }, [navigation, videoTrack, audioTrack, isLive, user]);

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

      // Create live_streams record in database (makes stream visible on LiveTV)
      // Matches web GoLiveButton.tsx implementation
      const { liveStreamId, error: dbError } = await startLiveStreamRecord(user.id);
      if (dbError) {
        console.warn('[GoLive] DB record warning:', dbError);
        // Continue anyway - stream will work, just may not show on LiveTV immediately
      } else {
        console.log('[GoLive] Created live_stream ID:', liveStreamId);
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

      setIsLive(true);
      console.log('[GoLive] Now live! Stream should appear on LiveTV.');
    } catch (err: any) {
      console.error('[GoLive] Connect error:', err);
      // If we created a DB record but connection failed, clean it up
      if (user?.id) {
        await endLiveStreamRecord(user.id);
      }
      Alert.alert('Connection Failed', err.message || 'Failed to go live.');
    } finally {
      setIsConnecting(false);
    }
  }, [streamTitle, user, needsPermissions, videoTrack, audioTrack]);

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
            await endLiveStreamRecord(user.id);
          }
          
          // Reset all state to initial
          setIsLive(false);
          setViewerCount(0);
          setCameraGranted(false);
          setMicGranted(false);
          setPreviewError(null);
          
          console.log('[GoLive] Stream ended. Tap Enable to start a new preview.');
        },
      },
    ]);
  }, [user, videoTrack, audioTrack]);

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

      {/* Solo Host Overlay - Full UI when live (web parity) */}
      {isLive && (
        <SoloHostOverlay
          hostName={user?.email?.split('@')[0] || 'Host'}
          hostAvatarUrl={undefined}
          title={streamTitle}
          category={categories.find((c) => c.id === selectedCategoryId)?.label}
          viewerCount={viewerCount}
          topGifters={MOCK_TOP_GIFTERS}
          messages={MOCK_MESSAGES}
          isMuted={false}
          isCameraFlipped={cameraFacing === 'environment'}
          chatFontColor={MOCK_CHAT_FONT_COLOR}
          onEndStream={handleEndLive}
          onFlipCamera={handleFlipCamera}
        />
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
