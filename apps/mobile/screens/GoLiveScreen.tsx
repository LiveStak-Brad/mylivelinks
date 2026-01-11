import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GoLiveScreen() {
  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('just-chatting');
  const [audience, setAudience] = useState<'Public' | 'Team'>('Public');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Category Section - Horizontal Pills Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipsWrap}>
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
          </View>
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

        {/* Thumbnail Section - UI Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thumbnail</Text>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [styles.thumbnailCard, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Select thumbnail"
          >
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={32} color={COLORS.mutedText} />
              <Text style={styles.thumbnailText}>Tap to add cover image</Text>
              <Text style={styles.thumbnailHint}>Optional</Text>
            </View>
          </Pressable>
        </View>

        {/* Camera Section - Flip Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Camera</Text>
          <Pressable
            onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
            style={({ pressed }) => [styles.flipCameraButton, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
          >
            <View style={styles.flipCameraIcon}>
              <Ionicons name="camera-reverse-outline" size={22} color={COLORS.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flipCameraTitle}>Flip Camera</Text>
              <Text style={styles.flipCameraMeta}>
                Currently using {cameraFacing === 'front' ? 'front' : 'back'} camera
              </Text>
            </View>
            <View style={styles.cameraIndicator}>
              <Ionicons
                name={cameraFacing === 'front' ? 'person-outline' : 'videocam-outline'}
                size={16}
                color={COLORS.primary}
              />
            </View>
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
          <Text style={styles.disclaimer}>This is a mock setup screen. Going live is UI-only here (no streaming starts).</Text>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.mutedText,
  },
  section: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  thumbnailCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  thumbnailHint: {
    fontSize: 12,
    color: COLORS.mutedText,
  },
  flipCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    gap: 12,
  },
  flipCameraIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCameraTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  flipCameraMeta: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.mutedText,
  },
  cameraIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 14,
    gap: 10,
  },
  goLiveButton: {
    height: 54,
    borderRadius: 16,
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
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mutedText,
  },
});
