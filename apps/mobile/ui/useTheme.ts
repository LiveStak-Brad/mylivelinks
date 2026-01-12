import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getTheme, type ColorSchemeName, type Theme } from './theme';

export function useTheme(): Theme {
  const schemeRaw = useColorScheme();
  const scheme: ColorSchemeName = schemeRaw === 'dark' ? 'dark' : 'light';
  return useMemo(() => getTheme(scheme), [scheme]);
}

