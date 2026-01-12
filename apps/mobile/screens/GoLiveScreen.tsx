import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { VideoView } from '@livekit/react-native';
import { createLocalVideoTrack, LocalVideoTrack, VideoPresets } from 'livekit-client';
import { useAuth } from '../state/AuthContext';
import { fetchMobileToken, connectAndPublish, disconnectAndCleanup, generateSoloRoomName } from '../lib/livekit';
import type { Room, LocalAudioTrack } from 'livekit-client';

// Request Android permissions (iOS permissions are triggered by camera access)
async function requestAndroidPermissions(): Promise<{ camera: boolean; mic: boolean }> {
  if (Platform.OS !== 'android') {
    // iOS: permissions will be requested when we try to access camera
    return { camera: false, mic: false };
  }
  
  const { PermissionsAndroid } = require('react-native');
  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return {
      camera: grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED,
      mic: grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED,
    };
  } catch (err) {
    console.error('[GoLive] Permission request error:', err);
    return { camera: false, mic: false };
  }
}

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
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  // Preview track state
  const [previewTrack, setPreviewTrack] = useState<LocalVideoTrack | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Go Live state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
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

  // Track if preview is loading
  const [previewLoading, setPreviewLoading] = useState(false);

  // Function to start camera preview
  const startCameraPreview = useCallback(async () => {
    if (previewLoading || previewTrack) return;
    
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      // Small delay to ensure native modules are ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const track = await createLocalVideoTrack({
        facingMode: cameraFacing,
        resolution: VideoPresets.h720.resolution,
      });

      setPreviewTrack(track);
      setCameraGranted(true);
      setMicGranted(true);
      setPreviewError(null);
    } catch (err: any) {
      console.error('[GoLive] Preview error:', err);
      setPreviewError(err?.message || 'Camera access denied. Please enable in Settings.');
      setCameraGranted(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [cameraFacing, previewLoading, previewTrack]);

  // Request Android permissions on mount
  useEffect(() => {
    if (Platform.OS === 'android' && !permissionsRequested) {
      setPermissionsRequested(true);
      requestAndroidPermissions().then(({ camera, mic }) => {
        setCameraGranted(camera);
        setMicGranted(mic);
        // Auto-start preview if Android permissions granted
        if (camera) {
          startCameraPreview();
        }
      });
    }
  }, [permissionsRequested, startCameraPreview]);

  // Handle camera facing change - recreate track
  useEffect(() => {
    if (!previewTrack) return;
    
    // Stop current track and create new one with new facing
    previewTrack.stop();
    setPreviewTrack(null);
    startCameraPreview();
  }, [cameraFacing]); // Intentionally not including other deps to avoid loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTrack) {
        previewTrack.stop();
      }
    };
  }, [previewTrack]);

  // Handle camera flip
  const handleFlipCamera = useCallback(() => {
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Handle permissions request (Enable button tap)
  const handleRequestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const { camera, mic } = await requestAndroidPermissions();
      setCameraGranted(camera);
      setMicGranted(mic);
      if (camera) {
        startCameraPreview();
      }
    } else {
      // iOS: trying to access camera will trigger permission dialog
      startCameraPreview();
    }
  }, [startCameraPreview]);

  // Handle close
  const handleClose = useCallback(() => {
    if (previewTrack) {
      previewTrack.stop();
    }
    navigation.goBack();
  }, [navigation, previewTrack]);

  // Handle Go Live
  const handleGoLive = useCallback(async () => {
    // Validate required fields
    if (!streamTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a stream title.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    if (!audience) {
      Alert.alert('Audience Required', 'Please select an audience.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Not Logged In', 'Please log in to go live.');
      return;
    }
    if (needsPermissions) {
      Alert.alert('Permissions Required', 'Camera and microphone access are required to go live.');
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      // Stop preview track before connecting
      if (previewTrack) {
        previewTrack.stop();
        setPreviewTrack(null);
      }

      // Generate room name
      const roomName = generateSoloRoomName(user.id);
      const userName = user.email?.split('@')[0] || 'Host';

      // Fetch token from Edge Function
      const { token, url } = await fetchMobileToken(roomName, user.id, userName, true);

      // Connect and publish
      const { room, videoTrack, audioTrack } = await connectAndPublish(url, token, true);
      roomRef.current = room;

      // Navigate to live screen with params
      navigation.navigate('LiveScreen', {
        roomName,
        title: streamTitle.trim(),
        category: selectedCategoryId,
        audience,
        isHost: true,
      });

    } catch (err: any) {
      console.error('[GoLive] Connect error:', err);
      setConnectError(err.message || 'Failed to go live. Please try again.');
      Alert.alert('Connection Failed', err.message || 'Failed to go live. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [streamTitle, selectedCategoryId, audience, user, needsPermissions, previewTrack, navigation]);

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <View style={styles.cameraPreview}>
        {previewTrack ? (
          <VideoView
            style={styles.videoView}
            videoTrack={previewTrack}
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

        {/* Permissions Banner - shown in preview area */}
        {needsPermissions && (
          <View style={[styles.permissionsBanner, { top: insets.top + 60 }]}>
            <View style={styles.permissionsContent}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.warning} />
              <View style={styles.permissionsText}>
                <Text style={styles.permissionsTitle}>Permissions needed</Text>
                <Text style={styles.permissionsHint}>
                  {!cameraGranted && !micGranted
                    ? 'Camera & microphone access required'
                    : !cameraGranted
                    ? 'Camera access required'
                    : 'Microphone access required'}
                </Text>
              </View>
              <Pressable
                onPress={handleRequestPermissions}
                style={({ pressed }) => [styles.permissionsButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.permissionsButtonText}>Enable</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Top Controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={COLORS.white} />
        </Pressable>

        <View style={styles.topSpacer} />

        <Pressable
          onPress={handleFlipCamera}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Setup Modal Overlay - Positioned higher */}
      <View style={styles.modalOverlay}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Go Live</Text>
        </View>

        <View style={styles.modalContent}>
          {/* Title + Thumbnail Row */}
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
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.thumbnailButton, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Add thumbnail"
            >
              <Ionicons name="image-outline" size={18} color={COLORS.mutedText} />
            </Pressable>
          </View>

          {/* Category - Horizontal Slider */}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${c.label}`}
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
              <Ionicons
                name="globe-outline"
                size={14}
                color={audience === 'Public' ? COLORS.white : COLORS.mutedText}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentText, audience === 'Public' && styles.segmentTextActive]}>Public</Text>
            </Pressable>
            <Pressable
              onPress={() => setAudience('Team')}
              style={[styles.segmentButton, audience === 'Team' && styles.segmentButtonActive]}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={audience === 'Team' ? COLORS.white : COLORS.mutedText}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentText, audience === 'Team' && styles.segmentTextActive]}>Team</Text>
            </Pressable>
          </View>
        </View>

        {/* Go Live Button */}
        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
          {connectError && (
            <Text style={styles.errorText}>{connectError}</Text>
          )}
          <Pressable
            onPress={handleGoLive}
            disabled={isConnecting}
            style={({ pressed }) => [
              styles.goLiveButton, 
              pressed && styles.goLiveButtonPressed,
              isConnecting && styles.goLiveButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
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
  error: '#EF4444',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Camera Preview
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

  // Permissions Banner
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

  // Top Bar
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

  // Modal Overlay - Centered/Higher position
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

  // Title + Thumbnail Row
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

  // Category Slider
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

  // Audience
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

  // Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 8,
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
    opacity: 0.6,
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
});
