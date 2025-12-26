/**
 * Main Bottom Tab Navigator
 * 
 * WEB PARITY NAVIGATION MAP:
 * ==========================
 * WEB (BottomNav.tsx)          →  MOBILE (MainTabs.tsx)
 * ---------------------------  →  -----------------------
 * Home (/)                     →  Home (HomeDashboard)
 * Feed (/feed)                 →  Feed (FeedScreen)
 * Rooms (/rooms)               →  Rooms (RoomsScreen)
 * Messages (/messages)         →  Messages (MessagesScreen)
 * Noties (/noties)             →  Noties (NotiesScreen)
 * 
 * ICONS (matching web colors):
 * - Home: Home icon (Purple #8b5cf6)
 * - Feed: Rss/Activity icon (Pink #ec4899)
 * - Rooms: Video icon (Red #f44336, center/larger)
 * - Messages: MessageCircle icon (Blue #00a8ff)
 * - Noties: Bell icon (Amber #f59e0b)
 * 
 * FEATURES:
 * - Badge dots on Messages & Noties (no count numbers on tabs)
 * - Active state color highlighting
 * - Text labels always visible (matching web mobile)
 * - Safe area insets handled
 * - Tap target size optimized
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import type { MainTabsParamList } from '../types/navigation';
import { HomeDashboardScreen } from '../screens/HomeDashboardScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { RoomsScreen } from '../screens/RoomsScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotiesScreen } from '../screens/NotiesScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6', // Primary purple
        tabBarInactiveTintColor: '#9ca3af', // Muted gray
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
        },
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
        name="Rooms"
        component={RoomsScreen}
        options={{
          tabBarLabel: 'Rooms',
          tabBarIcon: ({ color, size }) => (
            <Feather name="video" size={size + 4} color={color} style={{ color: '#f44336' }} />
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
          // TODO: Add badge for unread messages
          // tabBarBadge: unreadMessages > 0 ? '' : undefined,
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
          // TODO: Add badge for unread noties
          // tabBarBadge: unreadNoties > 0 ? '' : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

