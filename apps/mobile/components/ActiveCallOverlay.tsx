/**
 * ActiveCallOverlay - Full-screen overlay for active/connecting call
 */

import React from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView } from '@livekit/react-native';
import { LocalVideoTrack } from 'livekit-client';
import { CallParticipant, CallState, CallType } from '../hooks/useCallSession';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NO_PROFILE_PIC = require('../assets/no-profile-pic.png');

interface ActiveCallOverlayProps {
  callState: CallState;
  callType: CallType | null;
  remoteParticipant: CallParticipant | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
  localVideoTrack: LocalVideoTrack | null;
  callDuration: number;
  error: string | null;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export default function ActiveCallOverlay({
  callState,
  callType,
  remoteParticipant,
  isMicEnabled,
  isCameraEnabled,
  isSpeakerEnabled,
  localVideoTrack,
  callDuration,
  error,
  onToggleMic,
  onToggleCam,
  onToggleSpeaker,
  onEndCall,
}: ActiveCallOverlayProps) {
  const insets = useSafeAreaInsets();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const avatarSource = remoteParticipant?.avatarUrl
    ? { uri: remoteParticipant.avatarUrl }
    : NO_PROFILE_PIC;

  const isConnecting = callState === 'connecting' || callState === 'outgoing_invite';
  const isVideo = callType === 'video';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Video preview (local) */}
      {isVideo && localVideoTrack && isCameraEnabled && (
        <View style={styles.localVideoContainer}>
          <VideoView
            style={styles.localVideo}
            videoTrack={localVideoTrack}
            mirror={true}
          />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.callerName}>
          {remoteParticipant?.username || 'Unknown'}
        </Text>
        {isConnecting ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#9CA3AF" />
            <Text style={styles.statusText}>
              {callState === 'outgoing_invite' ? 'Calling...' : 'Connecting...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Center content - avatar for voice calls */}
      {!isVideo && (
        <View style={styles.centerContent}>
          <Image source={avatarSource} style={styles.avatar} />
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.controlsRow}>
          {/* Mute */}
          <Pressable
            style={[styles.controlButton, !isMicEnabled && styles.controlButtonActive]}
            onPress={onToggleMic}
          >
            <Feather
              name={isMicEnabled ? 'mic' : 'mic-off'}
              size={24}
              color={isMicEnabled ? '#FFFFFF' : '#1F2937'}
            />
          </Pressable>

          {/* Speaker */}
          <Pressable
            style={[styles.controlButton, !isSpeakerEnabled && styles.controlButtonActive]}
            onPress={onToggleSpeaker}
          >
            <Feather
              name={isSpeakerEnabled ? 'volume-2' : 'volume-x'}
              size={24}
              color={isSpeakerEnabled ? '#FFFFFF' : '#1F2937'}
            />
          </Pressable>

          {/* Camera (video calls only) */}
          {isVideo && (
            <Pressable
              style={[styles.controlButton, !isCameraEnabled && styles.controlButtonActive]}
              onPress={onToggleCam}
            >
              <Feather
                name={isCameraEnabled ? 'video' : 'video-off'}
                size={24}
                color={isCameraEnabled ? '#FFFFFF' : '#1F2937'}
              />
            </Pressable>
          )}
        </View>

        {/* End call */}
        <Pressable style={styles.endCallButton} onPress={onEndCall}>
          <Feather name="phone-off" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1F2937',
    zIndex: 9999,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  durationText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
