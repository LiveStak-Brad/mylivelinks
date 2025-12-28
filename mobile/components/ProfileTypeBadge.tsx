/**
 * ProfileTypeBadge Component - Mobile
 * 
 * Displays a small pill badge showing the profile type (Streamer, Musician, etc.)
 * Positioned near username/display name on profile screens
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';

export type ProfileType = 
  | 'streamer'
  | 'musician' 
  | 'comedian'
  | 'business'
  | 'creator'
  | 'default';

interface ProfileTypeBadgeProps {
  /** The profile type to display */
  profileType: ProfileType;
  /** Optional custom style */
  style?: any;
}

const PROFILE_TYPE_CONFIG: Record<ProfileType, { 
  label: string; 
  emoji: string; 
  color: string;
  bgLight: string;
  bgDark: string;
}> = {
  streamer: {
    label: 'Streamer',
    emoji: '📺',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
    bgDark: 'rgba(239, 68, 68, 0.2)',
  },
  musician: {
    label: 'Musician',
    emoji: '🎵',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    bgDark: 'rgba(139, 92, 246, 0.2)',
  },
  comedian: {
    label: 'Comedian',
    emoji: '🎭',
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    bgDark: 'rgba(245, 158, 11, 0.2)',
  },
  business: {
    label: 'Business',
    emoji: '💼',
    color: '#0EA5E9',
    bgLight: 'rgba(14, 165, 233, 0.12)',
    bgDark: 'rgba(14, 165, 233, 0.2)',
  },
  creator: {
    label: 'Creator',
    emoji: '✨',
    color: '#EC4899',
    bgLight: 'rgba(236, 72, 153, 0.12)',
    bgDark: 'rgba(236, 72, 153, 0.2)',
  },
  default: {
    label: 'Member',
    emoji: '👤',
    color: '#6B7280',
    bgLight: 'rgba(107, 116, 128, 0.12)',
    bgDark: 'rgba(107, 116, 128, 0.2)',
  },
};

export function ProfileTypeBadge({ profileType, style }: ProfileTypeBadgeProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const config = PROFILE_TYPE_CONFIG[profileType] || PROFILE_TYPE_CONFIG.default;
  const isLight = theme.mode === 'light';
  
  return (
    <View 
      style={[
        styles.badge,
        { backgroundColor: isLight ? config.bgLight : config.bgDark },
        style,
      ]}
    >
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
      alignSelf: 'center',
    },
    emoji: {
      fontSize: 12,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
}

export default ProfileTypeBadge;



