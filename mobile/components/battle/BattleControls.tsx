/**
 * BattleControls - Mobile controls for battle interactions
 * Bottom bar with gift, share, report, and optional chat
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BattleSide } from '../../types/battle';
import { BattleGiftButton } from './BattleGiftButton';

interface BattleControlsProps {
  battleId: string;
  selectedSide: BattleSide | null;
  onSelectSide: (side: BattleSide) => void;
  onSendGift: (side: BattleSide) => void;
  onShare: () => void;
  onReport: () => void;
  onOpenChat?: () => void;
  teamAColor: string;
  teamBColor: string;
  showChatButton?: boolean;
}

export const BattleControls: React.FC<BattleControlsProps> = ({
  battleId,
  selectedSide,
  onSelectSide,
  onSendGift,
  onShare,
  onReport,
  onOpenChat,
  teamAColor,
  teamBColor,
  showChatButton = true,
}) => {
  return (
    <View style={styles.container}>
      {/* Left Side - Optional Chat Button */}
      {showChatButton && onOpenChat ? (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={onOpenChat}
          activeOpacity={0.7}
        >
          <Text style={styles.chatIcon}>💬</Text>
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      {/* Center - Gift Button */}
      <View style={styles.centerContainer}>
        <BattleGiftButton
          selectedSide={selectedSide}
          onSelectSide={onSelectSide}
          onSendGift={onSendGift}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
        />
      </View>

      {/* Right Side - Share & Report */}
      <View style={styles.rightControls}>
        {/* Share Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Report Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onReport}
          activeOpacity={0.7}
        >
          <Ionicons name="flag-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    gap: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  chatIcon: {
    fontSize: 18,
  },
  chatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: {
    width: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

