import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      {/* Full-screen Camera Preview (UI placeholder) */}
      <View style={styles.cameraPreview}>
        <View style={styles.previewPlaceholder}>
          <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.previewText}>Camera Preview</Text>
          <Text style={styles.previewHint}>
            {cameraFacing === 'front' ? 'Front camera' : 'Back camera'}
          </Text>
        </View>
      </View>

      {/* Top Controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={COLORS.white} />
        </Pressable>

        <View style={styles.topSpacer} />

        <Pressable
          onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Setup Modal Overlay */}
      <View style={[styles.modalOverlay, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Go Live</Text>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={streamTitle}
                onChangeText={setStreamTitle}
                placeholder="What are you streaming?"
                placeholderTextColor={COLORS.mutedText}
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Category - Horizontal Slider */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categorySlider}
            style={styles.categoryScrollView}
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
                    size={15}
                    color={isSelected ? COLORS.white : COLORS.mutedText}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Audience & Thumbnail Row */}
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Audience</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => setAudience('Public')}
                  style={[styles.segmentButton, audience === 'Public' && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, audience === 'Public' && styles.segmentTextActive]}>Public</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAudience('Team')}
                  style={[styles.segmentButton, audience === 'Team' && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, audience === 'Team' && styles.segmentTextActive]}>Team</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.thumbnailButton, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Add thumbnail"
            >
              <Ionicons name="image-outline" size={20} color={COLORS.mutedText} />
              <Text style={styles.thumbnailLabel}>Thumbnail</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Go Live Button */}
        <View style={styles.modalFooter}>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [styles.goLiveButton, pressed && styles.goLiveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
          >
            <View style={styles.liveIndicator} />
            <Text style={styles.goLiveText}>Go Live</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const COLORS = {
  bg: '#000000',
  modal: '#12131A',
  modalBorder: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.95)',
  mutedText: 'rgba(255,255,255,0.50)',
  white: '#FFFFFF',
  primary: '#EF4444',
  primaryPressed: '#DC2626',
  inputBg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Camera Preview
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
  },
  previewHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  topButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topSpacer: {
    flex: 1,
  },

  // Modal Overlay
  modalOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.modal,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.modalBorder,
    maxHeight: '55%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  // Fields
  field: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Category Slider
  categoryScrollView: {
    marginHorizontal: -20,
    marginBottom: 14,
  },
  categorySlider: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderColor: 'transparent',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
  },

  // Row Fields
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  thumbnailButton: {
    width: 64,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thumbnailLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.mutedText,
  },

  // Footer
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  goLiveButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goLiveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  goLiveText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
