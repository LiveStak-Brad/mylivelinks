// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNavigation = any;

/**
 * Canonical Teams Navigation Contract
 * 
 * This module defines the single source of truth for Teams navigation in the mobile app.
 * All Teams-related navigation must use these helpers to ensure consistent routing.
 * 
 * Navigation Routes:
 * - TeamsScreen: Teams Landing (no params)
 * - TeamsDetailScreen: Team Detail (requires teamId or slug)
 * - SearchTeamsScreen: Teams Search/Discovery
 * - TeamsSetupScreen: Create New Team
 * - TeamsInviteScreen: Team Invite Management
 * - TeamsAdminScreen: Team Admin Panel
 * - TeamsRoomScreen: Team Live Room
 */

export type TeamsNavigationParams = {
  TeamsScreen: undefined;
  TeamsDetailScreen: { teamId?: string; slug?: string };
  SearchTeamsScreen: undefined;
  TeamsSetupScreen: undefined;
  TeamsInviteScreen: { teamId: string };
  TeamsAdminScreen: { teamId: string };
  TeamsRoomScreen: { teamId: string; roomSlug?: string };
};

/**
 * Navigate to Teams Landing page
 */
export function navigateToTeamsLanding(navigation: AnyNavigation) {
  navigation.navigate('TeamsScreen' as never);
}

/**
 * Navigate to Team Detail page
 * @param teamId - Required team ID
 * @param slug - Optional team slug for display
 */
export function navigateToTeamDetail(
  navigation: AnyNavigation,
  params: { teamId: string; slug?: string }
) {
  if (!params.teamId) {
    console.error('[teamNavigation] navigateToTeamDetail requires teamId');
    return;
  }
  navigation.navigate('TeamsDetailScreen' as never, params as never);
}

/**
 * Navigate to Teams Search/Discovery
 */
export function navigateToTeamsSearch(navigation: AnyNavigation) {
  navigation.navigate('SearchTeamsScreen' as never);
}

/**
 * Navigate to Create Team flow
 */
export function navigateToTeamsSetup(navigation: AnyNavigation) {
  navigation.navigate('TeamsSetupScreen' as never);
}

/**
 * Navigate to Team Invite Management
 */
export function navigateToTeamInvite(navigation: AnyNavigation, teamId: string) {
  if (!teamId) {
    console.error('[teamNavigation] navigateToTeamInvite requires teamId');
    return;
  }
  navigation.navigate('TeamsInviteScreen' as never, { teamId } as never);
}

/**
 * Navigate to Team Admin Panel
 */
export function navigateToTeamAdmin(navigation: AnyNavigation, teamId: string) {
  if (!teamId) {
    console.error('[teamNavigation] navigateToTeamAdmin requires teamId');
    return;
  }
  navigation.navigate('TeamsAdminScreen' as never, { teamId } as never);
}

/**
 * Navigate to Team Live Room
 */
export function navigateToTeamRoom(
  navigation: AnyNavigation,
  params: { teamId: string; roomSlug?: string }
) {
  if (!params.teamId) {
    console.error('[teamNavigation] navigateToTeamRoom requires teamId');
    return;
  }
  navigation.navigate('TeamsRoomScreen' as never, params as never);
}
