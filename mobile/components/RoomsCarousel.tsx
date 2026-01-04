import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { getRuntimeEnv } from '../lib/env';

type RoomCategory = 'gaming' | 'music' | 'entertainment' | 'Gaming' | 'Music' | 'Entertainment';
type RoomStatus = 'draft' | 'interest' | 'opening_soon' | 'live' | 'paused' | 'coming_soon';

export type ComingSoonRoom = {
  id: string;
  room_key?: string;
  name: string;
  category: RoomCategory;
  status: RoomStatus;
  description?: string | null;
  image_url: string | null;
  fallback_gradient?: string;
  current_interest_count?: number;
  interest_count?: number;
  interest_threshold?: number;
  disclaimer_required?: boolean;
  special_badge?: string;
};

interface RoomsCarouselProps {
  onApplyPress: () => void;
}

export function RoomsCarousel({ onApplyPress }: RoomsCarouselProps) {
  const { fetchAuthed } = useFetchAuthed();
  const [rooms, setRooms] = useState<ComingSoonRoom[]>([]);
  const [interestedRoomIds, setInterestedRoomIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    loadRooms();
    loadInterests();
  }, []);

  const loadRooms = async () => {
    try {
      const baseUrl = (getRuntimeEnv('EXPO_PUBLIC_API_URL') || 'https://www.mylivelinks.com').replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/rooms`);
      const json = await res.json();
      if (res.ok) {
        const dbRooms = (json?.rooms as ComingSoonRoom[]) ?? [];
        setRooms(dbRooms);
      }
    } catch (err) {
      console.error('[ROOMS] rooms fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInterests = async () => {
    try {
      const res = await fetchAuthed('/api/rooms/interests');
      if (!res.ok) {
        if (res.status === 401) {
          setInterestedRoomIds(new Set());
        }
        return;
      }
      const ids = Array.isArray(res.data?.room_ids) ? (res.data.room_ids as string[]) : [];
      setInterestedRoomIds(new Set(ids));
    } catch (err) {
      console.error('[ROOMS] interests fetch exception:', err);
    }
  };

  const handleToggleInterest = async (room: ComingSoonRoom) => {
    const nextInterested = !interestedRoomIds.has(room.id);

    if (room.disclaimer_required && nextInterested) {
      // In a real app, show a modal/alert, for now we skip
      return;
    }

    const prevInterested = interestedRoomIds.has(room.id);
    const prevCount: number = Number(room.current_interest_count ?? room.interest_count ?? 0);
    const optimisticCount = Math.max(prevCount + (nextInterested ? 1 : -1), 0);

    // Optimistic update
    setInterestedRoomIds((prev) => {
      const next = new Set(prev);
      if (nextInterested) next.add(room.id);
      else next.delete(room.id);
      return next;
    });
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id ? { ...r, current_interest_count: optimisticCount, interest_count: optimisticCount } : r
      )
    );

    try {
      const res = await fetchAuthed(`/api/rooms/${room.id}/interest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ interested: nextInterested }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Revert
          setInterestedRoomIds((prev) => {
            const next = new Set(prev);
            if (prevInterested) next.add(room.id);
            else next.delete(room.id);
            return next;
          });
          setRooms((prev) =>
            prev.map((r) => (r.id === room.id ? { ...r, current_interest_count: prevCount, interest_count: prevCount } : r))
          );
        }
        return;
      }

      const interested = Boolean(res.data?.interested);
      const currentInterestCount = res.data?.current_interest_count ?? optimisticCount;

      setInterestedRoomIds((prev) => {
        const next = new Set(prev);
        if (interested) next.add(room.id);
        else next.delete(room.id);
        return next;
      });
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? {
                ...r,
                current_interest_count: currentInterestCount,
                interest_count: currentInterestCount,
              }
            : r
        )
      );
    } catch (err) {
      console.error('[ROOMS] toggle interest exception:', err);
      // Revert on error
      setInterestedRoomIds((prev) => {
        const next = new Set(prev);
        if (prevInterested) next.add(room.id);
        else next.delete(room.id);
        return next;
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, current_interest_count: prevCount, interest_count: prevCount } : r))
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Coming Soon Rooms</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleIcon}>✨</Text>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Coming Soon Rooms</Text>
          <Text style={styles.subtitle}>Vote with interest — we open rooms when enough people sign up.</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={276}
        decelerationRate="fast"
      >
        {rooms.map((room) => {
          const interested = interestedRoomIds.has(room.id);
          const interestCount = Number(room.current_interest_count ?? room.interest_count ?? 0);
          const threshold = Number(room.interest_threshold ?? 100);
          const progress = Math.min((interestCount / threshold) * 100, 100);

          return (
            <View key={room.id} style={styles.roomCard}>
              {/* Image/Gradient */}
              <View style={styles.roomImageContainer}>
                {room.image_url ? (
                  <Image source={{ uri: room.image_url }} style={styles.roomImage} />
                ) : (
                  <View style={[styles.roomImage, styles.roomGradient]} />
                )}
                {room.special_badge && (
                  <View style={styles.specialBadge}>
                    <Text style={styles.specialBadgeText}>{room.special_badge}</Text>
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.roomContent}>
                <Text style={styles.roomCategory}>{room.category}</Text>
                <Text style={styles.roomName} numberOfLines={2}>
                  {room.name}
                </Text>
                {room.description && (
                  <Text style={styles.roomDescription} numberOfLines={2}>
                    {room.description}
                  </Text>
                )}

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {interestCount} / {threshold} interested
                  </Text>
                </View>

                {/* Interest Button */}
                <Pressable
                  style={[styles.interestButton, interested && styles.interestButtonActive]}
                  onPress={() => handleToggleInterest(room)}
                >
                  <Text style={styles.interestButtonText}>
                    {interested ? '✓ Interested' : 'I\'m Interested'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Apply Card */}
        <Pressable style={styles.applyCard} onPress={onApplyPress}>
          <View style={styles.applyContent}>
            <View style={styles.applyBadge}>
              <Text style={styles.applyBadgeText}>+ Room Idea?</Text>
            </View>
            <Text style={styles.applyTitle}>Enter it here</Text>
            <Text style={styles.applySubtitle}>
              Submit your room idea and help shape what we build next.
            </Text>
            <View style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  
  return StyleSheet.create({
    container: {
      marginBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    titleIcon: {
      fontSize: 24,
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    scrollContent: {
      paddingHorizontal: 8,
    },
    loadingContainer: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomCard: {
      width: 260,
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 16,
      marginHorizontal: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    roomImageContainer: {
      height: 140,
      position: 'relative',
    },
    roomImage: {
      width: '100%',
      height: '100%',
    },
    roomGradient: {
      backgroundColor: theme.colors.accent,
    },
    specialBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255, 215, 0, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    specialBadgeText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '900',
    },
    roomContent: {
      padding: 12,
    },
    roomCategory: {
      fontSize: 11,
      color: theme.colors.accent,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    roomName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    roomDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      marginBottom: 12,
    },
    progressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.colors.surface,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    interestButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    interestButtonActive: {
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(94, 155, 255, 0.3)',
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    interestButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    applyCard: {
      width: 260,
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(94, 155, 255, 0.15)',
      borderRadius: 16,
      marginHorizontal: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(94, 155, 255, 0.3)',
    },
    applyContent: {
      padding: 16,
      height: 280,
      justifyContent: 'space-between',
    },
    applyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    applyBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    applyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    applySubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: 12,
    },
    applyButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    applyButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
