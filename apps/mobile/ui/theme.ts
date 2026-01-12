import { StyleSheet } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';

export type Theme = {
  scheme: ColorSchemeName;
  colors: {
    // Brand
    brandPrimary: string;
    brandSecondary: string;
    brandAccentCyan: string;

    // Semantic
    success: string;
    warning: string;
    error: string;

    // Surfaces
    bg: string;
    surface: string;
    surface2: string;
    overlay: string;
    border: string;

    // Text
    text: string;
    textMuted: string;
    textSubtle: string;
    textOnBrand: string;

    // Interactive
    focusRing: string;
    pressedOverlay: string;

    // Nav
    tabBarBg: string;
    tabBarBorder: string;
    tabIconInactive: string;
    tabIconActive: string;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  space: {
    2: number;
    4: number;
    6: number;
    8: number;
    10: number;
    12: number;
    14: number;
    16: number;
    20: number;
    24: number;
  };
  stroke: {
    hairline: number;
    thin: number;
    thick: number;
  };
  typography: {
    screenTitle: { fontSize: number; fontWeight: '700' | '800' | '900'; letterSpacing?: number };
    sectionHeader: { fontSize: number; fontWeight: '700' | '800' | '900'; letterSpacing?: number };
    body: { fontSize: number; fontWeight: '400' | '500' | '600' | '700' | '800' | '900'; lineHeight?: number };
    caption: { fontSize: number; fontWeight: '400' | '500' | '600' | '700' | '800' | '900'; lineHeight?: number };
  };
};

/**
 * Brand usage rules (mobile):
 * - brandPrimary: Primary call-to-action, active tab highlight, selection states.
 * - brandSecondary: Secondary emphasis (badges, supporting highlights).
 * - brandAccentCyan: Occasional accent (stats, highlights) – keep sparse.
 * - success/warning/error: Always use for state, never re-use brand colors for status.
 *
 * Light mode: clean neutrals with clear borders.
 * Dark mode: true-dark background + elevated surfaces (avoid gray-on-gray mush).
 */
export function getTheme(scheme: ColorSchemeName): Theme {
  const brandPrimary = '#EC4899'; // existing (pink)
  const brandSecondary = '#7C3AED'; // existing (purple)
  const brandAccentCyan = '#22D3EE'; // existing (cyan; used in tiers)

  const success = '#22C55E';
  const warning = '#F59E0B';
  const error = '#EF4444';

  const isDark = scheme === 'dark';

  const bg = isDark ? '#0B0B0F' : '#FFFFFF';
  const surface = isDark ? '#12121A' : '#FFFFFF';
  const surface2 = isDark ? '#151521' : '#F8FAFC';
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB';
  const text = isDark ? '#F5F6FA' : '#0F172A';
  const textMuted = isDark ? 'rgba(245,246,250,0.78)' : '#334155';
  // "Muted" in dark still needs to be readable.
  const textSubtle = isDark ? 'rgba(245,246,250,0.62)' : '#64748B';

  const tabBarBg = isDark ? '#0B0B0F' : '#FFFFFF';
  const tabBarBorder = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB';
  const tabIconInactive = isDark ? 'rgba(245,246,250,0.55)' : '#6B7280';
  const tabIconActive = brandPrimary;

  return {
    scheme,
    colors: {
      brandPrimary,
      brandSecondary,
      brandAccentCyan,
      success,
      warning,
      error,
      bg,
      surface,
      surface2,
      overlay: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15, 23, 42, 0.35)',
      border,
      text,
      textMuted,
      textSubtle,
      textOnBrand: '#FFFFFF',
      focusRing: brandPrimary,
      pressedOverlay: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
      tabBarBg,
      tabBarBorder,
      tabIconInactive,
      tabIconActive,
    },
    radii: {
      sm: 10,
      md: 12,
      lg: 14,
      xl: 18,
      pill: 999,
    },
    space: {
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
    },
    stroke: {
      hairline: StyleSheet.hairlineWidth,
      thin: 1,
      thick: 2,
    },
    typography: {
      screenTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.2 },
      sectionHeader: { fontSize: 16, fontWeight: '900', letterSpacing: -0.1 },
      body: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
    },
  };
}

