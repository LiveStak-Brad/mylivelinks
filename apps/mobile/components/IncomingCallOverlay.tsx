/**
 * IncomingCallOverlay - Full-screen overlay for incoming call
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CallParticipant, CallType } from '../hooks/useCallSession';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NO_PROFILE_PIC = require('../assets/no-profile-pic.png');

interface IncomingCallOverlayProps {
  callType: CallType | null;
  remoteParticipant: CallParticipant | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallOverlay({
  callType,
  remoteParticipant,
  onAccept,
  onDecline,
}: IncomingCallOverlayProps) {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const avatarSource = remoteParticipant?.avatarUrl
    ? { uri: remoteParticipant.avatarUrl }
    : NO_PROFILE_PIC;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Image source={avatarSource} style={styles.avatar} />
        </Animated.View>

        <Text style={styles.callerName}>
          {remoteParticipant?.username || 'Unknown'}
        </Text>

        <Text style={styles.callTypeText}>
          Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
        </Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 40 }]}>
        <Pressable
          style={[styles.actionButton, styles.declineButton]}
          onPress={onDecline}
        >
          <Feather name="phone-off" size={32} color="#FFFFFF" />
          <Text style={styles.actionLabel}>Decline</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.acceptButton]}
          onPress={onAccept}
        >
          <Feather name={callType === 'video' ? 'video' : 'phone'} size={32} color="#FFFFFF" />
          <Text style={styles.actionLabel}>Accept</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#374151',
    padding: 4,
    marginBottom: 24,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 68,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callTypeText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    position: 'absolute',
    bottom: -24,
  },
});
