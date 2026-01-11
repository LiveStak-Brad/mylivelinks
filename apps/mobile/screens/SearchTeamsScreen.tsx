import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type PlaceholderTeam = {
  id: string;
  name: string;
  members: number;
  privacy: 'Public' | 'Private';
  slug: string;
};

const PLACEHOLDER_TEAMS: PlaceholderTeam[] = [
  { id: 't-1', name: 'Creator Labs', members: 128, privacy: 'Public', slug: 'creator-labs' },
  { id: 't-2', name: 'Live Drops Weekly', members: 74, privacy: 'Public', slug: 'live-drops-weekly' },
  { id: 't-3', name: 'Battle Practice', members: 51, privacy: 'Public', slug: 'battle-practice' },
  { id: 't-4', name: 'Verified Hosts', members: 19, privacy: 'Private', slug: 'verified-hosts' },
  { id: 't-5', name: 'LA Night Rooms', members: 203, privacy: 'Public', slug: 'la-night-rooms' },
  { id: 't-6', name: 'Music Collabs', members: 96, privacy: 'Public', slug: 'music-collabs' },
  { id: 't-7', name: 'Ops Watch', members: 33, privacy: 'Private', slug: 'ops-watch' },
  { id: 't-8', name: 'Comedy Clip Crew', members: 61, privacy: 'Public', slug: 'comedy-clip-crew' },
  { id: 't-9', name: 'Gaming Duos', members: 87, privacy: 'Public', slug: 'gaming-duos' },
  { id: 't-10', name: 'Team Builders', members: 42, privacy: 'Public', slug: 'team-builders' },
];

export default function SearchTeamsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PLACEHOLDER_TEAMS;
    return PLACEHOLDER_TEAMS.filter((t) => {
      const name = t.name.toLowerCase();
      const slug = t.slug.toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredTeams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Search teams</Text>
            <Text style={styles.subtitle}>Find communities to join by name or slug.</Text>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search teams"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.trim().length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  style={styles.clearButton}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.meta}>
                <Text numberOfLines={1} style={styles.teamName}>
                  {item.name}
                </Text>
                <View style={styles.teamSubRow}>
                  <Ionicons name="people" size={14} color="#6B7280" />
                  <Text style={styles.teamSubText}>{item.members} members</Text>
                  <View style={styles.dot} />
                  <Ionicons name={item.privacy === 'Private' ? 'lock-closed' : 'globe-outline'} size={14} color="#6B7280" />
                  <Text style={styles.teamSubText}>{item.privacy}</Text>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Join ${item.name}`}
              onPress={() => {}}
              style={({ pressed }) => [styles.joinButton, pressed && styles.joinButtonPressed]}
            >
              <Text style={styles.joinButtonText}>Join</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={28} color="#8B5CF6" />
            </View>
            <Text style={styles.emptyTitle}>No teams found</Text>
            <Text style={styles.emptyDescription}>
              Try a different name or slug, or clear your search to see suggested teams.
            </Text>
            {searchQuery.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSearchQuery('')}
                style={({ pressed }) => [styles.emptyCta, pressed && styles.emptyCtaPressed]}
              >
                <Ionicons name="close-circle" size={18} color="#111827" />
                <Text style={styles.emptyCtaText}>Clear search</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  teamSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  teamSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  joinButtonPressed: {
    opacity: 0.92,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyCtaPressed: {
    backgroundColor: '#F3F4F6',
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});
