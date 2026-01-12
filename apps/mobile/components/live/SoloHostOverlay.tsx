import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChatOverlay, { ChatMessage } from './ChatOverlay';
import TopGifterBubbles, { TopGifter } from './TopGifterBubbles';
import HostControlsBar from './HostControlsBar';
import {
  SettingsSheet,
  GuestsSheet,
  BattleSheet,
  CoHostSheet,
  FiltersSheet,
  ShareSheet,
  ViewersSheet,
  GiftersSheet,
} from './sheets/HostSheets';

export interface SoloHostOverlayProps {
  // Host info
  hostName: string;
  hostAvatarUrl?: string;
  title: string;
  category?: string;
  
  // Counters
  viewerCount: number;
  likesCount?: number;
  
  // Data
  topGifters: TopGifter[];
  messages: ChatMessage[];
  
  // UI state
  isMuted: boolean;
  isCameraFlipped: boolean;
  
  // Handlers (placeholder)
  onEndStream: () => void;
  onShare?: () => void;
  onFlipCamera?: () => void;
  onToggleMute?: () => void;
}

const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/40/6366F1/FFFFFF?text=H';

export default function SoloHostOverlay({
  hostName,
  hostAvatarUrl,
  title,
  category,
  viewerCount,
  likesCount = 0,
  topGifters,
  messages,
  isMuted,
  isCameraFlipped,
  onEndStream,
  onShare,
  onFlipCamera,
  onToggleMute,
}: SoloHostOverlayProps) {
  const insets = useSafeAreaInsets();
  
  // Sheet visibility states
  const [showSettings, setShowSettings] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [showCoHost, setShowCoHost] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showGifters, setShowGifters] = useState(false);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* A. Top Gradient Overlay (black → transparent) */}
      <View style={[styles.topGradient, { paddingTop: insets.top }]} pointerEvents="none">
        <View style={styles.gradientLayer1} />
        <View style={styles.gradientLayer2} />
        <View style={styles.gradientLayer3} />
      </View>

      {/* B. Bottom Gradient Overlay (black → transparent) */}
      <View style={[styles.bottomGradient, { paddingBottom: insets.bottom }]} pointerEvents="none">
        <View style={styles.bottomGradientLayer1} />
        <View style={styles.bottomGradientLayer2} />
        <View style={styles.bottomGradientLayer3} />
      </View>

      {/* C. Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Left: Host info */}
        <View style={styles.hostInfo}>
          <View style={styles.hostBubble}>
            <Image
              source={{ uri: hostAvatarUrl || PLACEHOLDER_AVATAR }}
              style={styles.hostAvatar}
            />
            <View style={styles.hostText}>
              <Text style={styles.hostName} numberOfLines={1}>
                {hostName}
              </Text>
              <View style={styles.hostMeta}>
                {/* LIVE indicator */}
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                {/* Category pill */}
                {category && (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Center: Viewer count */}
        <Pressable
          onPress={() => setShowViewers(true)}
          style={({ pressed }) => [
            styles.viewerBadge,
            pressed && styles.viewerBadgePressed,
          ]}
        >
          <Ionicons name="eye" size={16} color="#FFFFFF" />
          <Text style={styles.viewerCount}>{viewerCount.toLocaleString()}</Text>
        </Pressable>

        {/* Right: Actions */}
        <View style={styles.topActions}>
          <Pressable
            onPress={onEndStream}
            style={({ pressed }) => [
              styles.exitButton,
              pressed && styles.exitButtonPressed,
            ]}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* D. Second Row: Top Gifters + Share */}
      <View style={[styles.secondRow, { top: insets.top + 60 }]}>
        {/* Stream title on left */}
        <View style={styles.titleContainer}>
          {title ? (
            <Text style={styles.streamTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* Top gifters on right */}
        <View style={styles.secondRowRight}>
          <TopGifterBubbles
            gifters={topGifters}
            onPress={() => setShowGifters(true)}
          />
          <Pressable
            onPress={() => setShowShare(true)}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.shareButtonPressed,
            ]}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* E. Chat Overlay (above bottom bar) */}
      <View style={[styles.chatContainer, { bottom: insets.bottom + 80 }]}>
        <ChatOverlay messages={messages} />
      </View>

      {/* F. Bottom Host Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 8 }]}>
        <HostControlsBar
          onBattle={() => setShowBattle(true)}
          onCoHost={() => setShowCoHost(true)}
          onGuests={() => setShowGuests(true)}
          onSettings={() => setShowSettings(true)}
          onFilters={() => setShowFilters(true)}
        />
      </View>

      {/* Modal Sheets */}
      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      <GuestsSheet visible={showGuests} onClose={() => setShowGuests(false)} />
      <BattleSheet visible={showBattle} onClose={() => setShowBattle(false)} />
      <CoHostSheet visible={showCoHost} onClose={() => setShowCoHost(false)} />
      <FiltersSheet visible={showFilters} onClose={() => setShowFilters(false)} />
      <ShareSheet visible={showShare} onClose={() => setShowShare(false)} />
      <ViewersSheet visible={showViewers} onClose={() => setShowViewers(false)} viewerCount={viewerCount} />
      <GiftersSheet visible={showGifters} onClose={() => setShowGifters(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Top gradient layers (simulating gradient without expo-linear-gradient)
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  gradientLayer2: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gradientLayer3: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // Bottom gradient layers
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  bottomGradientLayer1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  bottomGradientLayer2: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomGradientLayer3: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 20,
  },
  hostInfo: {
    flex: 1,
    maxWidth: '45%',
  },
  hostBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 8,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  hostText: {
    flex: 1,
  },
  hostName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Viewer badge
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  viewerBadgePressed: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Top actions
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonPressed: {
    backgroundColor: 'rgba(239,68,68,0.8)',
  },

  // Second row
  secondRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  streamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  secondRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonPressed: {
    backgroundColor: 'rgba(99,102,241,0.8)',
  },

  // Chat container
  chatContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 180,
    zIndex: 15,
  },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
