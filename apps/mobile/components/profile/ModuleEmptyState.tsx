import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ModuleEmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  comingSoon?: boolean;
  colors: {
    surface?: string;
    text: string;
    mutedText?: string;
    primary: string;
  };
}

/**
 * Shared empty state component for profile modules.
 * Shows icon, title, description, and optional CTA button.
 * Use comingSoon=true for modules without backend support yet.
 */
export default function ModuleEmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaPress,
  comingSoon = false,
  colors,
}: ModuleEmptyStateProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
        <Feather name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.mutedText || colors.text }]}>
        {description}
      </Text>
      {comingSoon ? (
        <View style={[styles.comingSoonBadge, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.comingSoonText, { color: colors.primary }]}>Coming Soon</Text>
        </View>
      ) : ctaLabel && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Helper to conditionally render a module section.
 * - If not enabled: returns null
 * - If enabled + has data: renders content
 * - If enabled + no data + isOwner: renders owner empty state
 * - If enabled + no data + visitor: returns null
 */
export function renderModuleIfEnabled<T>({
  enabled,
  isOwner,
  data,
  hasData,
  renderContent,
  renderOwnerEmpty,
}: {
  enabled: boolean;
  isOwner: boolean;
  data: T;
  hasData: (data: T) => boolean;
  renderContent: () => React.ReactNode;
  renderOwnerEmpty: () => React.ReactNode;
}): React.ReactNode {
  if (!enabled) return null;
  
  if (hasData(data)) {
    return renderContent();
  }
  
  if (isOwner) {
    return renderOwnerEmpty();
  }
  
  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  comingSoonBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
