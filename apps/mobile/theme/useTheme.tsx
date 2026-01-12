import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { type ThemeMode, semanticColors, type SemanticColors } from './colors';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: SemanticColors;
};

const STORAGE_KEY = 'theme_mode:v1';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Evidence-based default: the app is currently hardcoded light in shared chrome (TopBar/menus),
  // so we default to light unless user explicitly chooses otherwise.
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw === 'dark' || raw === 'light') {
          setModeState(raw);
        }
      })
      .catch((err) => {
        console.warn('[theme] failed to load saved theme mode:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((err) => {
      console.warn('[theme] failed to persist theme mode:', err);
    });
  }, []);

  const colors = useMemo(() => semanticColors(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      colors,
    }),
    [colors, mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

