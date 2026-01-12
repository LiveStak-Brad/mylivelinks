import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChatOverlay, { ChatMessage, ChatFontColor } from './ChatOverlay';
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
  
  // Chat font color (new spec)
  chatFontColor?: ChatFontColor;
  
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
  chatFontColor = '#FFFFFF',
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
      {/* Top Gradient: darkest at top edge, fading towards center */}
      <View style={styles.topGradient} pointerEvents="none" />

      {/* Bottom Gradient: darkest at bottom edge, fading towards center */}
      <View style={styles.bottomGradient} pointerEvents="none" />

      {/* C. Top Bar - Web parity: Left (avatar+name), Right (viewer near X, then X) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Left: Host info bubble */}
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

        {/* Right cluster: Viewer count + Exit (matches web mobile layout) */}
        <View style={styles.topRightCluster}>
          {/* Viewer count badge - positioned near X on mobile (web parity) */}
          <Pressable
            onPress={() => setShowViewers(true)}
            style={({ pressed }) => [
              styles.viewerBadge,
              pressed && styles.viewerBadgePressed,
            ]}
          >
            <Ionicons name="eye" size={14} color="#FFFFFF" />
            <Text style={styles.viewerCount}>{viewerCount.toLocaleString()}</Text>
          </Pressable>

          {/* Exit button */}
          <Pressable
            onPress={onEndStream}
            style={({ pressed }) => [
              styles.exitButton,
              pressed && styles.exitButtonPressed,
            ]}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* D. Second Row: Stream title left, Top Gifters + Share right (web parity) */}
      <View style={[styles.secondRow, { top: insets.top + 56 }]}>
        {/* Stream title on left */}
        <View style={styles.titleContainer}>
          {title ? (
            <Text style={styles.streamTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* Top gifters + Share on right */}
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
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* E. Chat Overlay (above bottom bar, not overlapping controls) */}
      <View style={[styles.chatContainer, { bottom: insets.bottom + 72 }]}>
        <ChatOverlay messages={messages} fontColor={chatFontColor} />
      </View>

      {/* F. Bottom Host Controls - Order: Battle, CoHost, Guests, Settings, Filters (web parity) */}
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

  // Top gradient: single overlay, darkest at top edge
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Bottom gradient: single overlay, darkest at bottom edge
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // Top bar (web parity: left avatar+name, right viewer+X)
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
    maxWidth: '55%',
  },
  hostBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 6,
    gap: 6,
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  hostText: {
    flex: 1,
  },
  hostName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 2,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Right cluster (viewer + exit) - matches web mobile layout
  topRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Viewer badge (compact for mobile)
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  viewerBadgePressed: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewerCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Exit button
  exitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonPressed: {
    backgroundColor: 'rgba(239,68,68,0.8)',
  },

  // Second row (title left, gifters+share right)
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
    marginRight: 10,
  },
  streamTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  secondRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonPressed: {
    backgroundColor: 'rgba(99,102,241,0.8)',
  },

  // Chat container (positioned above bottom controls, not overlapping)
  chatContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 200,
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
