import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../../ui/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function Button({
  label,
  variant = 'primary',
  left,
  right,
  style,
  disabled,
  onPress,
}: {
  label: string;
  variant?: ButtonVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const { containerStyle, textStyle } = getVariantStyles(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && !disabled ? { opacity: 0.9 } : null,
        disabled ? { opacity: 0.55 } : null,
        style,
      ]}
    >
      {left ? <View style={styles.iconSlot}>{left}</View> : null}
      <Text style={[styles.label, textStyle]}>{label}</Text>
      {right ? <View style={styles.iconSlot}>{right}</View> : null}
    </Pressable>
  );
}

function getVariantStyles(theme: ReturnType<typeof useTheme>, variant: ButtonVariant): { containerStyle: ViewStyle; textStyle: TextStyle } {
  const base: ViewStyle = {
    borderRadius: theme.radii.md,
    borderWidth: theme.stroke.thin,
    minHeight: 44,
    paddingHorizontal: theme.space[14],
    paddingVertical: theme.space[10],
  };

  if (variant === 'primary') {
    return {
      containerStyle: { ...base, backgroundColor: theme.colors.brandPrimary, borderColor: 'rgba(255,255,255,0.10)' },
      textStyle: { color: theme.colors.textOnBrand, fontWeight: '900' },
    };
  }

  if (variant === 'secondary') {
    return {
      containerStyle: { ...base, backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
      textStyle: { color: theme.colors.text, fontWeight: '900' },
    };
  }

  if (variant === 'destructive') {
    return {
      containerStyle: { ...base, backgroundColor: theme.colors.error, borderColor: 'rgba(255,255,255,0.10)' },
      textStyle: { color: theme.colors.textOnBrand, fontWeight: '900' },
    };
  }

  // ghost
  return {
    containerStyle: { ...base, backgroundColor: 'transparent', borderColor: 'transparent' },
    textStyle: { color: theme.colors.brandPrimary, fontWeight: '900' },
  };
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
  },
});

