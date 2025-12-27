/**
 * BrandLogo Component - Mobile
 * Matches web components/SmartBrandLogo.tsx behavior
 * Displays the MyLiveLinks branding using actual logo image
 */

import React from 'react';
import { View, StyleSheet, Image, ViewStyle } from 'react-native';

interface BrandLogoProps {
  size?: number;
  iconOnly?: boolean;
  style?: ViewStyle;
}

export function BrandLogo({ size = 110, iconOnly = false, style }: BrandLogoProps) {
  // Use the EXACT same logo as web: /branding/mylivelinkstransparent.png
  // (web uses this in components/BrandLogo.tsx line 41, components/SmartBrandLogo.tsx line 43)
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native requires require() for static assets
  const logoSource = require('../../assets/branding/mylivelinkstransparent.png');
  
  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
        }}
        accessibilityLabel="MyLiveLinks Logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

