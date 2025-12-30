/**
 * BattleScreen - Mobile Battle Viewer
 * TikTok-style split screen battle layout for React Native
 * Works for all battle types with cameras-only layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Battle, BattleSide, BattleParticipant } from '../types/battle';
import { BattleScoreBar } from '../components/battle/BattleScoreBar';
import { BattleTileGrid } from '../components/battle/BattleTileGrid';
import { BattleTopSupporters } from '../components/battle/BattleTopSupporters';
import { BattleControls } from '../components/battle/BattleControls';

interface BattleScreenProps {
  battle: Battle;
  onClose?: () => void;
  onNavigateWallet?: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ 
  battle, 
  onClose,
  onNavigateWallet 
}) => {
  const insets = useSafeAreaInsets();
  const [selectedSide, setSelectedSide] = useState<BattleSide | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    battle.remaining_seconds || battle.duration_seconds
  );
  const [showChat, setShowChat] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (battle.status !== 'active') return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [battle.status]);

  const handleSendGift = useCallback((side: BattleSide) => {
    setSelectedSide(side);
    
    // Get team leader as recipient (or first participant)
    const team = side === 'A' ? battle.team_a : battle.team_b;
    const leader = team.participants.find(p => p.is_team_leader) || team.participants[0];
    
    if (leader) {
      // TODO: Open gift modal
      setShowGiftModal(true);
      Alert.alert('Gift', `Send gift to ${leader.username} (Side ${side})`);
    }
  }, [battle]);

  const handleShare = useCallback(async () => {
    try {
      const url = `https://www.mylivelinks.com/battles/${battle.id}`;
      const message = `Watch this epic battle on MyLiveLinks!`;
      
      await Share.share({
        message: `${message}\n${url}`,
        url,
        title: 'Battle'
      });
    } catch (err: any) {
      console.log('Share error:', err);
    }
  }, [battle.id]);

  const handleReport = useCallback(() => {
    Alert.alert('Report', 'Report functionality coming soon');
  }, []);

  const handleOpenChat = useCallback(() => {
    setShowChat(!showChat);
  }, [showChat]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Score Bar - Top */}
      <View style={styles.scoreBarContainer}>
        <BattleScoreBar
          teamA={battle.team_a}
          teamB={battle.team_b}
          remainingSeconds={remainingSeconds}
        />
      </View>

      {/* Main Battle Area - Split Screen */}
      <View style={styles.battleArea}>
        {/* SIDE A */}
        <View style={styles.sideContainer}>
          <BattleTileGrid
            participants={battle.team_a.participants}
            side="A"
            sideColor={battle.team_a.color}
          />
          
          {/* Top Supporters Overlay - Side A */}
          <View style={styles.supportersOverlay}>
            <BattleTopSupporters
              supporters={battle.team_a.top_supporters}
              side="A"
              sideColor={battle.team_a.color}
            />
          </View>
        </View>

        {/* Center Divider */}
        <View style={styles.divider} />

        {/* SIDE B */}
        <View style={styles.sideContainer}>
          <BattleTileGrid
            participants={battle.team_b.participants}
            side="B"
            sideColor={battle.team_b.color}
          />
          
          {/* Top Supporters Overlay - Side B */}
          <View style={styles.supportersOverlay}>
            <BattleTopSupporters
              supporters={battle.team_b.top_supporters}
              side="B"
              sideColor={battle.team_b.color}
            />
          </View>
        </View>
      </View>

      {/* Controls - Bottom */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom || 8 }]}>
        <BattleControls
          battleId={battle.id}
          selectedSide={selectedSide}
          onSelectSide={setSelectedSide}
          onSendGift={handleSendGift}
          onShare={handleShare}
          onReport={handleReport}
          onOpenChat={handleOpenChat}
          teamAColor={battle.team_a.color}
          teamBColor={battle.team_b.color}
          showChatButton={true}
        />
      </View>

      {/* Chat Overlay (Optional) */}
      {showChat && (
        <View style={styles.chatOverlay}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Battle Chat</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.chatContent}>
            <Text style={styles.chatPlaceholder}>Chat functionality coming soon</Text>
          </View>
        </View>
      )}

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 8 }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Battle Status Indicator */}
      <View style={[styles.statusBadge, { top: insets.top + 8 }]}>
        <Text style={styles.statusText}>🔴 LIVE BATTLE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scoreBarContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  battleArea: {
    flex: 1,
    flexDirection: 'row',
  },
  sideContainer: {
    flex: 1,
    position: 'relative',
  },
  divider: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  supportersOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 8,
    right: 8,
  },
  controlsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 300,
    height: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  chatPlaceholder: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  statusBadge: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    zIndex: 100,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

