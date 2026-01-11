import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GoLiveScreen() {
  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('just-chatting');
  const [audience, setAudience] = useState<'Public' | 'Team'>('Public');

  const categories = useMemo(
    () => [
      { id: 'just-chatting', label: 'Just Chatting', icon: 'chatbubbles-outline' as const },
      { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
      { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' as const },
      { id: 'fitness', label: 'Fitness', icon: 'barbell-outline' as const },
      { id: 'irl', label: 'IRL', icon: 'walk-outline' as const },
      { id: 'sports', label: 'Sports', icon: 'football-outline' as const },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Go Live</Text>
          <Text style={styles.subtitle}>Set up your stream—then go live when you're ready.</Text>
        </View>

        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="text-outline" size={18} color={COLORS.mutedText} style={styles.inputIcon} />
            <TextInput
              value={streamTitle}
              onChangeText={setStreamTitle}
              placeholder="What are you going live about?"
              placeholderTextColor={COLORS.mutedText}
              style={styles.input}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Category Section - Horizontal Slider */}
        <View style={styles.sectionNoPadding}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 14 }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categorySlider}
          >
            {categories.map((c) => {
              const isSelected = c.id === selectedCategoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCategoryId(c.id)}
                  style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${c.label}`}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={isSelected ? COLORS.white : COLORS.mutedText}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Audience Section - Segmented Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audience</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => setAudience('Public')}
              style={[styles.segmentButton, audience === 'Public' && styles.segmentButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Set audience to Public"
            >
              <Ionicons
                name="globe-outline"
                size={16}
                color={audience === 'Public' ? COLORS.white : COLORS.mutedText}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, audience === 'Public' && styles.segmentTextActive]}>Public</Text>
            </Pressable>
            <Pressable
              onPress={() => setAudience('Team')}
              style={[styles.segmentButton, audience === 'Team' && styles.segmentButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Set audience to Team"
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={audience === 'Team' ? COLORS.white : COLORS.mutedText}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, audience === 'Team' && styles.segmentTextActive]}>Team</Text>
            </Pressable>
          </View>
        </View>

        {/* Thumbnail Section - Compact UI Only */}
        <View style={styles.section}>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [styles.thumbnailRow, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Select thumbnail"
          >
            <View style={styles.thumbnailIcon}>
              <Ionicons name="image-outline" size={20} color={COLORS.mutedText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.thumbnailTitle}>Thumbnail</Text>
              <Text style={styles.thumbnailHint}>Tap to add cover image (optional)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [styles.goLiveButton, pressed && styles.goLiveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
          >
            <Ionicons name="radio-outline" size={20} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={styles.goLiveText}>Go Live</Text>
          </Pressable>
          <Text style={styles.disclaimer}>This is a mock setup screen. Going live is UI-only here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: '#0B0C10',
  card: '#12131A',
  border: 'rgba(255,255,255,0.10)',
  text: 'rgba(255,255,255,0.92)',
  mutedText: 'rgba(255,255,255,0.60)',
  white: '#FFFFFF',
  primary: '#6366F1',
  primaryPressed: '#4F46E5',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.mutedText,
  },
  section: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  sectionNoPadding: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  categorySlider: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  thumbnailHint: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedText,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 8,
  },
  goLiveButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  goLiveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  goLiveText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.mutedText,
    textAlign: 'center',
  },
});
