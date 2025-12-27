import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PageShell, PageHeader } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { LiveRoomScreen } from './LiveRoomScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

export function RoomsScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [liveRoomEnabled, setLiveRoomEnabled] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // If LiveRoom is active, show it fullscreen WITHOUT PageShell (no bottom nav)
  if (liveRoomEnabled) {

    return (
      <LiveRoomScreen
        enabled={true}
        onExitLive={() => setLiveRoomEnabled(false)}
        onNavigateToRooms={() => {
          // Stay in LiveRoom but just return to Rooms list view
          // For now, same as exit
          setLiveRoomEnabled(false);
        }}
        onNavigateWallet={() => {
          setLiveRoomEnabled(false);
          // Navigate to wallet screen (assuming it's in root navigator)
          navigation.navigate('Wallet');
        }}
      />
    );
  }

  return (
    <PageShell 
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.navigate('MainTabs', { screen: 'Home' })}
      onNavigateToProfile={(username) => {
        navigation.navigate('MainTabs', { screen: 'Profile', params: { username } });
      }}
    >
      {/* Page Header: Video icon + Rooms */}
      <PageHeader icon="video" iconColor="#f44336" title="Rooms" />

      <ScrollView style={styles.content}>
        <View style={styles.placeholder}>
          {/* Live Central Banner Image */}
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/livecentralmeta.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          
          <Text style={styles.subtitle}>Live Central</Text>
          <Text style={styles.text}>
            Watch up to 12 live streamers at once in a dynamic grid. Interact with cameras, chat, and view leaderboards.
          </Text>
          
          {/* Orientation hint - shown before entering */}
          {!isLandscape && (
            <View style={styles.orientationHint}>
              <Text style={styles.hintIcon}>📱 → 📱</Text>
              <Text style={styles.hintText}>Rotate your phone to landscape for the best viewing experience</Text>
            </View>
          )}
          
          {/* Enter Live Central Button */}
          <TouchableOpacity
            style={[styles.enterButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setLiveRoomEnabled(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.enterButtonText}>🔴 Enter Live Central</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    placeholder: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    bannerImage: {
      width: '100%',
      height: 160,
      borderRadius: 12,
      marginBottom: 16,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    text: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
      marginBottom: 24,
    },
    enterButton: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    enterButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    orientationHint: {
      backgroundColor: 'rgba(74, 158, 255, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
      gap: 8,
    },
    hintIcon: {
      fontSize: 32,
    },
    hintText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
