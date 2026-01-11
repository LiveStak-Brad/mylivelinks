import React, { useMemo } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { GlobalHeader } from './GlobalHeader';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type PageShellProps = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  // Navigation callbacks for GlobalHeader
  onNavigateHome?: () => void;
  onNavigateToProfile?: (username: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToWallet?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToApply?: () => void;
  onNavigateToRooms?: () => void;
  onLogout?: () => void;
  // Flag to show new header
  useNewHeader?: boolean;
  // Auto-hide support
  headerVisible?: boolean;
  headerAnimatedValue?: Animated.Value;
};

export function PageShell({ 
  title, 
  left, 
  right, 
  children, 
  style, 
  contentStyle, 
  edges,
  onNavigateHome,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToWallet,
  onNavigateToAnalytics,
  onNavigateToApply,
  onNavigateToRooms,
  onLogout,
  useNewHeader = false,
  headerVisible = true,
  headerAnimatedValue,
}: PageShellProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const legacyStyles = useMemo(() => createLegacyStyles(theme), [theme]);

  // Calculate header transform
  const headerTransform = headerAnimatedValue 
    ? [{
        translateY: headerAnimatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 0], // Slide up by header height when hidden
        }),
      }]
    : [];

  return (
    <SafeAreaView style={[styles.container, style]} edges={edges ?? ['top', 'left', 'right', 'bottom']}>
      {useNewHeader ? (
        <Animated.View style={[{ transform: headerTransform }]}>
          <GlobalHeader
            onNavigateHome={onNavigateHome}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToSettings={onNavigateToSettings}
            onNavigateToWallet={onNavigateToWallet}
            onNavigateToAnalytics={onNavigateToAnalytics}
            onNavigateToApply={onNavigateToApply}
            onNavigateToRooms={onNavigateToRooms}
            onLogout={onLogout}
          />
        </Animated.View>
      ) : title ? (
        // Legacy header - to be removed after migration
        <Animated.View style={[legacyStyles.container, { transform: headerTransform }]}>
          <View style={legacyStyles.side}>{left}</View>
          <Text style={legacyStyles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={legacyStyles.side}>{right}</View>
        </Animated.View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    content: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
  });
}

// Legacy header styles (to be removed)
function createLegacyStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      height: 56,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    side: {
      width: 72,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
      maxWidth: '60%',
      textAlign: 'center',
    },
  });
}
