import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import ModuleEmptyState from '../ModuleEmptyState';

interface EventsTabProps {
  profileId: string;
  isOwnProfile?: boolean;
  onAddEvent?: () => void;
  colors: any;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  venue_name?: string;
  venue_location?: string;
  ticket_url?: string;
  created_at: string;
}

export default function EventsTab({ profileId, isOwnProfile = false, onAddEvent, colors }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [profileId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_comedy_specials')
        .select('*')
        .eq('profile_id', profileId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.eventHeader}>
        <View style={[styles.dateBox, { backgroundColor: colors.primary }]}>
          <Text style={styles.dateMonth}>
            {item.event_date ? new Date(item.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'TBA'}
          </Text>
          <Text style={styles.dateDay}>
            {item.event_date ? new Date(item.event_date).getDate() : '--'}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          {item.venue_name && (
            <View style={styles.venueRow}>
              <Feather name="map-pin" size={14} color={colors.mutedText} />
              <Text style={[styles.venueText, { color: colors.mutedText }]}>
                {item.venue_name}
              </Text>
            </View>
          )}
          {item.venue_location && (
            <Text style={[styles.locationText, { color: colors.mutedText }]}>
              {item.venue_location}
            </Text>
          )}
        </View>
      </View>
      {item.description && (
        <Text style={[styles.description, { color: colors.text }]}>
          {item.description}
        </Text>
      )}
      {item.ticket_url && (
        <Pressable style={[styles.ticketButton, { backgroundColor: colors.primary }]}>
          <Feather name="calendar" size={16} color="#fff" />
          <Text style={styles.ticketButtonText}>Get Tickets</Text>
        </Pressable>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (events.length === 0) {
    if (!isOwnProfile) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Feather name="calendar" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No upcoming events
          </Text>
        </View>
      );
    }
    
    return (
      <ModuleEmptyState
        icon="calendar"
        title="No Events Yet"
        description="Add your upcoming shows, appearances, or events."
        ctaLabel="Add Event"
        onCtaPress={onAddEvent}
        colors={colors}
      />
    );
  }

  return (
    <FlatList
      data={events}
      renderItem={renderEvent}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 16,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  venueText: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ticketButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
