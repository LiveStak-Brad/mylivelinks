/**
 * TierDetail - React Native version
 * 
 * Modal showing detailed information about a specific tier
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import {
  GifterStatus,
  GifterTier,
  getTierByKey,
  getTierLevelRange,
  getTierCoinRange,
  formatCoinAmount,
  GIFTER_TIERS,
} from './gifterTiers';
import GifterBadge from './GifterBadge';

export interface TierDetailProps {
  tier: GifterTier;
  gifterStatus: GifterStatus;
  onClose: () => void;
}

const TierDetail: React.FC<TierDetailProps> = ({
  tier,
  gifterStatus,
  onClose,
}) => {
  const currentTier = useMemo(
    () => getTierByKey(gifterStatus.tier_key),
    [gifterStatus.tier_key]
  );

  const isCurrentTier = tier.key === gifterStatus.tier_key;
  const isLocked = currentTier ? tier.order > currentTier.order : true;
  const isPast = currentTier ? tier.order < currentTier.order : false;

  const nextTier = useMemo(
    () => GIFTER_TIERS.find((t) => t.order === tier.order + 1),
    [tier.order]
  );

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: `${tier.color}15` }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Tier icon */}
          <View
            style={[
              styles.tierIconLarge,
              {
                backgroundColor: `${tier.color}25`,
                borderColor: `${tier.color}60`,
              },
              tier.isDiamond && styles.diamondGlow,
            ]}
          >
            <Text style={styles.tierIconText}>{tier.icon}</Text>
          </View>

          {/* Tier name */}
          <Text style={[styles.tierName, { color: tier.color }]}>
            {tier.name}
          </Text>

          {/* Status */}
          <Text style={styles.statusText}>
            {isCurrentTier && 'Your Current Tier'}
            {isPast && 'Completed ✓'}
            {isLocked && '🔒 Locked'}
          </Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Locked state */}
          {isLocked && !gifterStatus.show_locked_tiers && (
            <View style={styles.lockedContent}>
              <View style={styles.lockedIconContainer}>
                <Text style={styles.lockedIcon}>🔒</Text>
              </View>
              <Text style={styles.lockedTitle}>Tier Locked</Text>
              <Text style={styles.lockedDescription}>
                Keep gifting to unlock this tier and see its rewards!
              </Text>
            </View>
          )}

          {/* Unlocked state */}
          {(!isLocked || gifterStatus.show_locked_tiers) && (
            <>
              {/* Badge Preview */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Badge Preview</Text>
                <View style={styles.badgePreview}>
                  <GifterBadge tier_key={tier.key} level={1} size="sm" />
                  <GifterBadge tier_key={tier.key} level={25} size="md" />
                  <GifterBadge tier_key={tier.key} level={50} size="lg" />
                </View>
              </View>

              {/* Tier Info Grid */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Levels</Text>
                  <Text style={styles.infoValue}>{getTierLevelRange(tier)}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Coins Required</Text>
                  <Text style={[styles.infoValue, styles.monoText]}>
                    {getTierCoinRange(tier)}
                  </Text>
                </View>
              </View>

              {/* Current tier progress */}
              {isCurrentTier && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLevel}>
                      Level {gifterStatus.level_in_tier}
                      {tier.levelMax !== Infinity && ` / ${tier.levelMax}`}
                    </Text>
                    <Text style={styles.progressPercent}>
                      {gifterStatus.progress_pct}%
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${gifterStatus.progress_pct}%`,
                          backgroundColor: tier.color,
                        },
                      ]}
                    />
                  </View>

                  {/* Coin info */}
                  <View style={styles.coinInfo}>
                    <Text style={styles.coinInfoText}>
                      Lifetime: {formatCoinAmount(gifterStatus.lifetime_coins)}
                    </Text>
                    <Text style={styles.coinInfoText}>
                      Next: {formatCoinAmount(gifterStatus.next_level_coins)} more
                    </Text>
                  </View>
                </View>
              )}

              {/* Next tier preview */}
              {isCurrentTier && nextTier && (
                <View
                  style={[
                    styles.nextTierCard,
                    { backgroundColor: `${nextTier.color}08` },
                  ]}
                >
                  <View
                    style={[
                      styles.nextTierIcon,
                      {
                        backgroundColor: `${nextTier.color}20`,
                        borderColor: `${nextTier.color}40`,
                      },
                    ]}
                  >
                    <Text style={styles.nextTierIconText}>{nextTier.icon}</Text>
                  </View>
                  <View style={styles.nextTierInfo}>
                    <Text style={styles.nextTierName}>Next: {nextTier.name}</Text>
                    <Text style={styles.nextTierCoins}>
                      {formatCoinAmount(
                        nextTier.minLifetimeCoins - gifterStatus.lifetime_coins
                      )}{' '}
                      coins to unlock
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              )}

              {/* Diamond special message */}
              {tier.isDiamond && (
                <View style={styles.diamondMessage}>
                  <Text style={styles.diamondMessageText}>
                    ✨ <Text style={styles.bold}>Diamond</Text> is the ultimate
                    tier with <Text style={styles.bold}>unlimited levels</Text>!
                  </Text>
                  <Text style={styles.diamondSubtext}>
                    Your generosity knows no bounds.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  tierIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  diamondGlow: {
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
  tierIconText: {
    fontSize: 36,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  content: {
    padding: 24,
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  lockedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedIcon: {
    fontSize: 28,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  lockedDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  badgePreview: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 15,
  },
  progressSection: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLevel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  coinInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coinInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  nextTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  nextTierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextTierIconText: {
    fontSize: 18,
  },
  nextTierInfo: {
    flex: 1,
  },
  nextTierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  nextTierCoins: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.3)',
  },
  diamondMessage: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
  },
  diamondMessageText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  diamondSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  bold: {
    fontWeight: '700',
  },
});

export default TierDetail;

