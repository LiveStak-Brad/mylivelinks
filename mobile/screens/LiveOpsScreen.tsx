import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell, Modal } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { StreamCard } from '../components/owner/StreamCard';
import { StreamDetailSheet } from '../components/owner/StreamDetailSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveOps'>;

type RegionFilter = 'all' | 'us-east' | 'us-west' | 'eu-west' | 'ap-south';
type StatusFilter = 'all' | 'live' | 'starting' | 'ending';

export interface LiveStreamData {
  id: string;
  streamer: string;
  streamerId: string;
  avatarUrl: string | null;
  room: string;
  roomId?: string;
  region: RegionFilter;
  status: 'live' | 'starting' | 'ending';
  startedAt: string;
  viewers: number;
  giftsPerMin: number;
  chatPerMin: number;
}

export function LiveOpsScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<LiveStreamData[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<LiveStreamData[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Detail sheet state
  const [selectedStream, setSelectedStream] = useState<LiveStreamData | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/streams/live', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load streams (${res.status})`);
      }
      const data = (res.data?.streams || []) as LiveStreamData[];
      setStreams(data);
    } catch (e: any) {
      console.error('Error fetching streams:', e);
      // Use mock data for development
      setStreams(generateMockStreams());
    } finally {
      setLoading(false);
    }
  }, [fetchAuthed]);

  useEffect(() => {
    void load();
  }, [load]);

  // Apply filters
  useEffect(() => {
    let filtered = streams;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.streamer.toLowerCase().includes(q) ||
          s.room.toLowerCase().includes(q) ||
          s.roomId?.toLowerCase().includes(q)
      );
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter((s) => s.region === regionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStreams(filtered);
    setPage(1); // Reset to first page when filters change
  }, [streams, searchQuery, regionFilter, statusFilter]);

  const paginatedStreams = filteredStreams.slice(0, page * itemsPerPage);
  const hasMore = paginatedStreams.length < filteredStreams.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  };

  const handleStreamPress = (stream: LiveStreamData) => {
    setSelectedStream(stream);
  };

  const handleCloseDetail = () => {
    setSelectedStream(null);
  };

  const activeFiltersCount = 
    (regionFilter !== 'all' ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0) + 
    (searchQuery ? 1 : 0);

  return (
    <PageShell
      title="Live Operations"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <Pressable style={styles.filterButton} onPress={() => setShowSearchModal(true)}>
          <Feather name="search" size={18} color={theme.colors.text} />
          <Text style={styles.filterButtonText}>
            {searchQuery || 'Search'}
          </Text>
        </Pressable>

        <Pressable style={styles.filterButton} onPress={() => setShowRegionModal(true)}>
          <Feather name="map-pin" size={18} color={theme.colors.text} />
          <Text style={styles.filterButtonText}>
            {regionFilter === 'all' ? 'Region' : regionFilter.toUpperCase()}
          </Text>
        </Pressable>

        <Pressable style={styles.filterButton} onPress={() => setShowStatusModal(true)}>
          <Feather name="activity" size={18} color={theme.colors.text} />
          <Text style={styles.filterButtonText}>
            {statusFilter === 'all' ? 'Status' : statusFilter}
          </Text>
        </Pressable>

        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </View>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          Showing {paginatedStreams.length} of {filteredStreams.length} streams
          {activeFiltersCount > 0 && ' (filtered)'}
        </Text>
        <Pressable onPress={load} disabled={loading}>
          <Feather
            name="refresh-cw"
            size={18}
            color={loading ? theme.colors.textMuted : theme.colors.accent}
            style={loading ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        </Pressable>
      </View>

      {/* Content */}
      {loading && streams.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading streams…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : filteredStreams.length === 0 ? (
        <View style={styles.center}>
          <Feather name="radio" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeFiltersCount > 0 ? 'No streams found' : 'No live streams'}
          </Text>
          <Text style={styles.emptyText}>
            {activeFiltersCount > 0
              ? 'Try adjusting your filters'
              : 'There are no active streams at the moment'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={paginatedStreams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StreamCard stream={item} onPress={handleStreamPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <Button
                title={loading ? 'Loading…' : 'Load More'}
                variant="secondary"
                onPress={handleLoadMore}
                disabled={loading}
                style={styles.loadMoreButton}
              />
            ) : null
          }
        />
      )}

      {/* Search Modal */}
      <Modal visible={showSearchModal} onRequestClose={() => setShowSearchModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Search Streams</Text>
          <Pressable onPress={() => setShowSearchModal(false)}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by streamer, room, or room ID..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        <View style={styles.modalActions}>
          {searchQuery && (
            <Button
              title="Clear"
              variant="secondary"
              onPress={() => {
                setSearchQuery('');
                setShowSearchModal(false);
              }}
              style={styles.modalButton}
            />
          )}
          <Button
            title="Done"
            variant="primary"
            onPress={() => setShowSearchModal(false)}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      {/* Region Filter Modal */}
      <Modal visible={showRegionModal} onRequestClose={() => setShowRegionModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter by Region</Text>
          <Pressable onPress={() => setShowRegionModal(false)}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        <ScrollView style={styles.filterOptions}>
          {(['all', 'us-east', 'us-west', 'eu-west', 'ap-south'] as RegionFilter[]).map((region) => (
            <Pressable
              key={region}
              style={[styles.filterOption, regionFilter === region && styles.filterOptionActive]}
              onPress={() => {
                setRegionFilter(region);
                setShowRegionModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, regionFilter === region && styles.filterOptionTextActive]}>
                {region === 'all' ? 'All Regions' : region.toUpperCase().replace('-', ' ')}
              </Text>
              {regionFilter === region && <Feather name="check" size={20} color={theme.colors.accent} />}
            </Pressable>
          ))}
        </ScrollView>
      </Modal>

      {/* Status Filter Modal */}
      <Modal visible={showStatusModal} onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter by Status</Text>
          <Pressable onPress={() => setShowStatusModal(false)}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        <ScrollView style={styles.filterOptions}>
          {(['all', 'live', 'starting', 'ending'] as StatusFilter[]).map((status) => (
            <Pressable
              key={status}
              style={[styles.filterOption, statusFilter === status && styles.filterOptionActive]}
              onPress={() => {
                setStatusFilter(status);
                setShowStatusModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionTextActive]}>
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {statusFilter === status && <Feather name="check" size={20} color={theme.colors.accent} />}
            </Pressable>
          ))}
        </ScrollView>
      </Modal>

      {/* Stream Detail Bottom Sheet */}
      {selectedStream && (
        <StreamDetailSheet
          stream={selectedStream}
          visible={!!selectedStream}
          onClose={handleCloseDetail}
        />
      )}
    </PageShell>
  );
}

// Mock data generator for development
function generateMockStreams(): LiveStreamData[] {
  const streamers = ['DJ_Emma', 'GamerMike', 'ArtistSarah', 'ComedyJoe', 'MusicLive', 'FitnessQueen', 'TechTalk', 'ChefMaster'];
  const rooms = ['Main Stage', 'Gaming Arena', 'Art Studio', 'Comedy Club', 'Music Hall', 'Fitness Zone', 'Tech Corner', 'Kitchen Live'];
  const regions: RegionFilter[] = ['us-east', 'us-west', 'eu-west', 'ap-south'];
  const statuses: Array<'live' | 'starting' | 'ending'> = ['live', 'starting', 'ending'];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `stream-${i + 1}`,
    streamer: streamers[i % streamers.length],
    streamerId: `user-${i + 1}`,
    avatarUrl: null,
    room: rooms[i % rooms.length],
    roomId: `room-${i + 1}`,
    region: regions[i % regions.length],
    status: i < 20 ? 'live' : statuses[i % statuses.length],
    startedAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    viewers: Math.floor(Math.random() * 500) + 10,
    giftsPerMin: Math.floor(Math.random() * 50),
    chatPerMin: Math.floor(Math.random() * 200) + 10,
  }));
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    filterBar: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 44, // Touch target
    },
    filterButtonText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    filterBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: theme.colors.accent,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    resultsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.background,
    },
    resultsText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    mutedText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 8,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 16,
      fontWeight: '600',
      marginVertical: 8,
      textAlign: 'center',
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 12,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    loadMoreButton: {
      marginTop: 12,
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    searchInput: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      color: theme.colors.text,
      fontSize: 15,
      marginBottom: 16,
      minHeight: 44,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 8,
    },
    modalButton: {
      flex: 1,
    },
    filterOptions: {
      maxHeight: 300,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 10,
      marginBottom: 8,
      minHeight: 44,
    },
    filterOptionActive: {
      backgroundColor: theme.colors.accent + '15',
      borderWidth: 1,
      borderColor: theme.colors.accent + '40',
    },
    filterOptionText: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '500',
    },
    filterOptionTextActive: {
      color: theme.colors.accent,
      fontWeight: '600',
    },
  });
}

