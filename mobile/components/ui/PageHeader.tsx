/**
 * PageHeader Component - Consistent page title section
 * 
 * Used under the global top bar on every screen
 * Format: [icon] title
 * 
 * Uses Feather vector icons (matching bottom nav style)
 * 
 * Examples:
 * Home icon + Home
 * Activity icon + Feed  
 * Video icon + Rooms
 * MessageCircle icon + Messys
 * Bell icon + Noties
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

interface PageHeaderProps {
  /** Feather icon name */
  icon: keyof typeof Feather.glyphMap;
  /** Icon color (hex or theme color) */
  iconColor?: string;
  /** Page title text */
  title: string;
  /** Optional action button on the right */
  action?: React.ReactNode;
}

export function PageHeader({ icon, iconColor, title, action }: PageHeaderProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const finalIconColor = iconColor || theme.colors.textPrimary;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Feather name={icon} size={24} color={finalIconColor} style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    icon: {
      marginRight: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
}

