'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Check,
  X,
  Ban,
  Clock,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase';

/**
 * REAL Team Admin Panel
 * 
 * Permissions:
 * - Only Team_Admin and Team_Moderator can access
 * - Team_Admin can: approve requests, change roles, ban/mute members
 * - Team_Moderator can: approve requests, mute members
 */

interface TeamMemberRecord {
  profile_id: string;
  status: string;
  role: string;
  requested_at: string;
  approved_at: string | null;
  banned_at: string | null;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamInviteRecord {
  id: number;
  invitee_id: string;
  inviter_id: string;
  status: string;
  message: string | null;
  created_at: string;
  invitee: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  inviter: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  team_tag: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  approved_member_count: number;
  pending_request_count: number;
}

export default function TeamAdminPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params?.slug as string;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [requests, setRequests] = useState<TeamMemberRecord[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInviteRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'members' | 'audit'>('requests');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check permissions and load data
  useEffect(() => {
    loadAdminData();
  }, [teamSlug]);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/teams/${teamSlug}`);
        return;
      }

      // Get team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', teamSlug)
        .single();

      if (teamError || !teamData) {
        setError('Team not found');
        return;
      }

      setTeam(teamData);

      // Check viewer's role
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('role, status')
        .eq('team_id', teamData.id)
        .eq('profile_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      const role = membership?.role || null;
      setViewerRole(role);

      // Only Team_Admin and Team_Moderator can access admin panel
      if (!role || (role !== 'Team_Admin' && role !== 'Team_Moderator')) {
        router.push(`/teams/${teamSlug}`);
        return;
      }

      // Load pending requests
      const { data: requestsData } = await supabase
        .from('team_memberships')
        .select(`
          profile_id,
          status,
          role,
          requested_at,
          approved_at,
          banned_at,
          profile:profiles!team_memberships_profile_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', teamData.id)
        .eq('status', 'requested')
        .order('requested_at', { ascending: false });

      setRequests((requestsData as any) || []);

      // Load approved members
      const { data: membersData } = await supabase
        .from('team_memberships')
        .select(`
          profile_id,
          status,
          role,
          requested_at,
          approved_at,
          banned_at,
          profile:profiles!team_memberships_profile_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', teamData.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      setMembers((membersData as any) || []);

      // Load pending invites
      const { data: invitesData } = await supabase
        .from('team_invites')
        .select(`
          id,
          invitee_id,
          inviter_id,
          status,
          message,
          created_at,
          invitee:profiles!team_invites_invitee_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          inviter:profiles!team_invites_inviter_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', teamData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingInvites((invitesData as any) || []);
    } catch (err: any) {
      console.error('[admin] Load error:', err);
      setError(err?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (profileId: string) => {
    if (!team) return;
    setActionLoading(`approve-${profileId}`);

    try {
      const { error } = await supabase.rpc('rpc_approve_member', {
        p_team_id: team.id,
        p_profile_id: profileId,
      });

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Approve error:', err);
      alert(err?.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (profileId: string) => {
    if (!team) return;
    setActionLoading(`reject-${profileId}`);

    try {
      const { error } = await supabase.rpc('rpc_reject_member', {
        p_team_id: team.id,
        p_profile_id: profileId,
      });

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Reject error:', err);
      alert(err?.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (profileId: string, newRole: string) => {
    if (!team || viewerRole !== 'Team_Admin') return;
    setActionLoading(`role-${profileId}`);

    try {
      const { error } = await supabase.rpc('rpc_change_member_role', {
        p_team_id: team.id,
        p_profile_id: profileId,
        p_role: newRole,
      });

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Role change error:', err);
      alert(err?.message || 'Failed to change role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanMember = async (profileId: string) => {
    if (!team || viewerRole !== 'Team_Admin') return;
    if (!confirm('Are you sure you want to ban this member? They will not be able to rejoin.')) return;

    setActionLoading(`ban-${profileId}`);

    try {
      const { error } = await supabase.rpc('rpc_ban_member', {
        p_team_id: team.id,
        p_profile_id: profileId,
      });

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Ban error:', err);
      alert(err?.message || 'Failed to ban member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    if (!team) return;
    if (!confirm('Remove this invite? The user will no longer see it.')) return;
    setActionLoading(`cancel-invite-${inviteId}`);
    try {
      const { data, error } = await supabase.rpc('rpc_cancel_team_invite', {
        p_invite_id: inviteId,
      });

      if (error || !data?.success) {
        throw error || new Error(data?.error || 'Unable to cancel invite');
      }

      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Cancel invite error:', err);
      alert(err?.message || 'Failed to remove invite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: number) => {
    if (!team) return;
    setActionLoading(`resend-invite-${inviteId}`);
    try {
      const { data, error } = await supabase.rpc('rpc_resend_team_invite', {
        p_invite_id: inviteId,
      });

      if (error || !data?.success) {
        throw error || new Error(data?.error || 'Unable to resend invite');
      }

      await loadAdminData();
    } catch (err: any) {
      console.error('[admin] Resend invite error:', err);
      alert(err?.message || 'Failed to resend invite');
    } finally {
      setActionLoading(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/60">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-white/60 mb-4">{error || 'You do not have permission to access this admin panel.'}</p>
          <Button onClick={() => router.push(`/teams/${teamSlug}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </div>
      </div>
    );
  }

  const canChangeRoles = viewerRole === 'Team_Admin';
  const canBan = viewerRole === 'Team_Admin';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/teams/${teamSlug}`)}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">{team.name} Admin</h1>
                <p className="text-sm text-white/50">
                  {team.approved_member_count} members · {team.pending_request_count || 0} pending
                </p>
              </div>
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 text-sm">
              {viewerRole === 'Team_Admin' ? 'Team Admin' : 'Team Moderator'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/95">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'requests'
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Member Requests</span>
                {requests.length > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{requests.length}</Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'members'
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Members</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
                <UserPlus className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Pending Requests</h3>
                <p className="text-sm text-white/50">All join requests have been processed.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.profile_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4"
                >
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-purple-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {req.profile.avatar_url ? (
                      <img
                        src={req.profile.avatar_url}
                        alt={req.profile.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-purple-300">
                        {(req.profile.display_name || req.profile.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {req.profile.display_name || req.profile.username}
                    </p>
                    <p className="text-xs text-white/50">@{req.profile.username}</p>
                    <p className="text-xs text-white/40 mt-1">
                      Requested {new Date(req.requested_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(req.profile_id)}
                      disabled={!!actionLoading}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {actionLoading === `approve-${req.profile_id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(req.profile_id)}
                      disabled={!!actionLoading}
                      className="border-white/20 text-white/80 hover:bg-white/10"
                    >
                      {actionLoading === `reject-${req.profile_id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.profile_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4"
                >
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-purple-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.profile.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-purple-300">
                        {(member.profile.display_name || member.profile.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {member.profile.display_name || member.profile.username}
                      </p>
                      <Badge
                        className={
                          member.role === 'Team_Admin'
                            ? 'bg-amber-500/20 text-amber-300 text-xs'
                            : member.role === 'Team_Moderator'
                            ? 'bg-purple-500/20 text-purple-300 text-xs'
                            : 'bg-white/10 text-white/60 text-xs'
                        }
                      >
                        {member.role === 'Team_Admin' ? 'Admin' : member.role === 'Team_Moderator' ? 'Moderator' : 'Member'}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50">@{member.profile.username}</p>
                    {member.approved_at && (
                      <p className="text-xs text-white/40 mt-1">
                        Joined {new Date(member.approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {canChangeRoles && member.role !== 'Team_Admin' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.profile_id, e.target.value)}
                        disabled={!!actionLoading}
                        className="rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 py-2"
                      >
                        <option value="Team_Member">Member</option>
                        <option value="Team_Moderator">Moderator</option>
                        <option value="Team_Admin">Admin</option>
                      </select>
                      {canBan && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBanMember(member.profile_id)}
                          disabled={!!actionLoading}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 uppercase tracking-wide">Invited Members</p>
                  <p className="text-xl font-semibold text-white">
                    {pendingInvites.length} pending
                  </p>
                </div>
                <Badge className="bg-white/10 text-white/70 text-xs">Team invite list</Badge>
              </div>
              <p className="text-sm text-white/50">
                Cancel invites or resend the notification. Invited members can join in addition to any other teams they are already part of.
              </p>

              <div className="space-y-3">
                {pendingInvites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                    <Users className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">No pending invites</p>
                    <p className="text-xs text-white/50">Send invites from the team page to populate this list.</p>
                  </div>
                ) : (
                  pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-xl border border-white/10 bg-[#0f0f15] p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {invite.invitee?.avatar_url ? (
                            <img
                              src={invite.invitee.avatar_url}
                              alt={invite.invitee.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-purple-200">
                              {(invite.invitee?.display_name || invite.invitee?.username || '?')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {invite.invitee?.display_name || invite.invitee?.username || 'Unknown user'}
                          </p>
                          {invite.invitee?.username && (
                            <p className="text-xs text-white/50">@{invite.invitee.username}</p>
                          )}
                          <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Invited {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-white/40">
                            Invited by {invite.inviter?.display_name || invite.inviter?.username || 'team admin'}
                          </p>
                          {invite.message && (
                            <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-white/70">
                              “{invite.message}”
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={!!actionLoading}
                          className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
                        >
                          {actionLoading === `cancel-invite-${invite.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove invite
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResendInvite(invite.id)}
                          disabled={!!actionLoading}
                          className="flex-1 bg-purple-500/80 hover:bg-purple-500 text-white"
                        >
                          {actionLoading === `resend-invite-${invite.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCcw className="h-4 w-4 mr-1" />
                              Re-send
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-white/40">
                Tip: Members can be part of multiple teams, so resending an invite won’t remove them from any existing communities.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
