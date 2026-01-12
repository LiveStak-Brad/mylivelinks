import React, { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../ui/useTheme';

export function TextField({
  left,
  right,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (focused) return theme.colors.focusRing;
    return theme.colors.border;
  }, [focused, theme.colors.border, theme.colors.focusRing]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface2,
          borderColor,
          borderRadius: theme.radii.lg,
        },
        containerStyle,
      ]}
    >
      {left ? <View style={styles.slot}>{left}</View> : null}
      <TextInput
        {...props}
        style={[styles.input, { color: theme.colors.text }, style]}
        placeholderTextColor={theme.colors.textSubtle}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {right ? <View style={styles.slot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  slot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
});

