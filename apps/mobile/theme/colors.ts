/**
 * Brand colors (existing):
 * - primary: Primary call-to-action + active tab + selection highlight
 * - secondary: Secondary emphasis (supporting highlights/badges)
 * - accentCyan: Occasional accent (stats/highlights) – use sparingly
 */
export const brand = {
  // Canonical usage
  primary: '#EC4899', // existing pink
  secondary: '#7C3AED', // existing purple
  accentCyan: '#22D3EE', // existing cyan used in tiers

  // Legacy slots kept for back-compat in screens (avoid breaking imports)
  purple: 'hsl(258 90% 58%)',
  pink: 'hsl(328 85% 60%)',
  red: 'hsl(0 84% 60%)',
  hotPink: 'hsl(330 100% 63%)',
  blue: 'hsl(200 98% 50%)',
  amber: 'hsl(43 96% 56%)',
};

export type ThemeMode = 'light' | 'dark';

// Palette tokens are raw colors; app UI should prefer `semanticColors` (below) for consistent theming.
export const lightPalette = {
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate500: '#64748B',
  slate700: '#334155',
  slate900: '#0F172A',
  red600: '#DC2626',
  green600: '#16A34A',
  amber500: '#F59E0B',
  blue600: '#2563EB',
};

export const darkPalette = {
  // Deep navy background (keeps brand accents punchy and avoids pure black)
  navy950: '#070B14',
  navy900: '#0B1220',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate500: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  red500: '#EF4444',
  green500: '#22C55E',
  amber400: '#FBBF24',
  blue400: '#60A5FA',
};

export type SemanticColors = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  mutedText: string;
  subtleText: string;
  border: string;
  icon: string;
  danger: string;
  success: string;
  warning: string;
  link: string;
  overlay: string;
  focusRing: string;
  pressedOverlay: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabIconInactive: string;
  tabIconActive: string;
};

export function semanticColors(mode: ThemeMode): SemanticColors {
  if (mode === 'dark') {
    return {
      // True-dark base + slightly elevated surfaces (avoid gray-on-gray mush)
      bg: '#0B0B0F',
      surface: '#12121A',
      surface2: '#151521',
      text: darkPalette.slate100,
      // Muted text stays readable on dark surfaces
      mutedText: 'rgba(241,245,249,0.78)',
      subtleText: 'rgba(241,245,249,0.62)',
      border: 'rgba(255,255,255,0.10)',
      icon: darkPalette.slate100,
      danger: darkPalette.red500,
      success: darkPalette.green500,
      warning: darkPalette.amber400,
      link: darkPalette.blue400,
      overlay: 'rgba(0,0,0,0.55)',
      focusRing: brand.primary,
      pressedOverlay: 'rgba(255,255,255,0.06)',
      tabBarBg: '#0B0B0F',
      tabBarBorder: 'rgba(255,255,255,0.10)',
      tabIconInactive: 'rgba(241,245,249,0.55)',
      tabIconActive: brand.primary,
    };
  }

  return {
    bg: lightPalette.slate50,
    surface: lightPalette.white,
    surface2: lightPalette.slate100,
    text: lightPalette.slate900,
    mutedText: lightPalette.slate500,
    subtleText: lightPalette.slate500,
    border: lightPalette.slate200,
    icon: lightPalette.slate900,
    danger: lightPalette.red600,
    success: lightPalette.green600,
    warning: lightPalette.amber500,
    link: lightPalette.blue600,
    overlay: 'rgba(15, 23, 42, 0.35)',
    focusRing: brand.primary,
    pressedOverlay: 'rgba(15,23,42,0.04)',
    tabBarBg: lightPalette.white,
    tabBarBorder: lightPalette.slate200,
    tabIconInactive: '#6B7280',
    tabIconActive: brand.primary,
  };
}

