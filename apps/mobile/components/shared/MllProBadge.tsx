import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const PRO_BADGE_IMAGE = require('../../assets/newprobadge.png');

interface MllProBadgeProps {
  /** Size variant - 'sm' for inline with text, 'md' for larger displays */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MLL PRO Badge component for mobile.
 * Uses a clipping container to remove transparent space from the badge image.
 * Scales the image larger than container so visible badge fills the space.
 */
export default function MllProBadge({ size = 'sm' }: MllProBadgeProps) {
  const containerStyle = SIZE_STYLES[size].container;
  const imageStyle = SIZE_STYLES[size].image;

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={PRO_BADGE_IMAGE}
        style={[styles.image, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const SIZE_STYLES = {
  sm: {
    container: { width: 28, height: 16 },
    image: { width: 56, height: 32 },
  },
  md: {
    container: { width: 32, height: 20 },
    image: { width: 64, height: 40 },
  },
  lg: {
    container: { width: 40, height: 24 },
    image: { width: 80, height: 48 },
  },
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    zIndex: 1,
  },
  image: {
    // Image is 2x container size to clip transparent edges
  },
});
