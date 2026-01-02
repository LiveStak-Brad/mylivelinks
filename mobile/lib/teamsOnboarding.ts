/**
 * Teams Onboarding State
 * 
 * Manages the teams_onboarding_completed flag using AsyncStorage.
 * - When false (default): Teams tab routes to TeamsSetup
 * - When true: Teams tab routes to TeamsHome
 * 
 * Flag is set to true when user:
 * - Creates a team
 * - Joins a team
 * - Taps "Skip for now"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAMS_ONBOARDING_KEY = 'mylivelinks_teams_onboarding_completed';

/**
 * Check if teams onboarding has been completed
 */
export async function getTeamsOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TEAMS_ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('[teamsOnboarding] Failed to read onboarding state:', error);
    return false;
  }
}

/**
 * Mark teams onboarding as completed
 */
export async function setTeamsOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TEAMS_ONBOARDING_KEY, 'true');
  } catch (error) {
    console.warn('[teamsOnboarding] Failed to save onboarding state:', error);
  }
}

/**
 * Reset teams onboarding state (for testing/debugging)
 */
export async function resetTeamsOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TEAMS_ONBOARDING_KEY);
  } catch (error) {
    console.warn('[teamsOnboarding] Failed to reset onboarding state:', error);
  }
}
