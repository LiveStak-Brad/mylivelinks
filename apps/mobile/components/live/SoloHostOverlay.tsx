import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Pro badge image
const PRO_BADGE_IMAGE = require('../../assets/pro.png');

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
  TrendingSheet,
  LeaderboardSheet,
} from './sheets/HostSheets';

export interface LeaderboardRank {
  currentRank: number;
  pointsToNextRank: number;
}

export interface SoloHostOverlayProps {
  // Host info
  hostName: string;
  hostAvatarUrl?: string;
  isPro?: boolean;
  
  // Counters
  viewerCount: number;
  likesCount?: number;
  
  // Ranking data (like web)
  trendingRank?: number;
  leaderboardRank?: LeaderboardRank;
  
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
  isPro = false,
  viewerCount,
  likesCount = 0,
  trendingRank,
  leaderboardRank,
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
  const [showTrending, setShowTrending] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <View style={styles.container} pointerEvents="box-none">
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
              <View style={styles.hostNameRow}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {hostName}
                </Text>
                {isPro && (
                  <Image source={PRO_BADGE_IMAGE} style={styles.proBadgeImage} resizeMode="contain" />
                )}
              </View>
              {/* Trending + Leaderboard row (like web) */}
              <View style={styles.rankRow}>
                <Pressable
                  onPress={() => setShowTrending(true)}
                  style={styles.rankButton}
                >
                  <Ionicons name="flame" size={14} color="#F97316" />
                  <Text style={styles.rankText}>{trendingRank ?? 0}</Text>
                </Pressable>
                <Text style={styles.rankDot}>•</Text>
                <Pressable
                  onPress={() => setShowLeaderboard(true)}
                  style={styles.rankButton}
                >
                  <Ionicons name="trophy" size={14} color="#EAB308" />
                  <Text style={styles.rankText}>{leaderboardRank?.currentRank ?? 0}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          {/* Leaderboard badge below bubble (like web) */}
          {leaderboardRank && leaderboardRank.currentRank > 0 && leaderboardRank.currentRank <= 100 && (
            <Pressable 
              onPress={() => setShowLeaderboard(true)}
              style={styles.leaderboardBadge}
            >
              <Text style={styles.leaderboardBadgeRank}>
                {leaderboardRank.currentRank}
                <Text style={styles.leaderboardBadgeSuffix}>
                  {leaderboardRank.currentRank === 1 ? 'st' : leaderboardRank.currentRank === 2 ? 'nd' : leaderboardRank.currentRank === 3 ? 'rd' : 'th'}
                </Text>
              </Text>
              <Text style={styles.leaderboardBadgeDot}>•</Text>
              <Ionicons name="trophy" size={10} color="#FDE047" />
              <Text style={styles.leaderboardBadgeDot}>•</Text>
              <Text style={styles.leaderboardBadgePoints}>
                {leaderboardRank.currentRank === 1 ? '+' : ''}{leaderboardRank.pointsToNextRank.toLocaleString()}
              </Text>
            </Pressable>
          )}
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

      {/* D. Second Row: Top Gifters + Share */}
      <View style={[styles.secondRow, { top: insets.top + 56 }]}>
        {/* Top gifters + Share */}
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

      {/* E. Chat Overlay (above bottom bar, closer to buttons) */}
      <View style={[styles.chatContainer, { bottom: insets.bottom + 56 }]}>
        <ChatOverlay messages={messages} fontColor={chatFontColor} />
      </View>

      {/* F. Bottom Host Controls - Order: Battle, CoHost, Guests, Settings, Filters (web parity) */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom }]}>
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
      <TrendingSheet visible={showTrending} onClose={() => setShowTrending(false)} />
      <LeaderboardSheet visible={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Bottom gradient: only covers button area, darkest at bottom edge
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Top bar (web parity: left avatar+name, right viewer+X)
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top so right side doesn't get pushed down
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
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  hostName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  proBadgeImage: {
    width: 80,
    height: 40,
    marginLeft: -12,
    marginTop: -6,
    marginBottom: -6,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  rankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  rankDot: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  leaderboardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(234,179,8,0.9)',
    gap: 3,
  },
  leaderboardBadgeRank: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaderboardBadgeSuffix: {
    fontSize: 8,
    fontWeight: '600',
  },
  leaderboardBadgeDot: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
  },
  leaderboardBadgePoints: {
    fontSize: 10,
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

  // Second row (gifters+share)
  secondRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 20,
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
