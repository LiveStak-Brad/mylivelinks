/**
 * TierList - React Native version
 * 
 * Vertical list showing all gifter tiers with level ranges and coin requirements
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  GIFTER_TIERS,
  GifterStatus,
  GifterTier,
  getVisibleTiers,
  getTierLevelRange,
  getTierCoinRange,
  getTierByKey,
} from './gifterTiers';
import GifterBadge from './GifterBadge';
import TierDetail from './TierDetail';

export interface TierListProps {
  gifterStatus: GifterStatus;
}

const TierList: React.FC<TierListProps> = ({ gifterStatus }) => {
  const [selectedTier, setSelectedTier] = useState<GifterTier | null>(null);

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
        <Text style={[styles.headerCell, styles.tierColumn]}>Tier</Text>
        <Text style={[styles.headerCell, styles.levelsColumn]}>Levels</Text>
        <Text style={[styles.headerCell, styles.coinsColumn]}>Coins</Text>
      </View>

      {/* Tier Rows */}
      <ScrollView style={styles.scrollView}>
        {GIFTER_TIERS.map((tier) => {
          const locked = isLocked(tier);
          const isCurrent = tier.key === gifterStatus.tier_key;
          const isVisible = visibleTiers.some((t) => t.key === tier.key);

          // Completely hidden tier
          if (!isVisible && locked) {
            return (
              <View key={tier.key} style={styles.lockedRow}>
                <View style={styles.tierColumn}>
                  <View style={styles.lockedIcon}>
                    <Text style={styles.lockedIconText}>?</Text>
                  </View>
                  <Text style={styles.lockedText}>???</Text>
                </View>
                <Text style={[styles.cellText, styles.levelsColumn]}>—</Text>
                <Text style={[styles.cellText, styles.coinsColumn]}>—</Text>
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
              <View style={[styles.tierColumn, styles.tierInfo]}>
                <View
                  style={[
                    styles.tierIcon,
                    {
                      backgroundColor: `${tier.color}20`,
                      borderColor: `${tier.color}50`,
                    },
                  ]}
                >
                  <Text style={styles.tierIconText}>{tier.icon}</Text>
                </View>
                <View>
                  <Text
                    style={[
                      styles.tierName,
                      isCurrent && { color: tier.color },
                    ]}
                  >
                    {tier.name}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.currentLabel}>Current</Text>
                  )}
                </View>
              </View>

              {/* Levels */}
              <Text style={[styles.cellText, styles.levelsColumn]}>
                {getTierLevelRange(tier)}
              </Text>

              {/* Coins */}
              <Text style={[styles.cellText, styles.coinsColumn, styles.monoText]}>
                {getTierCoinRange(tier)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          💡 Spend coins to level up and unlock higher tiers!
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  tierColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelsColumn: {
    width: 60,
    textAlign: 'center',
  },
  coinsColumn: {
    width: 90,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIconText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  tierInfo: {
    flex: 1,
  },
  tierIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconText: {
    fontSize: 16,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  currentLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cellText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default TierList;

