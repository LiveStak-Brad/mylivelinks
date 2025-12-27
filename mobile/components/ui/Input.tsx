import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

export function Input({ containerStyle, style, placeholderTextColor, ...props }: InputProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const placeholderColor = placeholderTextColor ?? theme.colors.textMuted;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={placeholderColor}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        {...props}
      />
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    input: {
      height: 46,
      borderRadius: 14,
      paddingHorizontal: 14,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.elevations.card.color,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: theme.elevations.card.radius,
      shadowOffset: theme.elevations.card.offset,
      elevation: theme.elevations.card.elevation,
    },
  });
}
