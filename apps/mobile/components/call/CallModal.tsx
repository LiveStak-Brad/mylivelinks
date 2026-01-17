import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { VideoView } from '@livekit/react-native';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { brand } from '../../theme/colors';
import WatchGiftModal from '../watch/WatchGiftModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type CallMode = 'voice' | 'video';

export interface CallModalProps {
  visible: boolean;
  onClose: () => void;
  onMinimize: () => void;
  callMode: CallMode;
  remoteUserId: string;
  remoteUsername: string;
  remoteDisplayName: string;
  remoteAvatarUrl: string | null;
  localAvatarUrl: string | null;
  callDuration?: number;
  isConnected?: boolean;
  isConnecting?: boolean;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  isCameraOn?: boolean;
  localVideoTrack?: LocalVideoTrack | null;
  remoteVideoTrack?: RemoteVideoTrack | null;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  onToggleCamera?: () => void;
  onEndCall?: () => void;
}

const NO_PROFILE_PIC = require('../../assets/no-profile-pic.png');

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CallModal({
  visible,
  onClose,
  onMinimize,
  callMode,
  remoteUserId,
  remoteUsername,
  remoteDisplayName,
  remoteAvatarUrl,
  localAvatarUrl,
  callDuration = 0,
  isConnected = false,
  isConnecting = false,
  isMuted = false,
  isSpeakerOn = true,
  isCameraOn = true,
  localVideoTrack,
  remoteVideoTrack,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onEndCall,
}: CallModalProps) {
  const insets = useSafeAreaInsets();
  const [showGiftModal, setShowGiftModal] = useState(false);
  
  const isVideo = callMode === 'video';
  const hasLocalVideo = isVideo && localVideoTrack && isCameraOn;
  const hasRemoteVideo = isVideo && remoteVideoTrack;

  const handleEndCall = useCallback(() => {
    onEndCall?.();
    onClose();
  }, [onEndCall, onClose]);

  const localAvatarSource = localAvatarUrl?.trim()
    ? { uri: localAvatarUrl }
    : NO_PROFILE_PIC;

  const remoteAvatarSource = remoteAvatarUrl?.trim()
    ? { uri: remoteAvatarUrl }
    : NO_PROFILE_PIC;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleEndCall}
    >
      <View style={styles.container}>
        {/* Full-screen video background */}
        {hasLocalVideo && !hasRemoteVideo && (
          <View style={styles.fullScreenVideo}>
            <VideoView
              style={styles.videoFill}
              videoTrack={localVideoTrack}
              mirror={true}
            />
          </View>
        )}
        
        {hasRemoteVideo && (
          <View style={styles.fullScreenVideo}>
            <VideoView
              style={styles.videoFill}
              videoTrack={remoteVideoTrack}
              mirror={false}
            />
          </View>
        )}
        
        {/* Fallback: show avatar if no video */}
        {!hasLocalVideo && !hasRemoteVideo && (
          <View style={styles.avatarBackground}>
            <Image source={remoteAvatarSource} style={styles.avatarLarge} />
            <Text style={styles.remoteNameText}>{remoteDisplayName}</Text>
            <Text style={styles.remoteUsernameText}>@{remoteUsername}</Text>
          </View>
        )}
        
        {/* Local video PiP (when remote video is showing) */}
        {hasRemoteVideo && hasLocalVideo && (
          <View style={[styles.localPip, { top: insets.top + 60 }]}>
            <VideoView
              style={styles.pipVideo}
              videoTrack={localVideoTrack}
              mirror={true}
            />
          </View>
        )}

        {/* Floating Header */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.callTypeBadge, isVideo ? styles.videoBadge : styles.voiceBadge]}>
              <Feather name={isVideo ? 'video' : 'phone'} size={12} color="#FFFFFF" />
              <Text style={styles.callTypeText}>
                {isVideo ? 'Video' : 'Voice'}
              </Text>
            </View>
          </View>
          <View style={styles.headerCenter}>
            {isConnected ? (
              <View style={styles.durationPill}>
                <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
              </View>
            ) : isConnecting ? (
              <View style={styles.connectingPill}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            ) : (
              <View style={styles.connectingPill}>
                <Text style={styles.connectingText}>Calling...</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minimize call"
              onPress={onMinimize}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            >
              <Feather name="minimize-2" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Floating Controls */}
        <View style={[styles.floatingControls, { paddingBottom: insets.bottom + 24 }]}>
          {/* Mute Mic */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            onPress={onToggleMute}
            style={({ pressed }) => [
              styles.controlBtn,
              isMuted && styles.controlBtnActive,
              pressed && styles.controlBtnPressed,
            ]}
          >
            <Feather name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
          </Pressable>

          {/* Speaker */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
            onPress={onToggleSpeaker}
            style={({ pressed }) => [
              styles.controlBtn,
              !isSpeakerOn && styles.controlBtnActive,
              pressed && styles.controlBtnPressed,
            ]}
          >
            <Feather name={isSpeakerOn ? 'volume-2' : 'volume-x'} size={24} color="#FFFFFF" />
          </Pressable>

          {/* Toggle Camera (Video mode only) */}
          {isVideo && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              onPress={onToggleCamera}
              style={({ pressed }) => [
                styles.controlBtn,
                !isCameraOn && styles.controlBtnActive,
                pressed && styles.controlBtnPressed,
              ]}
            >
              <Feather name={isCameraOn ? 'video' : 'video-off'} size={24} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Gift Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send gift"
            onPress={() => setShowGiftModal(true)}
            style={({ pressed }) => [
              styles.controlBtn,
              styles.giftBtn,
              pressed && styles.controlBtnPressed,
            ]}
          >
            <Feather name="gift" size={24} color="#FFFFFF" />
          </Pressable>

          {/* End Call */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End call"
            onPress={handleEndCall}
            style={({ pressed }) => [
              styles.controlBtn,
              styles.endCallBtn,
              pressed && styles.endCallBtnPressed,
            ]}
          >
            <Feather name="phone-off" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Gift Modal - uses existing WatchGiftModal */}
      <WatchGiftModal
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipientId={remoteUserId}
        recipientUsername={remoteUsername}
        recipientDisplayName={remoteDisplayName}
        recipientAvatarUrl={remoteAvatarUrl}
        isLive={false}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  fullScreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  avatarBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localPip: {
    position: 'absolute',
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  videoBadge: {
    backgroundColor: brand.primary,
  },
  voiceBadge: {
    backgroundColor: brand.secondary,
  },
  callTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  connectingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    opacity: 0.7,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  remoteNameText: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  remoteUsernameText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  floatingControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  controlBtnPressed: {
    opacity: 0.7,
  },
  giftBtn: {
    backgroundColor: brand.primary,
  },
  endCallBtn: {
    backgroundColor: '#EF4444',
  },
  endCallBtnPressed: {
    backgroundColor: '#DC2626',
  },
});
