import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
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
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  isCameraOn?: boolean;
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
  isMuted = false,
  isSpeakerOn = true,
  isCameraOn = true,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onEndCall,
}: CallModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [showGiftModal, setShowGiftModal] = useState(false);

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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 8 : 16 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.callTypeBadge, callMode === 'video' ? styles.videoBadge : styles.voiceBadge]}>
              <Feather name={callMode === 'video' ? 'video' : 'phone'} size={12} color="#FFFFFF" />
              <Text style={styles.callTypeText}>
                {callMode === 'video' ? 'Video Call' : 'Voice Call'}
              </Text>
            </View>
          </View>
          <View style={styles.headerCenter}>
            {isConnected && (
              <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
            )}
            {!isConnected && (
              <Text style={styles.connectingText}>Connecting...</Text>
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

        {/* Video Tiles Container */}
        <View style={styles.tilesContainer}>
          {/* Top Tile: Local Preview (Self) */}
          <View style={styles.localTile}>
            {callMode === 'video' && isCameraOn ? (
              <View style={styles.videoPlaceholder}>
                <Image source={localAvatarSource} style={styles.avatarLarge} />
                <Text style={styles.cameraOffText}>Camera Preview</Text>
              </View>
            ) : (
              <View style={styles.avatarTile}>
                <Image source={localAvatarSource} style={styles.avatarLarge} />
                <Text style={styles.youLabel}>You</Text>
              </View>
            )}
          </View>

          {/* Bottom Tile: Remote Video (Other Person) */}
          <View style={styles.remoteTile}>
            {callMode === 'video' ? (
              <View style={styles.videoPlaceholder}>
                <Image source={remoteAvatarSource} style={styles.avatarLarge} />
                <Text style={styles.remoteNameText}>{remoteDisplayName}</Text>
                <Text style={styles.remoteUsernameText}>@{remoteUsername}</Text>
              </View>
            ) : (
              <View style={styles.avatarTile}>
                <Image source={remoteAvatarSource} style={styles.avatarLarge} />
                <Text style={styles.remoteNameText}>{remoteDisplayName}</Text>
                <Text style={styles.remoteUsernameText}>@{remoteUsername}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Control Row */}
        <View style={[styles.controlRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }]}>
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
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </Pressable>

          {/* Speaker */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
            onPress={onToggleSpeaker}
            style={({ pressed }) => [
              styles.controlBtn,
              isSpeakerOn && styles.controlBtnActive,
              pressed && styles.controlBtnPressed,
            ]}
          >
            <Feather name={isSpeakerOn ? 'volume-2' : 'volume-x'} size={24} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
          </Pressable>

          {/* Toggle Camera (Video mode only) */}
          {callMode === 'video' && (
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
              <Text style={styles.controlLabel}>{isCameraOn ? 'Cam On' : 'Cam Off'}</Text>
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
            <Text style={styles.controlLabel}>Gift</Text>
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
            <Text style={styles.controlLabel}>End</Text>
          </Pressable>
        </View>
      </SafeAreaView>

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
  header: {
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
  durationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectingText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    opacity: 0.7,
  },
  tilesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  localTile: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  remoteTile: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  avatarTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  youLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraOffText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  remoteNameText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  remoteUsernameText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  controlRow: {
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
    width: 60,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  controlBtnPressed: {
    opacity: 0.7,
  },
  controlLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
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
