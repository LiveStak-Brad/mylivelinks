/**
 * ProfileTypePickerModal Component
 * 
 * A modal for selecting profile type with card-based UI
 * UI-only component with placeholder save handler
 */

import React, { useMemo, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

export type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator';

type ProfileTypeOption = {
  id: ProfileType;
  icon: string;
  title: string;
  description: string;
};

const PROFILE_TYPES: ProfileTypeOption[] = [
  {
    id: 'streamer',
    icon: '📡',
    title: 'Streamer',
    description: 'Live streaming and broadcasting content',
  },
  {
    id: 'musician',
    icon: '🎵',
    title: 'Musician / Artist',
    description: 'Music performances and creative arts',
  },
  {
    id: 'comedian',
    icon: '🎭',
    title: 'Comedian',
    description: 'Comedy shows and entertainment',
  },
  {
    id: 'business',
    icon: '💼',
    title: 'Business / Brand',
    description: 'Professional and corporate presence',
  },
  {
    id: 'creator',
    icon: '✨',
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

  const handleContinue = () => {
    // Placeholder: In future, this will call the save handler
    if (onSelect) {
      onSelect(selectedType);
    }
    onClose();
  };

  const handleSkip = () => {
    // Set to creator (default) and close
    if (onSelect) {
      onSelect('creator');
    }
    onClose();
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
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
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
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </Pressable>

            {allowSkip && (
              <Pressable
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.skipButtonPressed,
                ]}
                onPress={handleSkip}
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
        <Text style={styles.typeIcon}>{option.icon}</Text>
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
          <Text style={styles.checkmarkText}>✓</Text>
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
      padding: 4,
    },
    closeButtonText: {
      fontSize: 22,
      color: theme.colors.textMuted,
      fontWeight: '300',
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
    typeIcon: {
      fontSize: 32,
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
    checkmarkText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    actions: {
      padding: 18,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
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

