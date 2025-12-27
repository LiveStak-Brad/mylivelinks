/**
 * MixerModal Component - Mobile
 * 
 * 12-slot volume mixer for LiveKit audio tracks
 * Local state only, exposes onChange callback for external logic
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface MixerModalProps {
  visible: boolean;
  onClose: () => void;
  onChange?: (slotIndex: number, value: number) => void;
}

export function MixerModal({ visible, onClose, onChange }: MixerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  // Local state: 12 volume sliders, default 1.0
  const [volumes, setVolumes] = useState<number[]>(Array(12).fill(1.0));

  const handleVolumeChange = (slotIndex: number, value: number) => {
    const newVolumes = [...volumes];
    newVolumes[slotIndex] = value;
    setVolumes(newVolumes);
    
    // Notify parent component
    onChange?.(slotIndex, value);
  };

  const handleReset = () => {
    const defaultVolumes = Array(12).fill(1.0);
    setVolumes(defaultVolumes);
    // Notify parent for all slots
    defaultVolumes.forEach((vol, idx) => onChange?.(idx, vol));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 20) + 40 }]}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />

        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Audio Mixer</Text>
            <View style={styles.headerRight}>
              <Pressable style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 12 Volume Sliders */}
            {volumes.map((volume, index) => (
              <View key={index} style={styles.sliderRow}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.sliderLabelText}>Slot {index + 1}</Text>
                  <Text style={styles.sliderValue}>{Math.round(volume * 100)}%</Text>
                </View>
                <CustomSlider
                  value={volume}
                  onValueChange={(value) => handleVolumeChange(index, value)}
                  theme={theme}
                  styles={styles}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Simple custom slider component using gesture handlers
interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  theme: ThemeDefinition;
  styles: Styles;
}

function CustomSlider({ value, onValueChange, theme, styles }: CustomSliderProps) {
  const [width, setWidth] = useState(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (width > 0) {
        const newValue = Math.max(0, Math.min(1, event.x / width));
        onValueChange(newValue);
      }
    });

  return (
    <View
      style={[styles.sliderContainer, { backgroundColor: theme.colors.border }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              { width: `${value * 100}%`, backgroundColor: theme.colors.accent },
            ]}
          />
          <View
            style={[
              styles.sliderThumb,
              { left: `${value * 100}%`, backgroundColor: theme.colors.accent },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';
  const accent = theme.colors.accent;
  const accentSecondary = theme.colors.accentSecondary;
  const textPrimary = theme.colors.textPrimary;
  const textMuted = theme.colors.textMuted;

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.menuBackdrop,
      justifyContent: 'flex-start',
    },
    backdropTouchable: {
      flex: 1,
    },
    menuContainer: {
      backgroundColor: isLight ? theme.colors.cardSurface : theme.colors.menuBackground,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      maxHeight: '80%',
      overflow: 'hidden',
      shadowColor: theme.colors.menuShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 1,
      borderColor: theme.colors.menuBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isLight ? 'rgba(139, 92, 246, 0.18)' : theme.colors.menuBorder,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isLight ? accent : theme.colors.textPrimary,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    resetButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.accent,
      borderRadius: 6,
    },
    resetButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      color: textMuted,
      fontWeight: '300',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    sliderRow: {
      marginBottom: 20,
    },
    sliderLabel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sliderLabelText: {
      fontSize: 14,
      fontWeight: '600',
      color: isLight ? textPrimary : theme.colors.textPrimary,
    },
    sliderValue: {
      fontSize: 12,
      fontWeight: '700',
      color: isLight ? accentSecondary : theme.colors.accent,
      minWidth: 40,
      textAlign: 'right',
    },
    sliderContainer: {
      width: '100%',
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    sliderTrack: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    sliderFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 20,
    },
    sliderThumb: {
      position: 'absolute',
      top: '50%',
      width: 24,
      height: 24,
      borderRadius: 12,
      marginLeft: -12,
      marginTop: -12,
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
  });
}

