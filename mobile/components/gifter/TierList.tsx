/**
 * TierList - React Native version
 * 
 * Vertical list showing all gifter tiers with level ranges and coin requirements
 * Mobile-optimized: Shows tier name + unlock threshold, tap for details
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import {
  GIFTER_TIERS,
  GifterStatus,
  GifterTier,
  getVisibleTiers,
  getTierLevelRange,
  getTierByKey,
  formatCoinAmount,
} from './gifterTiers';
import GifterBadge from './GifterBadge';
import TierDetail from './TierDetail';

export interface TierListProps {
  gifterStatus: GifterStatus;
}

const TierList: React.FC<TierListProps> = ({ gifterStatus }) => {
  const [selectedTier, setSelectedTier] = useState<GifterTier | null>(null);
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const visibleTiers = useMemo(
    () => getVisibleTiers(gifterStatus.tier_key, gifterStatus.show_locked_tiers),
    [gifterStatus.tier_key, gifterStatus.show_locked_tiers]
  );

  const currentTier = useMemo(
    () => getTierByKey(gifterStatus.tier_key),
    [gifterStatus.tier_key]
  );

  const isLocked = (tier: GifterTier): boolean => {
    if (gifterStatus.show_locked_tiers) return false;
    if (!currentTier) return true;
    return tier.order > currentTier.order + 1;
  };
  
  // Mobile-friendly: just show unlock threshold
  const getUnlockDisplay = (tier: GifterTier): string => {
    if (tier.minLifetimeCoins === 0) return 'Free';
    return formatCoinAmount(tier.minLifetimeCoins);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gifter Tiers</Text>
        {currentTier && (
          <GifterBadge
            tier_key={gifterStatus.tier_key}
            level={gifterStatus.level_in_tier}
            size="md"
          />
        )}
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 1 }]}>Tier</Text>
        <Text style={styles.headerCell}>Unlock At</Text>
      </View>

      {/* Tier Rows */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {GIFTER_TIERS.map((tier) => {
          const locked = isLocked(tier);
          const isCurrent = tier.key === gifterStatus.tier_key;
          const isVisible = visibleTiers.some((t) => t.key === tier.key);

          // Completely hidden tier
          if (!isVisible && locked) {
            return (
              <View key={tier.key} style={styles.lockedRow}>
                <View style={styles.tierInfo}>
                  <View style={styles.lockedIcon}>
                    <Text style={styles.lockedIconText}>?</Text>
                  </View>
                  <Text style={styles.lockedText}>???</Text>
                </View>
                <Text style={styles.unlockText}>—</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={tier.key}
              style={[styles.row, isCurrent && styles.currentRow]}
              onPress={() => setSelectedTier(tier)}
              activeOpacity={0.7}
            >
              {/* Current tier indicator */}
              {isCurrent && <View style={[styles.currentIndicator, { backgroundColor: tier.color }]} />}

              {/* Tier Name & Icon */}
              <View style={styles.tierInfo}>
                <View
                  style={[
                    styles.tierIcon,
                    {
                      backgroundColor: `${tier.color}20`,
                      borderColor: `${tier.color}50`,
                    },
                  ]}
                >
                  <Text style={[styles.tierIconText, isNarrow && { fontSize: 14 }]}>
                    {tier.icon}
                  </Text>
                </View>
                <View style={styles.tierTextContainer}>
                  <Text
                    style={[
                      styles.tierName,
                      isCurrent && { color: tier.color },
                      isNarrow && { fontSize: 13 },
                    ]}
                    numberOfLines={1}
                  >
                    {tier.name}
                  </Text>
                  <Text style={styles.tierMeta}>
                    {isCurrent ? 'Current • ' : ''}{getTierLevelRange(tier)} levels
                  </Text>
                </View>
              </View>

              {/* Unlock threshold */}
              <Text style={[styles.unlockText, styles.monoText]}>
                {getUnlockDisplay(tier)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          💡 Tap any tier for details • Gift coins to level up!
        </Text>
      </View>

      {/* Tier Detail Modal */}
      <Modal
        visible={selectedTier !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTier(null)}
      >
        {selectedTier && (
          <TierDetail
            tier={selectedTier}
            gifterStatus={gifterStatus}
            onClose={() => setSelectedTier(null)}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  currentRow: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  currentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  lockedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIconText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
    fontSize: 14,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  tierIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconText: {
    fontSize: 14,
  },
  tierTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tierMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  unlockText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

export default TierList;

