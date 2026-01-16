import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAYS_PER_PAGE = 5;
const TOTAL_PAGES = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarEvent {
  id: string;
  title: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  profile_id: string;
}

interface EventsCalendarStripProps {
  colors: any;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: CalendarEvent[];
  onSetReminder?: (event: CalendarEvent) => void;
  isOwnProfile?: boolean;
}

interface PageData {
  days: Date[];
}

function getPagesData(today: Date): PageData[] {
  const pages: PageData[] = [];
  
  // Center page starts 2 days before today (so today is in the middle of 5 days)
  // Page 0 starts 3 pages * 5 days = 15 days before that
  const centerPageStart = new Date(today);
  centerPageStart.setDate(centerPageStart.getDate() - 2); // 2 days before today
  centerPageStart.setHours(0, 0, 0, 0);
  
  const startDate = new Date(centerPageStart);
  startDate.setDate(startDate.getDate() - (3 * DAYS_PER_PAGE)); // 3 pages back
  
  for (let p = 0; p < TOTAL_PAGES; p++) {
    const days: Date[] = [];
    for (let d = 0; d < DAYS_PER_PAGE; d++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + (p * DAYS_PER_PAGE) + d);
      days.push(day);
    }
    pages.push({ days });
  }
  
  return pages;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateStr = date.toISOString().split('T')[0];
  return events.filter(e => e.start_at.startsWith(dateStr));
}

export default function EventsCalendarStrip({
  colors,
  selectedDate,
  onDateSelect,
  events = [],
  onSetReminder,
  isOwnProfile = false,
}: EventsCalendarStripProps) {
  const today = new Date();
  const [currentPageIndex, setCurrentPageIndex] = useState(3);
  const [expandedDate, setExpandedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pages = getPagesData(today);
  const pageWidth = SCREEN_WIDTH - 32;
  
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex !== currentPageIndex && newIndex >= 0 && newIndex < TOTAL_PAGES) {
      setCurrentPageIndex(newIndex);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      const newIndex = currentPageIndex - 1;
      setCurrentPageIndex(newIndex);
      scrollRef.current?.scrollTo({ x: newIndex * pageWidth, animated: true });
    }
  };
  
  const goToNextPage = () => {
    if (currentPageIndex < TOTAL_PAGES - 1) {
      const newIndex = currentPageIndex + 1;
      setCurrentPageIndex(newIndex);
      scrollRef.current?.scrollTo({ x: newIndex * pageWidth, animated: true });
    }
  };
  
  const handleDayPress = (day: Date) => {
    const dayEvents = getEventsForDate(day, events);
    if (dayEvents.length > 0) {
      if (expandedDate && isSameDay(expandedDate, day)) {
        setExpandedDate(null);
      } else {
        setExpandedDate(day);
      }
    }
    onDateSelect?.(day);
  };
  
  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };
  
  const handleOpenUrl = (url: string) => {
    Linking.openURL(url);
  };
  
  const currentMonth = pages[currentPageIndex]?.days[2]?.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }) || '';
  
  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.calendarNav}>
        <Pressable 
          onPress={goToPrevPage} 
          disabled={currentPageIndex === 0} 
          style={[styles.navButton, { backgroundColor: colors.surface }]}
          hitSlop={8}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={currentPageIndex === 0 ? colors.border : colors.text}
          />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{currentMonth}</Text>
        <Pressable 
          onPress={goToNextPage} 
          disabled={currentPageIndex === TOTAL_PAGES - 1} 
          style={[styles.navButton, { backgroundColor: colors.surface }]}
          hitSlop={8}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={currentPageIndex === TOTAL_PAGES - 1 ? colors.border : colors.text}
          />
        </Pressable>
      </View>
      
      {/* Calendar Pages - 5 days per page */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentOffset={{ x: 3 * pageWidth, y: 0 }}
        style={styles.calendarScroll}
      >
        {pages.map((page, pageIdx) => (
          <View key={pageIdx} style={[styles.pageRow, { width: pageWidth }]}>
            {page.days.map((day, dayIdx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const dayEvents = getEventsForDate(day, events);
              const hasEvent = dayEvents.length > 0;
              const dayName = DAY_NAMES[day.getDay()];
              
              return (
                <Pressable
                  key={dayIdx}
                  onPress={() => handleDayPress(day)}
                  style={[
                    styles.dayCard,
                    isToday && styles.todayCard,
                    { 
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isToday ? colors.primary : colors.border,
                      borderWidth: isToday ? 2 : 1,
                    },
                  ]}
                >
                  {/* Day Header - Underlined */}
                  <View style={[styles.dayHeader, { borderBottomColor: isSelected ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                    <Text
                      style={[
                        styles.dayName,
                        isToday && styles.todayDayName,
                        { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.mutedText },
                      ]}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        isToday && styles.todayNumber,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  
                  {/* Event Space */}
                  <View style={styles.eventSpace}>
                    {hasEvent ? (
                      <View style={styles.eventIndicator}>
                        <Feather 
                          name="check-circle" 
                          size={18} 
                          color={isSelected ? '#fff' : colors.primary} 
                        />
                        <Text 
                          style={[
                            styles.eventCount, 
                            { color: isSelected ? 'rgba(255,255,255,0.9)' : colors.mutedText }
                          ]}
                        >
                          {dayEvents.length}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.noEventText, { color: colors.border }]}>—</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      
      {/* Expanded Event Card */}
      {expandedDate && (
        <View style={[styles.expandedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.expandedHeader}>
            <Text style={[styles.expandedDate, { color: colors.text }]}>
              {expandedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Pressable onPress={() => setExpandedDate(null)}>
              <Feather name="x" size={20} color={colors.mutedText} />
            </Pressable>
          </View>
          
          {getEventsForDate(expandedDate, events).map((event) => (
            <Pressable 
              key={event.id} 
              style={[styles.expandedEvent, { borderColor: colors.border }]}
              onPress={() => handleEventPress(event)}
            >
              <View style={styles.expandedEventInfo}>
                <Text style={[styles.expandedEventTitle, { color: colors.text }]}>
                  {event.title || 'Untitled Event'}
                </Text>
                <Text style={[styles.expandedEventTime, { color: colors.mutedText }]}>
                  {new Date(event.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
                {event.location && (
                  <View style={styles.expandedEventRow}>
                    <Feather name="map-pin" size={12} color={colors.mutedText} />
                    <Text style={[styles.expandedEventLocation, { color: colors.mutedText }]}>
                      {event.location}
                    </Text>
                  </View>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedText} />
            </Pressable>
          ))}
        </View>
      )}
      
      {/* Event Detail Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowEventModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Event Details</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {selectedEvent && (
              <ScrollView style={styles.modalBody}>
                {/* Event Title */}
                <Text style={[styles.modalEventTitle, { color: colors.text }]}>
                  {selectedEvent.title || 'Untitled Event'}
                </Text>
                
                {/* Date & Time */}
                <View style={styles.modalRow}>
                  <Feather name="calendar" size={18} color={colors.primary} />
                  <View style={styles.modalRowContent}>
                    <Text style={[styles.modalLabel, { color: colors.mutedText }]}>Date & Time</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>
                      {new Date(selectedEvent.start_at).toLocaleDateString('en-US', { 
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
                      })}
                    </Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>
                      {new Date(selectedEvent.start_at).toLocaleTimeString('en-US', { 
                        hour: 'numeric', minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                </View>
                
                {/* Location */}
                {selectedEvent.location && (
                  <View style={styles.modalRow}>
                    <Feather name="map-pin" size={18} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.mutedText }]}>Location</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        {selectedEvent.location}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Notes */}
                {selectedEvent.notes && (
                  <View style={styles.modalRow}>
                    <Feather name="file-text" size={18} color={colors.primary} />
                    <View style={styles.modalRowContent}>
                      <Text style={[styles.modalLabel, { color: colors.mutedText }]}>Notes</Text>
                      <Text style={[styles.modalValue, { color: colors.text }]}>
                        {selectedEvent.notes}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* URL */}
                {selectedEvent.url && (
                  <Pressable 
                    style={[styles.urlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleOpenUrl(selectedEvent.url!)}
                  >
                    <Feather name="external-link" size={16} color={colors.primary} />
                    <Text style={[styles.urlButtonText, { color: colors.primary }]}>View Details</Text>
                  </Pressable>
                )}
                
                {/* Set Reminder Button */}
                {!isOwnProfile && onSetReminder && (
                  <Pressable 
                    style={[styles.reminderButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      onSetReminder(selectedEvent);
                      setShowEventModal(false);
                    }}
                  >
                    <Feather name="bell" size={18} color="#fff" />
                    <Text style={styles.reminderButtonText}>+ Reminder</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarScroll: {
    flexGrow: 0,
  },
  pageRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  dayCard: {
    flex: 1,
    borderRadius: 14,
    minHeight: 110,
    overflow: 'hidden',
  },
  todayCard: {
    flex: 1.15,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  todayDayName: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  todayNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  eventSpace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  eventIndicator: {
    alignItems: 'center',
    gap: 2,
  },
  eventCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  noEventText: {
    fontSize: 16,
  },
  expandedCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedDate: {
    fontSize: 16,
    fontWeight: '700',
  },
  expandedEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  expandedEventInfo: {
    flex: 1,
  },
  expandedEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  expandedEventTime: {
    fontSize: 13,
    marginBottom: 4,
  },
  expandedEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandedEventLocation: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalEventTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  modalRowContent: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  urlButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  reminderButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
