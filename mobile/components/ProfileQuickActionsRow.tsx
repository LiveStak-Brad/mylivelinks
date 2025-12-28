/**
 * ProfileQuickActionsRow Component - Mobile
 * 
 * Displays type-specific quick action buttons below profile header.
 * Actions vary based on profile type (Streamer, Musician, Business, etc.)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';
import type { ProfileType } from './ProfileTypeBadge';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface ProfileQuickActionsRowProps {
  /** The profile type determines which actions to show */
  profileType: ProfileType;
  /** Optional custom style */
  style?: any;
  /** Callbacks for specific actions (optional - will use placeholders if not provided) */
  onGoLive?: () => void;
  onSchedule?: () => void;
  onClips?: () => void;
  onPlay?: () => void;
  onShows?: () => void;
  onMerch?: () => void;
  onBook?: () => void;
  onProducts?: () => void;
  onBookings?: () => void;
  onReviews?: () => void;
  onFeatured?: () => void;
  onPosts?: () => void;
  onLinks?: () => void;
}

const placeholderAction = (label: string) => () => {
  Alert.alert(`${label}`, `${label} feature coming soon!`);
};

export function ProfileQuickActionsRow({
  profileType,
  style,
  onGoLive,
  onSchedule,
  onClips,
  onPlay,
  onShows,
  onMerch,
  onBook,
  onProducts,
  onBookings,
  onReviews,
  onFeatured,
  onPosts,
  onLinks,
}: ProfileQuickActionsRowProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const actions = useMemo<QuickAction[]>(() => {
    switch (profileType) {
      case 'streamer':
        return [
          {
            id: 'go-live',
            label: 'Go Live',
            icon: 'videocam',
            color: '#EF4444',
            onPress: onGoLive || placeholderAction('Go Live'),
          },
          {
            id: 'schedule',
            label: 'Schedule',
            icon: 'calendar',
            color: '#8B5CF6',
            onPress: onSchedule || placeholderAction('Schedule'),
          },
          {
            id: 'clips',
            label: 'Clips',
            icon: 'film',
            color: '#0EA5E9',
            onPress: onClips || placeholderAction('Clips'),
          },
        ];
      
      case 'musician':
        return [
          {
            id: 'play',
            label: 'Play',
            icon: 'play-circle',
            color: '#8B5CF6',
            onPress: onPlay || placeholderAction('Play Music'),
          },
          {
            id: 'shows',
            label: 'Shows',
            icon: 'musical-notes',
            color: '#EC4899',
            onPress: onShows || placeholderAction('Shows'),
          },
          {
            id: 'merch',
            label: 'Merch',
            icon: 'shirt',
            color: '#F59E0B',
            onPress: onMerch || placeholderAction('Merch'),
          },
        ];
      
      case 'comedian':
        return [
          {
            id: 'clips',
            label: 'Clips',
            icon: 'film',
            color: '#F59E0B',
            onPress: onClips || placeholderAction('Clips'),
          },
          {
            id: 'shows',
            label: 'Shows',
            icon: 'calendar-outline',
            color: '#EF4444',
            onPress: onShows || placeholderAction('Shows'),
          },
          {
            id: 'book',
            label: 'Book',
            icon: 'ticket',
            color: '#8B5CF6',
            onPress: onBook || placeholderAction('Book'),
          },
        ];
      
      case 'business':
        return [
          {
            id: 'products',
            label: 'Products',
            icon: 'cart',
            color: '#0EA5E9',
            onPress: onProducts || placeholderAction('Products'),
          },
          {
            id: 'bookings',
            label: 'Bookings',
            icon: 'calendar',
            color: '#10B981',
            onPress: onBookings || placeholderAction('Bookings'),
          },
          {
            id: 'reviews',
            label: 'Reviews',
            icon: 'star',
            color: '#F59E0B',
            onPress: onReviews || placeholderAction('Reviews'),
          },
        ];
      
      case 'creator':
        return [
          {
            id: 'featured',
            label: 'Featured',
            icon: 'sparkles',
            color: '#EC4899',
            onPress: onFeatured || placeholderAction('Featured'),
          },
          {
            id: 'posts',
            label: 'Posts',
            icon: 'grid',
            color: '#8B5CF6',
            onPress: onPosts || placeholderAction('Posts'),
          },
          {
            id: 'links',
            label: 'Links',
            icon: 'link',
            color: '#0EA5E9',
            onPress: onLinks || placeholderAction('Links'),
          },
        ];
      
      default:
        // No quick actions for default profile type
        return [];
    }
  }, [
    profileType,
    onGoLive,
    onSchedule,
    onClips,
    onPlay,
    onShows,
    onMerch,
    onBook,
    onProducts,
    onBookings,
    onReviews,
    onFeatured,
    onPosts,
    onLinks,
  ]);

  // Don't render anything if no actions
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={action.onPress}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${action.color}18` }]}>
            <Ionicons name={action.icon} size={20} color={action.color} />
          </View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    actionButton: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      minWidth: 80,
    },
    actionButtonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isLight ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.1)',
    },
    actionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
}

export default ProfileQuickActionsRow;

