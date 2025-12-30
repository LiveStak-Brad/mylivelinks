/**
 * BattleGiftButton - Mobile gift button with side selection
 * React Native version
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BattleSide } from '../../types/battle';

interface BattleGiftButtonProps {
  selectedSide: BattleSide | null;
  onSelectSide: (side: BattleSide) => void;
  onSendGift: (side: BattleSide) => void;
  teamAColor: string;
  teamBColor: string;
  disabled?: boolean;
}

export const BattleGiftButton: React.FC<BattleGiftButtonProps> = ({ 
  selectedSide,
  onSelectSide,
  onSendGift,
  teamAColor,
  teamBColor,
  disabled = false,
}) => {
  const [showSideSelector, setShowSideSelector] = useState(false);

  const handleGiftClick = () => {
    if (selectedSide) {
      // Side already selected, send gift
      onSendGift(selectedSide);
    } else {
      // No side selected, show selector
      setShowSideSelector(!showSideSelector);
    }
  };

  const handleSideSelect = (side: BattleSide) => {
    onSelectSide(side);
    setShowSideSelector(false);
    // Immediately open gift modal
    onSendGift(side);
  };

  return (
    <View style={styles.container}>
      {/* Main Gift Button */}
      <TouchableOpacity
        onPress={handleGiftClick}
        disabled={disabled}
        style={[styles.giftButton, disabled && styles.disabled]}
        activeOpacity={0.8}
      >
        <Text style={styles.giftIcon}>🎁</Text>
        <Text style={styles.giftText}>
          {selectedSide ? `GIFT SIDE ${selectedSide}` : 'SEND GIFT'}
        </Text>
        {selectedSide && (
          <View 
            style={[
              styles.selectedIndicator,
              { backgroundColor: selectedSide === 'A' ? teamAColor : teamBColor }
            ]}
          />
        )}
      </TouchableOpacity>

      {/* Side Selector Popup */}
      {showSideSelector && (
        <View style={styles.selectorPopup}>
          {/* Side A */}
          <TouchableOpacity
            onPress={() => handleSideSelect('A')}
            style={styles.sideOption}
            activeOpacity={0.7}
          >
            <View 
              style={[
                styles.sideIndicator,
                { backgroundColor: teamAColor }
              ]}
            >
              <Text style={styles.sideText}>A</Text>
            </View>
            <Text style={styles.sideLabel}>Side A</Text>
          </TouchableOpacity>

          {/* Side B */}
          <TouchableOpacity
            onPress={() => handleSideSelect('B')}
            style={styles.sideOption}
            activeOpacity={0.7}
          >
            <View 
              style={[
                styles.sideIndicator,
                { backgroundColor: teamBColor }
              ]}
            >
              <Text style={styles.sideText}>B</Text>
            </View>
            <Text style={styles.sideLabel}>Side B</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  giftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  disabled: {
    opacity: 0.5,
  },
  giftIcon: {
    fontSize: 20,
  },
  giftText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectorPopup: {
    position: 'absolute',
    bottom: '110%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sideOption: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sideIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sideLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

