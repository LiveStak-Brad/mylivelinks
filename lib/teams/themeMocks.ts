import type { TeamThemeTokens } from '@/types/teams';

/**
 * UI-only helper that provides mock theme tokens per team.
 * Replace with real backend data once team customization wiring ships.
 */
const TEAM_THEME_MOCKS: Record<string, TeamThemeTokens> = {
  team_demo_001: {
    primary: '#FF5F6D',
    accent: '#FFC371',
    fontFamily: '"Outfit", "Inter", sans-serif',
    emoteSet: 'sparkburst',
  },
  team_demo_002: {
    primary: '#6EE7B7',
    accent: '#3B82F6',
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
    emoteSet: 'aetherwave',
  },
  team_demo_003: {
    primary: '#C084FC',
    accent: '#F472B6',
    fontFamily: '"General Sans", "Inter", sans-serif',
    emoteSet: 'petalpop',
  },
};

export function getMockTeamTheme(teamId?: string, fallback?: TeamThemeTokens | null): TeamThemeTokens | null {
  if (fallback) {
    return fallback;
  }
  if (!teamId) {
    return null;
  }
  return TEAM_THEME_MOCKS[teamId] ?? null;
}

export type { TeamThemeTokens } from '@/types/teams';
