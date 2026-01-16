import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 48) / 7;
const TOTAL_WEEKS = 7; // 3 weeks back + current + 3 weeks forward

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventAdded: () => void;
  colors: any;
}

interface WeekData {
  weekStart: Date;
  days: Date[];
}

function getWeeksData(centerDate: Date): WeekData[] {
  const weeks: WeekData[] = [];
  
  // Start from 3 weeks before center
  const startDate = new Date(centerDate);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 21);
  
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);
    
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      days.push(day);
    }
    weeks.push({ weekStart, days });
  }
  
  return weeks;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function AddEventModal({
  visible,
  onClose,
  onEventAdded,
  colors,
}: AddEventModalProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(3); // Center week (index 3 of 7)
  const scrollRef = useRef<ScrollView>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('00');
  const [isPM, setIsPM] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const weeks = getWeeksData(today);
  
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const weekWidth = SCREEN_WIDTH - 32;
    const newIndex = Math.round(offsetX / weekWidth);
    if (newIndex !== currentWeekIndex && newIndex >= 0 && newIndex < TOTAL_WEEKS) {
      setCurrentWeekIndex(newIndex);
    }
  };
  
  const goToPrevWeek = () => {
    if (currentWeekIndex > 0) {
      const newIndex = currentWeekIndex - 1;
      setCurrentWeekIndex(newIndex);
      scrollRef.current?.scrollTo({ x: newIndex * (SCREEN_WIDTH - 32), animated: true });
    }
  };
  
  const goToNextWeek = () => {
    if (currentWeekIndex < TOTAL_WEEKS - 1) {
      const newIndex = currentWeekIndex + 1;
      setCurrentWeekIndex(newIndex);
      scrollRef.current?.scrollTo({ x: newIndex * (SCREEN_WIDTH - 32), animated: true });
    }
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }
    
    setSaving(true);
    try {
      // Build start_at timestamp
      let hours = parseInt(hour, 10);
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      const startAt = new Date(selectedDate);
      startAt.setHours(hours, parseInt(minute, 10), 0, 0);
      
      const { error } = await supabase.rpc('upsert_profile_event', {
        p_event: {
          title: title.trim(),
          start_at: startAt.toISOString(),
          location: location.trim() || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
        },
      });
      
      if (error) throw error;
      
      // Reset form
      setTitle('');
      setLocation('');
      setUrl('');
      setNotes('');
      setHour('7');
      setMinute('00');
      setIsPM(true);
      setSelectedDate(today);
      
      onEventAdded();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const currentMonth = weeks[currentWeekIndex]?.days[3]?.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }) || '';
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Event</Text>
            <Pressable
              onPress={handleSave}
              disabled={saving || !title.trim()}
              style={[
                styles.saveBtn,
                { backgroundColor: title.trim() ? colors.primary : colors.border },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
          
          {/* Calendar Navigation */}
          <View style={styles.calendarNav}>
            <Pressable onPress={goToPrevWeek} disabled={currentWeekIndex === 0}>
              <Feather
                name="chevron-left"
                size={24}
                color={currentWeekIndex === 0 ? colors.border : colors.text}
              />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{currentMonth}</Text>
            <Pressable onPress={goToNextWeek} disabled={currentWeekIndex === TOTAL_WEEKS - 1}>
              <Feather
                name="chevron-right"
                size={24}
                color={currentWeekIndex === TOTAL_WEEKS - 1 ? colors.border : colors.text}
              />
            </Pressable>
          </View>
          
          {/* Day Labels */}
          <View style={styles.dayLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={[styles.dayLabel, { color: colors.mutedText }]}>
                {d}
              </Text>
            ))}
          </View>
          
          {/* Calendar Weeks (Swipeable) */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentOffset={{ x: 3 * (SCREEN_WIDTH - 32), y: 0 }}
            style={styles.calendarScroll}
          >
            {weeks.map((week, weekIdx) => (
              <View key={weekIdx} style={[styles.weekRow, { width: SCREEN_WIDTH - 32 }]}>
                {week.days.map((day, dayIdx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const isPast = day < today && !isToday;
                  
                  return (
                    <Pressable
                      key={dayIdx}
                      onPress={() => !isPast && setSelectedDate(day)}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.primary },
                        isToday && !isSelected && { borderColor: colors.primary, borderWidth: 2 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: isPast ? colors.border : colors.text },
                          isSelected && { color: '#fff' },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          
          {/* Selected Date Display */}
          <Text style={[styles.selectedDateText, { color: colors.primary }]}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          
          {/* Form */}
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Event Title *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. Live Show at The Venue"
                placeholderTextColor={colors.mutedText}
                value={title}
                onChangeText={setTitle}
              />
            </View>
            
            {/* Time */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[
                    styles.timeInput,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="7"
                  placeholderTextColor={colors.mutedText}
                  value={hour}
                  onChangeText={setHour}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <TextInput
                  style={[
                    styles.timeInput,
                    { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="00"
                  placeholderTextColor={colors.mutedText}
                  value={minute}
                  onChangeText={setMinute}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <View style={styles.ampmToggle}>
                  <Pressable
                    onPress={() => setIsPM(false)}
                    style={[
                      styles.ampmBtn,
                      !isPM && { backgroundColor: colors.primary },
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.ampmText, !isPM && { color: '#fff' }, isPM && { color: colors.text }]}>
                      AM
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsPM(true)}
                    style={[
                      styles.ampmBtn,
                      isPM && { backgroundColor: colors.primary },
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.ampmText, isPM && { color: '#fff' }, !isPM && { color: colors.text }]}>
                      PM
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
            
            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Location</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Venue name or address"
                placeholderTextColor={colors.mutedText}
                value={location}
                onChangeText={setLocation}
              />
            </View>
            
            {/* URL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Ticket/Event URL</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="https://..."
                placeholderTextColor={colors.mutedText}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            
            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.notesInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Additional details..."
                placeholderTextColor={colors.mutedText}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayLabels: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarScroll: {
    flexGrow: 0,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDateText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 12,
  },
  form: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '600',
  },
  ampmToggle: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
