import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Brand colors from logo palette - 5 distinct colors
const COLOR_PINK = '#E91E8C';      // Hot pink
const COLOR_CYAN = '#00D4FF';       // Bright cyan
const COLOR_PURPLE = '#A855F7';     // Purple
const COLOR_CORAL = '#FF6B9D';      // Coral pink
const COLOR_VIOLET = '#8B5CF6';     // Blue-violet

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
        {/* Battle - Crossed swords icon */}
        <Pressable
          onPress={onBattle}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <MaterialCommunityIcons name="sword-cross" size={24} color={COLOR_PINK} />
        </Pressable>
        <ControlButton icon="person-add-outline" onPress={onCoHost} color={COLOR_PURPLE} />
        <ControlButton icon="people-outline" onPress={onGuests} color={COLOR_CYAN} />
        <ControlButton icon="settings-outline" onPress={onSettings} color={COLOR_CORAL} />
        <ControlButton icon="color-filter-outline" onPress={onFilters} color={COLOR_VIOLET} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // No background - buttons float on gradient
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
