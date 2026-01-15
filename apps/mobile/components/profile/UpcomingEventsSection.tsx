import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface UpcomingEventsSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  onAddEvent?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
}

export default function UpcomingEventsSection({
  profileId,
  isOwnProfile,
  onAddEvent,
  colors,
  cardStyle,
}: UpcomingEventsSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [profileId]);

  const loadEvents = async () => {
    try {
      // profile_comedy_specials doesn't have event_date, use created_at
      const { data, error } = await supabase
        .from('profile_comedy_specials')
        .select('id, title, description, created_at')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[UpcomingEventsSection] Table not found, skipping');
          setEvents([]);
          return;
        }
        throw error;
      }
      setEvents(data || []);
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_comedy_specials')) {
        console.log('[UpcomingEventsSection] Table not found, skipping');
        setEvents([]);
      } else {
        console.error('Error loading events:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Visitor + empty = hide
  if (events.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Upcoming Events</Text>
        </View>
        {isOwnProfile && onAddEvent && (
          <Pressable onPress={onAddEvent} style={styles.addButton}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.primary }]}>Add</Text>
          </Pressable>
        )}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No upcoming events scheduled
          </Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((event) => (
            <View key={event.id} style={[styles.eventCard, { borderColor: colors.border }]}>
              <View style={[styles.dateBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.dateMonth}>
                  {event.created_at 
                    ? new Date(event.created_at).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() 
                    : 'TBA'}
                </Text>
                <Text style={styles.dateDay}>
                  {event.created_at ? new Date(event.created_at).getDate() : '--'}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                  {event.title}
                </Text>
                {event.description && (
                  <Text style={[styles.eventVenue, { color: colors.mutedText }]} numberOfLines={1}>
                    {event.description}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  eventsList: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dateBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventVenue: {
    fontSize: 13,
  },
});
