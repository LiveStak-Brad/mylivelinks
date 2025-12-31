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

import React, { useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MainTabsParamList } from '../types/navigation';
import { HomeDashboardScreen } from '../screens/HomeDashboardScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { SoloHostStreamScreen } from '../screens/SoloHostStreamScreen';
import { ProfileTabScreen } from '../screens/ProfileTabScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotiesScreen } from '../screens/NotiesScreen';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { canUserGoLive } from '../lib/livekit-constants';
import { Modal } from '../components/ui';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { theme } = useThemeMode();
  const { user } = useAuthContext();
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const isOwner = useMemo(() => canUserGoLive(user ? { id: user.id, email: user.email } : null), [user?.email, user?.id]);
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

  const modalStyles = useMemo(() => createModalStyles(theme), [theme]);

  return (
    <>
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
        listeners={{
          tabPress: (e) => {
            if (isOwner) return;
            e.preventDefault();
            setShowGoLiveModal(true);
          },
        }}
        options={{
          tabBarLabel: 'Go Live',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Feather name="video" size={size + 4} color={color} style={{ color: '#8b5cf6' }} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
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

      <Modal visible={showGoLiveModal} onRequestClose={() => setShowGoLiveModal(false)}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>Go Live (Coming Soon)</Text>
          <Text style={modalStyles.body}>
            Go Live is currently limited to the owner account. Everyone can still watch live streams.
          </Text>
          <Pressable style={modalStyles.button} onPress={() => setShowGoLiveModal(false)}>
            <Text style={modalStyles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function createModalStyles(theme: any) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      marginTop: 4,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
  });
}

