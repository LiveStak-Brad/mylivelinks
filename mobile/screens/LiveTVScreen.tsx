import React, { useMemo, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  FlatList
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PageShell, PageHeader } from '../components/ui';
import { StreamCard, type Stream } from '../components/livetv';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { LiveRoomScreen } from './LiveRoomScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

// Categories for the chips rail
const CATEGORIES = [
  'Comedy',
  'Music',
  'Battles',
  'IRL',
  'Podcasts',
  'Gaming',
  'Fitness',
  'Dating',
  'Smoke Sesh',
  'Art',
  'Cooking',
  'Tech',
];

export function LiveTVScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [liveRoomEnabled, setLiveRoomEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data for UI display (no backend wiring)
  const mockStreams: Stream[] = [
    {
      id: '1',
      slug: 'stream-1',
      streamer_display_name: 'ComedyKing',
      thumbnail_url: null,
      viewer_count: 1234,
      category: 'Comedy',
      tags: ['Featured'],
    },
    {
      id: '2',
      slug: 'stream-2',
      streamer_display_name: 'MusicMaven',
      thumbnail_url: null,
      viewer_count: 856,
      category: 'Music',
      tags: ['Sponsored'],
    },
    {
      id: '3',
      slug: 'stream-3',
      streamer_display_name: 'NewStreamer',
      thumbnail_url: null,
      viewer_count: 234,
      category: 'Gaming',
      tags: ['New'],
    },
  ];

  const handleStreamPress = (stream: Stream) => {
    // Navigate to existing view/join flow (hooks into existing LiveRoomScreen)
    console.log('Stream pressed:', stream.slug);
    setLiveRoomEnabled(true);
  };

  // If LiveRoom is active, show it fullscreen WITHOUT PageShell
  if (liveRoomEnabled) {
    return (
      <LiveRoomScreen
        enabled={true}
        onExitLive={() => setLiveRoomEnabled(false)}
        onNavigateToRooms={() => {
          setLiveRoomEnabled(false);
        }}
        onNavigateWallet={() => {
          setLiveRoomEnabled(false);
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
      {/* Page Header */}
      <PageHeader 
        icon="tv" 
        iconColor="#f44336" 
        title="LiveTV"
        subtitle="MyLiveLinks Presents"
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search LiveTV"
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories Rail (Horizontal Chips) */}
        <View style={styles.categoriesSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {/* All category chip */}
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {/* Category chips */}
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ Featured</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.streamRail}
          >
            {mockStreams.filter(s => s.tags.includes('Featured')).length > 0 ? (
              mockStreams
                .filter(s => s.tags.includes('Featured'))
                .map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onPress={handleStreamPress}
                  />
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>⭐</Text>
                <Text style={styles.emptyStateText}>No featured streams right now</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Sponsored Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💎 Sponsored</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.streamRail}
          >
            {mockStreams.filter(s => s.tags.includes('Sponsored')).length > 0 ? (
              mockStreams
                .filter(s => s.tags.includes('Sponsored'))
                .map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onPress={handleStreamPress}
                  />
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💎</Text>
                <Text style={styles.emptyStateText}>No sponsored streams right now</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* New Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ New</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.streamRail}
          >
            {mockStreams.filter(s => s.tags.includes('New')).length > 0 ? (
              mockStreams
                .filter(s => s.tags.includes('New'))
                .map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onPress={handleStreamPress}
                  />
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>✨</Text>
                <Text style={styles.emptyStateText}>No new streams right now</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Nearby Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 Nearby</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.streamRail}
          >
            {mockStreams.filter(s => s.tags.includes('Nearby')).length > 0 ? (
              mockStreams
                .filter(s => s.tags.includes('Nearby'))
                .map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onPress={handleStreamPress}
                  />
                ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📍</Text>
                <Text style={styles.emptyStateText}>No nearby streams right now</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
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
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      height: 46,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    searchIcon: {
      fontSize: 18,
      marginRight: 8,
      opacity: 0.5,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    clearIcon: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    categoriesSection: {
      paddingVertical: 12,
    },
    categoriesContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    categoryChipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    section: {
      marginTop: 12,
      marginBottom: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    streamRail: {
      paddingHorizontal: 16,
      minHeight: 200,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 32,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 280,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 12,
      opacity: 0.3,
    },
    emptyStateText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    bottomPadding: {
      height: 40,
    },
  });
}

