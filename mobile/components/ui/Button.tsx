import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  const textColorStyle = variant === 'secondary' ? styles.textSecondary : styles.textPrimary;
  const indicatorColor = variant === 'secondary' ? theme.colors.textPrimary : '#fff';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={indicatorColor} /> : <Text style={[styles.textBase, textColorStyle, textStyle]}>{title}</Text>}
    </Pressable>
  );
}

function createStyles(theme: ThemeDefinition) {
  const primaryShadow = theme.elevations.card;

  return StyleSheet.create({
    base: {
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    primary: {
      backgroundColor: theme.colors.accent,
      shadowColor: primaryShadow.color,
      shadowOpacity: primaryShadow.opacity,
      shadowRadius: primaryShadow.radius,
      shadowOffset: primaryShadow.offset,
      elevation: primaryShadow.elevation,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    disabled: {
      opacity: 0.55,
    },
    textBase: {
      fontSize: 16,
      fontWeight: '700',
    },
    textPrimary: {
      color: '#fff',
    },
    textSecondary: {
      color: theme.colors.textPrimary,
    },
  });
}
