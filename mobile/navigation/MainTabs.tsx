/**
 * Main Bottom Tab Navigator
 * 
 * BOTTOM NAV (5 tabs):
 * ====================
 * Home | Feed | Go Live (CENTER) | Messages | Noties
 * 
 * TOP NAV (Global Header on all screens):
 * ========================================
 * Leaderboard (🏆) | Rooms (📹) - Right side of header
 * 
 * ICONS (matching web colors):
 * - Home: Home icon (Purple #8b5cf6)
 * - Feed: Rss/Activity icon (Pink #ec4899)
 * - Go Live: Video icon (Purple #8b5cf6, CENTER/LARGER) - Routes to Solo Host Stream
 * - Messages: MessageCircle icon (Blue #00a8ff)
 * - Noties: Bell icon (Amber #f59e0b)
 */

import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import type { MainTabsParamList } from '../types/navigation';
import { HomeDashboardScreen } from '../screens/HomeDashboardScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { SoloHostStreamScreen } from '../screens/SoloHostStreamScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotiesScreen } from '../screens/NotiesScreen';
import { useThemeMode } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { theme } = useThemeMode();
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.tabBar,
      borderTopColor: theme.colors.tabBorder,
      borderTopWidth: 1,
      paddingBottom: 8,
      paddingTop: 8,
      height: 68,
    }),
    [theme]
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent, // Primary purple
        tabBarInactiveTintColor: theme.colors.mutedText, // Muted gray
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} style={{ color: '#8b5cf6' }} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} style={{ color: '#ec4899' }} />
          ),
        }}
      />
      <Tab.Screen
        name="GoLive"
        component={SoloHostStreamScreen}
        options={{
          tabBarLabel: 'Go Live',
          tabBarIcon: ({ color, size }) => (
            <Feather name="video" size={size + 4} color={color} style={{ color: '#8b5cf6' }} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} style={{ color: '#00a8ff' }} />
          ),
        }}
      />
      <Tab.Screen
        name="Noties"
        component={NotiesScreen}
        options={{
          tabBarLabel: 'Noties',
          tabBarIcon: ({ color, size }) => (
            <Feather name="bell" size={size} color={color} style={{ color: '#f59e0b' }} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

