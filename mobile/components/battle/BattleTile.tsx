/**
 * BattleTile - Mobile video tile for battle participants
 * React Native version using react-native-webrtc or LiveKit
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { BattleParticipant, BattleSide } from '../../types/battle';

interface BattleTileProps {
  participant: BattleParticipant;
  side: BattleSide;
  sideColor: string;
  isTeamLeader?: boolean;
}

export const BattleTile: React.FC<BattleTileProps> = ({ 
  participant, 
  side, 
  sideColor,
  isTeamLeader = false,
}) => {
  const [hasVideo, setHasVideo] = useState(false);

  // TODO: Attach LiveKit video track when available
  useEffect(() => {
    if (participant.video_track) {
      setHasVideo(true);
    }
  }, [participant.video_track]);

  return (
    <View style={styles.container}>
      {/* Video or Avatar */}
      {hasVideo ? (
        <View style={styles.videoContainer}>
          {/* TODO: Replace with actual LiveKit VideoView component */}
          <Text style={styles.videoPlaceholder}>📹 Video</Text>
        </View>
      ) : (
        <View style={styles.avatarContainer}>
          {participant.avatar_url ? (
            <Image 
              source={{ uri: participant.avatar_url }} 
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {participant.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Team Leader Badge */}
      {isTeamLeader && (
        <View style={[styles.leaderBadge, { backgroundColor: sideColor }]}>
          <Text style={styles.leaderText}>★ LEADER</Text>
        </View>
      )}

      {/* Side Indicator */}
      <View 
        style={[
          styles.sideIndicator,
          { backgroundColor: sideColor, borderColor: '#fff' }
        ]}
      >
        <Text style={styles.sideText}>{side}</Text>
      </View>

      {/* Username Overlay */}
      <View style={styles.usernameOverlay}>
        <Text style={styles.username} numberOfLines={1}>
          {participant.username}
        </Text>
        <View style={styles.statusRow}>
          {!participant.is_camera_enabled && (
            <Text style={styles.statusIcon}>📷 Off</Text>
          )}
          {!participant.is_mic_enabled && (
            <Text style={styles.statusIcon}>🔇</Text>
          )}
        </View>
      </View>

      {/* Platform Badge */}
      <View style={styles.platformBadge}>
        <Text style={styles.platformText}>
          {participant.platform === 'web' ? '💻' : '📱'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  leaderBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  leaderText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sideIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  usernameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  username: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusIcon: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  platformBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformText: {
    fontSize: 10,
  },
});

