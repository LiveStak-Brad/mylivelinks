import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import type { MainTabsParamList } from '../../types/navigation';
import { useTopBarState } from '../../hooks/topbar/useTopBarState';

type BottomNavProps = {
  navigation: BottomTabNavigationProp<MainTabsParamList>;
  currentRoute: keyof MainTabsParamList;
};

type NavItem = {
  route: keyof MainTabsParamList;
  label: string;
  icon: string;
  badge?: number;
};

/**
 * BottomNav Component - Mobile parity with web
 * 
 * Matches web components/BottomNav.tsx:
 * - 5 navigation items (Home, Feed, Rooms, Messages, Noties)
 * - Active state indicators
 * - Badge dots for unread items (NO COUNT NUMBERS displayed)
 * - Safe area padding for mobile devices
 * - Consistent with iOS/Android bottom navigation patterns
 */
export function BottomNav({ navigation, currentRoute }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const topBar = useTopBarState();

  // Match web nav items (components/BottomNav.tsx lines 73-108)
  const navItems: NavItem[] = [
    {
      route: 'Home',
      label: 'Home',
      icon: '🏠',
    },
    {
      route: 'Feed',
      label: 'Feed',
      icon: '📰',
    },
    {
      route: 'Rooms',
      label: 'Rooms',
      icon: '🎥',
    },
    {
      route: 'Messages',
      label: 'Messages',
      icon: '💬',
      badge: topBar.showMessagesBadge ? Math.max(1, Number(topBar.unreadMessagesCount ?? 0)) : 0,
    },
    {
      route: 'Noties',
      label: 'Noties',
      icon: '🔔',
      badge: topBar.showNotiesBadge ? Math.max(1, Number(topBar.unreadNotiesCount ?? 0)) : 0,
    },
  ];

  const handlePress = (route: keyof MainTabsParamList) => {
    if (route === currentRoute) return;
    
    // Navigate to the route
    navigation.navigate(route as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = currentRoute === item.route;

        return (
          <Pressable
            key={item.route}
            style={({ pressed }) => [
              styles.navItem,
              pressed && styles.navItemPressed,
            ]}
            onPress={() => handlePress(item.route)}
          >
            <View style={styles.iconContainer}>
              <Text
                style={[
                  styles.icon,
                  isActive && styles.iconActive,
                ]}
              >
                {item.icon}
              </Text>
              
              {/* Badge dot for unread items - NEVER show count as text (matches web) */}
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.badgeDot} />
              )}
            </View>
            
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navItemPressed: {
    opacity: 0.6,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  label: {
    fontSize: 11,
    color: '#9aa0a6',
    fontWeight: '600',
  },
  labelActive: {
    color: '#8B5CF6',
  },
});

