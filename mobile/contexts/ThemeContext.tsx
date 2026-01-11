import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Theme as NavigationTheme } from '@react-navigation/native';

export type ThemeMode = 'light' | 'dark';

export type ThemeTokens = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  surfaceCard: string;
  surfaceModal: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  accentPrimary: string;
  accentSecondary: string;
  shadow: {
    color: string;
    opacity: number;
    radius: number;
    offset: { width: number; height: number };
    elevation: number;
  };
};

type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  cardAlt: string;
  cardSurface: string;
  surfaceCard: string;
  surfaceModal: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  warning: string;
  error: string;
  text: string;
  mutedText: string;
  icon: string;
  overlay: string;
  menuBackdrop: string;
  menuBackground: string;
  menuBorder: string;
  menuShadow: string;
  tabBar: string;
  tabBorder: string;
  accent: string;
  accentSecondary: string;
  success: string;
  danger: string;
  highlight: string;
};

export type ThemeDefinition = {
  mode: ThemeMode;
  tokens: ThemeTokens;
  colors: ThemeColors;
  elevations: {
    card: ThemeTokens['shadow'];
    modal: ThemeTokens['shadow'];
    floating: ThemeTokens['shadow'];
  };
};

type ThemeContextValue = {
  mode: ThemeMode;
  theme: ThemeDefinition;
  navigationTheme: NavigationTheme;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  hydrated: boolean;
  cardOpacity: number;
  setCardOpacity: (opacity: number) => void;
};

const STORAGE_KEY = 'mylivelinks_theme_mode';
const OPACITY_KEY = 'mylivelinks_card_opacity';
const LEGACY_KEY = 'theme_preference';

const lightTokens: ThemeTokens = {
  backgroundPrimary: '#F5F7FB',
  backgroundSecondary: '#EEF2F7',
  surfaceCard: '#FFFFFF',
  surfaceModal: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#6B7280',
  borderSubtle: 'rgba(15, 23, 42, 0.08)',
  accentPrimary: '#8B5CF6',
  accentSecondary: '#5E9BFF',
  shadow: {
    color: '#0F172A',
    opacity: 0.14,
    radius: 14,
    offset: { width: 0, height: 8 },
    elevation: 8,
  },
};

const darkTokens: ThemeTokens = {
  backgroundPrimary: '#0B0F1A',
  backgroundSecondary: '#101729',
  surfaceCard: 'rgba(255, 255, 255, 0.06)',
  surfaceModal: '#121826',
  textPrimary: '#E5E7EB',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  borderSubtle: 'rgba(255, 255, 255, 0.12)',
  accentPrimary: '#8B5CF6',
  accentSecondary: '#5E9BFF',
  shadow: {
    color: '#000000',
    opacity: 0.32,
    radius: 18,
    offset: { width: 0, height: 10 },
    elevation: 12,
  },
};

const buildTheme = (mode: ThemeMode, tokens: ThemeTokens, cardOpacity: number = 1): ThemeDefinition => {
  // Apply user-customizable opacity to surface cards
  const adjustOpacity = (color: string, opacity: number): string => {
    // Parse rgba or rgb
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = rgbaMatch[1];
      const g = rgbaMatch[2];
      const b = rgbaMatch[3];
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // If not rgba, return as-is
    return color;
  };

  const surfaceCardWithOpacity = mode === 'light' 
    ? adjustOpacity('rgb(255, 255, 255)', cardOpacity)
    : adjustOpacity('rgb(255, 255, 255)', 0.06 * cardOpacity);

  return {
    mode,
    tokens: {
      ...tokens,
      surfaceCard: surfaceCardWithOpacity,
    },
    colors: {
      background: tokens.backgroundPrimary,
      surface: tokens.backgroundSecondary,
      card: surfaceCardWithOpacity,
      cardAlt: mode === 'light' ? '#F5F3FF' : 'rgba(255,255,255,0.08)',
      cardSurface: mode === 'light' ? '#FFFFFF' : tokens.surfaceModal,
      surfaceCard: surfaceCardWithOpacity,
      surfaceModal: tokens.surfaceModal,
      border: tokens.borderSubtle,
      textPrimary: tokens.textPrimary,
      textSecondary: tokens.textSecondary,
      textMuted: tokens.textMuted,
      primary: tokens.accentPrimary,
      warning: '#F59E0B',
      error: '#EF4444',
      text: tokens.textPrimary,
      mutedText: tokens.textMuted,
      icon: mode === 'light' ? '#0F172A' : '#E2E8F0',
      overlay: mode === 'light' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(0, 0, 0, 0.55)',
      menuBackdrop: mode === 'light' ? 'rgba(15, 23, 42, 0.25)' : 'rgba(0, 0, 0, 0.6)',
      menuBackground: mode === 'light' ? tokens.surfaceModal : '#0F172A',
      menuBorder: mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : tokens.borderSubtle,
      menuShadow: mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(0, 0, 0, 0.45)',
      tabBar: mode === 'light' ? surfaceCardWithOpacity : '#0D1220',
      tabBorder: tokens.borderSubtle,
      accent: tokens.accentPrimary,
      accentSecondary: tokens.accentSecondary,
      success: '#16A34A',
      danger: '#EF4444',
      highlight: mode === 'light' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.18)',
    },
    elevations: {
      card: tokens.shadow,
      modal: {
        ...tokens.shadow,
        opacity: tokens.shadow.opacity + 0.05,
        radius: tokens.shadow.radius + 2,
        elevation: tokens.shadow.elevation + 2,
      },
      floating: {
        ...tokens.shadow,
        opacity: tokens.shadow.opacity + (mode === 'light' ? 0.02 : 0.06),
        radius: tokens.shadow.radius + 4,
        elevation: tokens.shadow.elevation + 4,
      },
    },
  };
};

export const themeTokens = {
  light: lightTokens,
  dark: darkTokens,
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [cardOpacity, setCardOpacityState] = useState<number>(0.95);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Load theme mode
        const saved = (await SecureStore.getItemAsync(STORAGE_KEY)) as ThemeMode | null;
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        } else {
          const legacy = (await SecureStore.getItemAsync(LEGACY_KEY)) as ThemeMode | null;
          if (legacy === 'light' || legacy === 'dark') {
            setModeState(legacy);
            await SecureStore.setItemAsync(STORAGE_KEY, legacy);
          }
        }
        
        // Load card opacity
        const savedOpacity = await SecureStore.getItemAsync(OPACITY_KEY);
        if (savedOpacity) {
          const opacity = parseFloat(savedOpacity);
          if (!isNaN(opacity) && opacity >= 0.3 && opacity <= 1) {
            setCardOpacityState(opacity);
          }
        }
      } catch {
        // fall back to defaults
      } finally {
        setHydrated(true);
      }
    };
    void load();
  }, []);

  const persistMode = async (next: ThemeMode) => {
    setModeState(next);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch {
      // ignore persistence error; in-memory mode still updates
    }
  };

  const persistOpacity = async (opacity: number) => {
    setCardOpacityState(opacity);
    try {
      await SecureStore.setItemAsync(OPACITY_KEY, opacity.toString());
    } catch {
      // ignore persistence error; in-memory opacity still updates
    }
  };

  const toggleMode = () => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const theme = useMemo(() => {
    const tokens = mode === 'dark' ? darkTokens : lightTokens;
    return buildTheme(mode, tokens, cardOpacity);
  }, [mode, cardOpacity]);

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: mode === 'dark',
      colors: {
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.card,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accentSecondary,
      },
    }),
    [mode, theme.colors]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      theme,
      navigationTheme,
      toggleMode,
      setMode: persistMode,
      hydrated,
      cardOpacity,
      setCardOpacity: persistOpacity,
    }),
    [mode, theme, navigationTheme, hydrated, cardOpacity]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return ctx;
}

