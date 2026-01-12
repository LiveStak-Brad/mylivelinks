import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HostControlsBarProps {
  onBattle: () => void;
  onCoHost: () => void;
  onGuests: () => void;
  onSettings: () => void;
  onFilters: () => void;
}

interface ControlButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  color?: string;
}

function ControlButton({ icon, onPress, color = '#FFFFFF' }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}

export default function HostControlsBar({
  onBattle,
  onCoHost,
  onGuests,
  onSettings,
  onFilters,
}: HostControlsBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <ControlButton icon="flash-outline" onPress={onBattle} color="#F97316" />
        <ControlButton icon="person-add-outline" onPress={onCoHost} color="#A855F7" />
        <ControlButton icon="people-outline" onPress={onGuests} color="#22C55E" />
        <ControlButton icon="settings-outline" onPress={onSettings} color="#3B82F6" />
        <ControlButton icon="color-filter-outline" onPress={onFilters} color="#06B6D4" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10)',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
