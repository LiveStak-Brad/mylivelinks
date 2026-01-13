import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { navigateToTeamDetail } from '../lib/teamNavigation';

type Team = {
  id: string;
  name: string;
  slug: string;
  approved_member_count: number;
  icon_url: string | null;
  banner_url: string | null;
};

export default function SearchTeamsScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  const searchTeams = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTeams([]);
      setSearched(false);
      return;
    }
    
    setLoading(true);
    setSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, slug, approved_member_count, icon_url, banner_url')
        .or(`name.ilike.%${trimmed}%,slug.ilike.%${trimmed}%,team_tag.ilike.%${trimmed}%`)
        .order('approved_member_count', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      setTeams((data as any) || []);
    } catch (err: any) {
      console.error('[SearchTeamsScreen] searchTeams error:', err);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTeams(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, searchTeams]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={teams}
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
        renderItem={({ item }) => {
          const displayPhoto = item.icon_url || item.banner_url;
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigateToTeamDetail(navigation, { teamId: item.id, slug: item.slug })}
            >
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  {displayPhoto ? (
                    <Image 
                      source={{ uri: displayPhoto }} 
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={styles.teamName}>
                    {item.name}
                  </Text>
                  <View style={styles.teamSubRow}>
                    <Ionicons name="people" size={14} color="#6B7280" />
                    <Text style={styles.teamSubText}>{item.approved_member_count} members</Text>
                    <View style={styles.dot} />
                    <Text style={styles.teamSubText}>/{item.slug}</Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Searching teams...</Text>
            </View>
          ) : searched ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.emptyTitle}>No teams found</Text>
              <Text style={styles.emptyDescription}>
                Try a different name, slug, or tag to find teams.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.emptyTitle}>Search for teams</Text>
              <Text style={styles.emptyDescription}>
                Enter a team name, slug, or tag to find communities to join.
              </Text>
            </View>
          )
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
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
