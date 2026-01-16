import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import AddEventModal from '../AddEventModal';
import EventsCalendarStrip, { CalendarEvent } from '../EventsCalendarStrip';

interface EventsTabProps {
  profileId: string;
  isOwnProfile?: boolean;
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

export default function EventsTab({ profileId, isOwnProfile = false, onAddEvent, colors, cardStyle }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
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
  
  const handleAddEvent = () => {
    if (onAddEvent) {
      onAddEvent();
    } else {
      setShowAddModal(true);
    }
  };
  
  const handleEventAdded = () => {
    loadEvents();
  };
  
  const handleSetReminder = async (event: CalendarEvent) => {
    try {
      const { data, error } = await supabase.rpc('set_event_reminder', {
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
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;

  useEffect(() => {
    loadEvents();
  }, [profileId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_events')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const textColor = cardStyle?.textColor || colors.text;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Events</Text>
        </View>
        {isOwnProfile && (
          <Pressable onPress={handleAddEvent} style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Event</Text>
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
      
      {/* Events list or empty state */}
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={32} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            {isOwnProfile ? 'No events yet' : 'No upcoming events'}
          </Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((item) => {
            const eventDate = new Date(item.start_at);
            return (
              <View key={item.id} style={[styles.eventCard, { borderColor: colors.border }]}>
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
                      {item.title || 'Untitled Event'}
                    </Text>
                    {item.location && (
                      <View style={styles.venueRow}>
                        <Feather name="map-pin" size={12} color={colors.mutedText} />
                        <Text style={[styles.venueText, { color: colors.mutedText }]} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.timeText, { color: colors.mutedText }]}>
                      {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                {item.url && (
                  <Pressable style={[styles.detailsButton, { backgroundColor: colors.primary }]}>
                    <Feather name="external-link" size={14} color="#fff" />
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
      
      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onEventAdded={handleEventAdded}
        colors={colors}
      />
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
    marginBottom: 16,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    paddingVertical: 12,
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
    color: '#fff',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueText: {
    fontSize: 13,
  },
  timeText: {
    fontSize: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
