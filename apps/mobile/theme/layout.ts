import { StyleSheet } from 'react-native';

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const space = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
} as const;

export const stroke = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
} as const;

