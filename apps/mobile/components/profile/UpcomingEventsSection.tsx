import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import EventsCalendarStrip, { CalendarEvent } from './EventsCalendarStrip';

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
  title: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  sort_order: number;
  created_at: string;
  profile_id: string;
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
  
  const calendarEvents: CalendarEvent[] = useMemo(() => 
    events.map(e => ({
      id: e.id,
      title: e.title,
      start_at: e.start_at,
      end_at: e.end_at,
      location: e.location,
      url: e.url,
      notes: e.notes,
      profile_id: e.profile_id || profileId,
    })), 
    [events, profileId]
  );
  
  const handleSetReminder = async (event: CalendarEvent) => {
    try {
      const { error } = await supabase.rpc('set_event_reminder', {
        p_event_id: event.id,
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Reminder Set',
        `You'll be notified on ${new Date(event.start_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} about "${event.title || 'this event'}"`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error setting reminder:', error);
      Alert.alert('Error', 'Could not set reminder. Please try again.');
    }
  };

  useEffect(() => {
    loadEvents();
  }, [profileId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_events')
        .select('*')
        .eq('profile_id', profileId)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
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
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_events')) {
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

      {/* Calendar Strip - always visible */}
      <EventsCalendarStrip
        colors={colors}
        events={calendarEvents}
        isOwnProfile={isOwnProfile}
        onSetReminder={handleSetReminder}
      />

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            {isOwnProfile ? 'Add your first event' : 'No upcoming events'}
          </Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((event) => {
            const eventDate = new Date(event.start_at);
            return (
              <View key={event.id} style={[styles.eventCard, { borderColor: colors.border }]}>
                <View style={styles.eventRow}>
                  <View style={[styles.dateBox, { backgroundColor: colors.primary }]}>
                    <Text style={styles.dateMonth}>
                      {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={styles.dateDay}>
                      {eventDate.getDate()}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                      {event.title || 'Untitled Event'}
                    </Text>
                    {event.location && (
                      <View style={styles.venueRow}>
                        <Feather name="map-pin" size={12} color={colors.mutedText} />
                        <Text style={[styles.eventVenue, { color: colors.mutedText }]} numberOfLines={1}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.locationText, { color: colors.mutedText }]} numberOfLines={1}>
                      {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                {event.url && (
                  <Pressable 
                    style={[styles.ticketBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {/* Open URL */}}
                  >
                    <Feather name="external-link" size={14} color="#fff" />
                    <Text style={styles.ticketBtnText}>View Details</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
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
    gap: 12,
  },
  eventCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 16,
  },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  ticketBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventVenue: {
    fontSize: 13,
  },
});
