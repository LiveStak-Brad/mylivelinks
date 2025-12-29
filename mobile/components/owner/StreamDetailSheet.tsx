import React, { useMemo } from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import type { LiveOpsStreamData } from '../../hooks/useOwnerLiveOpsData';

interface StreamDetailSheetProps {
  stream: LiveOpsStreamData;
  visible: boolean;
  onClose: () => void;
}

interface ViewerPreview {
  id: string;
  username: string;
  isGifting: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

const regionLabels: Record<string, string> = {
  'us-east': 'US East',
  'us-west': 'US West',
  'eu-west': 'EU West',
  'ap-south': 'Asia Pacific',
  all: 'Global',
};

export function StreamDetailSheet({ stream, visible, onClose }: StreamDetailSheetProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Mock data for UI
  const mockViewers: ViewerPreview[] = [
    { id: '1', username: 'viewer_123', isGifting: true },
    { id: '2', username: 'fan_user', isGifting: false },
    { id: '3', username: 'supporter_99', isGifting: true },
    { id: '4', username: 'watcher_42', isGifting: false },
  ];

  const mockChat: ChatMessage[] = [
    { id: '1', username: 'viewer_123', message: 'Amazing stream!', timestamp: '2 min ago' },
    { id: '2', username: 'fan_user', message: 'Love this content', timestamp: '3 min ago' },
    { id: '3', username: 'supporter_99', message: 'Keep it up!', timestamp: '5 min ago' },
  ];

  const duration = getStreamDuration(stream.startedAt);

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Stream Details</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Streamer Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>STREAM INFORMATION</Text>
              <View style={styles.streamerCard}>
                <View style={styles.avatarLarge}>
                  <Feather name="user" size={28} color="#fff" />
                </View>
                <View style={styles.streamerInfo}>
                  <View style={styles.streamerRow}>
                    <Text style={styles.streamerName}>{stream.streamer}</Text>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.streamerId}>ID: {stream.streamerId}</Text>
                </View>
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.section}>
              <View style={styles.metricsGrid}>
                {/* Room */}
                <View style={styles.metricCard}>
                  <Feather name="radio" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.metricLabel}>ROOM</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>{stream.room}</Text>
                  {stream.roomId && (
                    <Text style={styles.metricSubtext}>{stream.roomId}</Text>
                  )}
                </View>

                {/* Region */}
                <View style={styles.metricCard}>
                  <Feather name="map-pin" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.metricLabel}>REGION</Text>
                  <Text style={styles.metricValue}>{regionLabels[stream.region]}</Text>
                </View>

                {/* Duration */}
                <View style={styles.metricCard}>
                  <Feather name="clock" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.metricLabel}>DURATION</Text>
                  <Text style={styles.metricValue}>{duration}</Text>
                  <Text style={styles.metricSubtext}>
                    Started {new Date(stream.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Viewers */}
                <View style={[styles.metricCard, styles.metricCardHighlight, { backgroundColor: '#3b82f615', borderColor: '#3b82f630' }]}>
                  <Feather name="eye" size={16} color="#3b82f6" />
                  <Text style={[styles.metricLabel, { color: '#3b82f6' }]}>VIEWERS</Text>
                  <Text style={[styles.metricValueLarge, { color: '#3b82f6' }]}>
                    {stream.viewers.toLocaleString()}
                  </Text>
                </View>

                {/* Gifts */}
                <View style={[styles.metricCard, styles.metricCardHighlight, { backgroundColor: '#a855f715', borderColor: '#a855f730' }]}>
                  <Feather name="gift" size={16} color="#a855f7" />
                  <Text style={[styles.metricLabel, { color: '#a855f7' }]}>GIFTS/MIN</Text>
                  <Text style={[styles.metricValueLarge, { color: '#a855f7' }]}>
                    {stream.giftsPerMin}
                  </Text>
                </View>

                {/* Chat */}
                <View style={[styles.metricCard, styles.metricCardHighlight, { backgroundColor: '#22c55e15', borderColor: '#22c55e30' }]}>
                  <Feather name="message-square" size={16} color="#22c55e" />
                  <Text style={[styles.metricLabel, { color: '#22c55e' }]}>CHAT/MIN</Text>
                  <Text style={[styles.metricValueLarge, { color: '#22c55e' }]}>
                    {stream.chatPerMin}
                  </Text>
                </View>
              </View>
            </View>

            {/* Viewers Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVE VIEWERS ({mockViewers.length})</Text>
              <View style={styles.viewersList}>
                {mockViewers.map((viewer) => (
                  <View key={viewer.id} style={styles.viewerItem}>
                    <View style={styles.viewerAvatar}>
                      <Feather name="user" size={14} color="#fff" />
                    </View>
                    <Text style={styles.viewerName}>{viewer.username}</Text>
                    {viewer.isGifting && (
                      <Feather name="gift" size={14} color="#a855f7" />
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Recent Chat */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RECENT CHAT</Text>
              <View style={styles.chatList}>
                {mockChat.map((msg) => (
                  <View key={msg.id} style={styles.chatItem}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatUsername}>{msg.username}</Text>
                      <Text style={styles.chatTimestamp}>{msg.timestamp}</Text>
                    </View>
                    <Text style={styles.chatMessage}>{msg.message}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>STREAM ACTIONS</Text>
              
              <Button
                title="End Stream"
                variant="primary"
                onPress={() => {}}
                disabled
                style={[styles.actionButton, { opacity: 0.5 }]}
                icon={<Feather name="stop-circle" size={18} color="#fff" />}
              />
              <Text style={styles.actionHint}>Backend wiring required</Text>

              <Button
                title="Mute Chat"
                variant="secondary"
                onPress={() => {}}
                disabled
                style={[styles.actionButton, { opacity: 0.5 }]}
                icon={<Feather name="volume-2" size={18} color={theme.colors.text} />}
              />
              <Text style={styles.actionHint}>Backend wiring required</Text>

              <Button
                title="Throttle Gifts"
                variant="secondary"
                onPress={() => {}}
                disabled
                style={[styles.actionButton, { opacity: 0.5 }]}
                icon={<Feather name="trending-down" size={18} color={theme.colors.text} />}
              />
              <Text style={styles.actionHint}>Backend wiring required</Text>

              <View style={styles.infoBox}>
                <Feather name="info" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                  Action buttons will be functional once backend endpoints are wired
                </Text>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function getStreamDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  }
  return `${diffMins}m`;
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.tokens.surfaceModal,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 20,
      gap: 12,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 4,
    },
    streamerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarLarge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streamerInfo: {
      flex: 1,
      gap: 4,
    },
    streamerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    streamerName: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#ef444415',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ef4444',
    },
    liveBadgeText: {
      color: '#ef4444',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    streamerId: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontFamily: 'monospace',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      minWidth: '47%',
      padding: 12,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    metricCardHighlight: {
      borderWidth: 1,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    metricValueLarge: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    metricSubtext: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    viewersList: {
      gap: 8,
    },
    viewerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      minHeight: 44,
    },
    viewerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    chatList: {
      gap: 8,
    },
    chatItem: {
      padding: 12,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      gap: 6,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chatUsername: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    chatTimestamp: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    chatMessage: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    actionButton: {
      marginBottom: 4,
    },
    actionHint: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      marginBottom: 12,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      backgroundColor: '#3b82f615',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3b82f630',
      marginTop: 8,
    },
    infoText: {
      flex: 1,
      color: '#3b82f6',
      fontSize: 12,
      lineHeight: 18,
    },
  });
}

