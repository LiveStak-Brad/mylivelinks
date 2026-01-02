import type { TeamRole } from './types';

export interface TeamAdminCapabilities {
  canAccessAdminArea: boolean;
  canApproveMemberRequests: boolean;
  canRejectMemberRequests: boolean;
  canViewMembers: boolean;
  canEditMemberRoles: boolean;
  canMuteMembers: boolean;
  canBanMembers: boolean;
  canEditLivePermissions: boolean;
  canEditCustomization: boolean;
  canManageEmotes: boolean;
  canViewAudit: boolean;
}

export function getTeamAdminCapabilities(role: TeamRole): TeamAdminCapabilities {
  switch (role) {
    case 'Team_Admin':
      return {
        canAccessAdminArea: true,
        canApproveMemberRequests: true,
        canRejectMemberRequests: true,
        canViewMembers: true,
        canEditMemberRoles: true,
        canMuteMembers: true,
        canBanMembers: true,
        canEditLivePermissions: true,
        canEditCustomization: true,
        canManageEmotes: true,
        canViewAudit: true,
      };
    case 'Team_Moderator':
      return {
        canAccessAdminArea: true,
        canApproveMemberRequests: false,
        canRejectMemberRequests: false,
        canViewMembers: false,
        canEditMemberRoles: false,
        canMuteMembers: true,
        canBanMembers: true,
        canEditLivePermissions: false,
        canEditCustomization: false,
        canManageEmotes: false,
        canViewAudit: true,
      };
    case 'Team_Member':
    default:
      return {
        canAccessAdminArea: false,
        canApproveMemberRequests: false,
        canRejectMemberRequests: false,
        canViewMembers: false,
        canEditMemberRoles: false,
        canMuteMembers: false,
        canBanMembers: false,
        canEditLivePermissions: false,
        canEditCustomization: false,
        canManageEmotes: false,
        canViewAudit: false,
      };
  }
}
