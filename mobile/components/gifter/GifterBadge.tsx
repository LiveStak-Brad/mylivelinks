/**
 * GifterBadge - React Native version
 * 
 * Pill-shaped badge showing gifter tier and level
 * Features:
 * - Tier-colored background with icon
 * - Level display ("Lv X")
 * - Diamond tier has animated shimmer effect (using Animated API)
 * - Respects reduced motion preferences
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { GIFTER_TIERS, getTierByKey, GifterTier } from './gifterTiers';

export interface GifterBadgeProps {
  /** Tier key (e.g., 'starter', 'elite', 'diamond') */
  tier_key: string;
  /** Level within the tier (1-50, or 1+ for Diamond) */
  level: number;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the level number */
  showLevel?: boolean;
}

const GifterBadge: React.FC<GifterBadgeProps> = ({
  tier_key,
  level,
  size = 'md',
  showLevel = true,
}) => {
  const tier = useMemo(() => getTierByKey(tier_key), [tier_key]);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = React.useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const checkMotion = async () => {
      const isReduced = await AccessibilityInfo.isReduceMotionEnabled();
      setReducedMotion(isReduced);
    };
    checkMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Diamond shimmer animation
  useEffect(() => {
    if (tier?.isDiamond && !reducedMotion) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [tier?.isDiamond, reducedMotion, shimmerAnim]);

  if (!tier) {
    return (
      <View style={[styles.badge, styles[`badge_${size}`]]}>
        <Text style={styles.icon}>?</Text>
        {showLevel && <Text style={styles.level}>Lv {level}</Text>}
      </View>
    );
  }

  const sizeStyles = {
    sm: styles.badge_sm,
    md: styles.badge_md,
    lg: styles.badge_lg,
  };

  const textStyles = {
    sm: styles.text_sm,
    md: styles.text_md,
    lg: styles.text_lg,
  };

  // Calculate tier-based scale factor
  const tierScale = 1 + (tier.order - 1) * 0.015;

  // Diamond glow opacity animation
  const glowOpacity = tier.isDiamond
    ? shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.6, 0.3],
      })
    : 0;

  return (
    <View
      style={{ transform: [{ scale: tierScale }] }}
      accessibilityLabel={`${tier.name} Level ${level}`}
      accessibilityRole="text"
    >
      {/* Diamond glow effect */}
      {tier.isDiamond && (
        <Animated.View
          style={[
            styles.diamondGlow,
            sizeStyles[size],
            {
              backgroundColor: tier.color,
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      <View
        style={[
          styles.badge,
          sizeStyles[size],
          {
            backgroundColor: `${tier.color}20`,
            borderColor: `${tier.color}50`,
          },
          tier.isDiamond && styles.diamondBadge,
        ]}
      >
        <Text style={[styles.icon, textStyles[size]]}>{tier.icon}</Text>
        {showLevel && (
          <Text
            style={[
              styles.level,
              textStyles[size],
              { color: tier.color },
            ]}
          >
            Lv {level}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Compact GifterBadge for tight spaces (icon only)
 */
export const GifterBadgeCompact: React.FC<{
  tier_key: string;
}> = ({ tier_key }) => {
  const tier = useMemo(() => getTierByKey(tier_key), [tier_key]);

  if (!tier) return null;

  return (
    <View
      style={[
        styles.compactBadge,
        {
          backgroundColor: `${tier.color}25`,
          borderColor: `${tier.color}60`,
        },
      ]}
      accessibilityLabel={tier.name}
    >
      <Text style={styles.compactIcon}>{tier.icon}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 1.5,
  },
  badge_sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  badge_md: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badge_lg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  icon: {
    textAlign: 'center',
  },
  level: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
  diamondBadge: {
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    ...Platform.select({
      android: {
        elevation: 4,
      },
    }),
  },
  diamondGlow: {
    position: 'absolute',
    borderRadius: 100,
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
  },
  compactBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    fontSize: 10,
  },
});

export default GifterBadge;







