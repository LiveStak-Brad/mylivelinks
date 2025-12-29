/**
 * ProfileTypePickerModal Component
 * 
 * A modal for selecting profile type with card-based UI
 * UI-only component with placeholder save handler
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { supabase, supabaseConfigured } from '../lib/supabase';

export type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator';

type ProfileTypeOption = {
  id: ProfileType;
  iconName: string;
  title: string;
  description: string;
};

const PROFILE_TYPES: ProfileTypeOption[] = [
  {
    id: 'streamer',
    iconName: 'radio',
    title: 'Streamer',
    description: 'Live streaming and broadcasting content',
  },
  {
    id: 'musician',
    iconName: 'musical-notes',
    title: 'Musician / Artist',
    description: 'Music performances and creative arts',
  },
  {
    id: 'comedian',
    iconName: 'happy',
    title: 'Comedian',
    description: 'Comedy shows and entertainment',
  },
  {
    id: 'business',
    iconName: 'briefcase',
    title: 'Business / Brand',
    description: 'Professional and corporate presence',
  },
  {
    id: 'creator',
    iconName: 'sparkles',
    title: 'Creator',
    description: 'General content creation (default)',
  },
];

type ProfileTypePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  currentType?: ProfileType;
  onSelect?: (type: ProfileType) => void;
  allowSkip?: boolean;
  cardOpacity?: number; // User-selected opacity (from profile settings)
};

export function ProfileTypePickerModal({
  visible,
  onClose,
  currentType = 'creator',
  onSelect,
  allowSkip = false,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: ProfileTypePickerModalProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);
  const [selectedType, setSelectedType] = useState<ProfileType>(currentType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedType(currentType);
    setSaving(false);
    setError(null);
  }, [currentType, visible]);

  const persistProfileType = async (nextType: ProfileType) => {
    if (!supabaseConfigured) throw new Error('Supabase client not initialized.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to update your profile type.');
    const { error } = await supabase
      .from('profiles')
      .update({ profile_type: nextType })
      .eq('id', user.id);
    if (error) throw error;
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await persistProfileType(selectedType);
      onSelect?.(selectedType);
      onClose();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : 'Failed to save profile type.';
      setError(msg);
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await persistProfileType('creator');
      onSelect?.('creator');
      onClose();
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : 'Failed to save profile type.';
      setError(msg);
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCardPress = (type: ProfileType) => {
    setSelectedType(type);
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Profile Type</Text>
            <Pressable 
              style={styles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {/* Type Cards */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {PROFILE_TYPES.map((option) => (
              <ProfileTypeCard
                key={option.id}
                option={option}
                selected={selectedType === option.id}
                onPress={() => handleCardPress(option.id)}
                styles={styles}
              />
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.continueButtonPressed,
              ]}
              onPress={handleContinue}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.continueButtonText}>Saving…</Text>
                </View>
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </Pressable>

            {allowSkip && (
              <Pressable
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.skipButtonPressed,
                ]}
                onPress={handleSkip}
                disabled={saving}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

// Profile Type Card Component
type ProfileTypeCardProps = {
  option: ProfileTypeOption;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
};

function ProfileTypeCard({ option, selected, onPress, styles }: ProfileTypeCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeCard,
        selected && styles.typeCardSelected,
        pressed && styles.typeCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.typeCardContent}>
        <Ionicons name={option.iconName as any} size={32} color={selected ? styles.typeTitleSelected.color : styles.typeTitle.color} />
        <View style={styles.typeTextContainer}>
          <Text style={[styles.typeTitle, selected && styles.typeTitleSelected]}>
            {option.title}
          </Text>
          <Text style={[styles.typeDescription, selected && styles.typeDescriptionSelected]}>
            {option.description}
          </Text>
        </View>
      </View>
      {selected && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeDefinition, cardOpacity: number = 0.95) {
  const isLight = theme.mode === 'light';
  const modalShadow = theme.elevations.modal;

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      padding: 20,
      justifyContent: 'center',
    },
    modalCard: {
      borderRadius: 18,
      backgroundColor: isLight ? theme.colors.surfaceCard : theme.tokens.surfaceModal,
      opacity: cardOpacity, // Apply user-selected opacity
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      maxHeight: '85%',
      shadowColor: modalShadow.color,
      shadowOpacity: modalShadow.opacity,
      shadowRadius: modalShadow.radius,
      shadowOffset: modalShadow.offset,
      elevation: modalShadow.elevation,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: isLight ? theme.colors.surfaceCard : theme.colors.card,
    },
    typeCardSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: isLight ? theme.colors.highlight : 'rgba(139, 92, 246, 0.15)',
    },
    typeCardPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    typeCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 14,
    },
    typeTextContainer: {
      flex: 1,
      gap: 4,
    },
    typeTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    typeTitleSelected: {
      color: theme.colors.accent,
    },
    typeDescription: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    typeDescriptionSelected: {
      color: theme.colors.textSecondary,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: {
      padding: 18,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    savingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    continueButton: {
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.elevations.card.color,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: theme.elevations.card.radius,
      shadowOffset: theme.elevations.card.offset,
      elevation: theme.elevations.card.elevation,
    },
    continueButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    skipButton: {
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipButtonPressed: {
      opacity: 0.6,
    },
    skipButtonText: {
      color: theme.colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

