/**
 * BrandLogo Component - Mobile
 * Matches web components/SmartBrandLogo.tsx behavior
 * Displays the MyLiveLinks branding
 */

import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';

interface BrandLogoProps {
  size?: number;
  iconOnly?: boolean;
  style?: ViewStyle;
}

export function BrandLogo({ size = 110, iconOnly = false, style }: BrandLogoProps) {
  // For mobile, we'll use text-based branding with emoji icon
  // Web uses images, but for mobile parity we maintain the same visual weight
  
  if (iconOnly) {
    return (
      <View style={[styles.container, { width: size * 0.4, height: size * 0.4 }, style]}>
        <Text style={[styles.icon, { fontSize: size * 0.3 }]}>🔗</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.logoRow}>
        <Text style={[styles.icon, { fontSize: size * 0.25 }]}>🔗</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize: size * 0.15 }]}>MyLiveLinks</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    lineHeight: undefined,
  },
  textContainer: {
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});

