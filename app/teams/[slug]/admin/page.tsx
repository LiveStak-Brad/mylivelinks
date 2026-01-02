'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Shield,
  Radio,
  Paintbrush,
  SmilePlus,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import type { ModerationQueueItem, TeamAdminSnapshot } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { createMockTeamAdminApi, createAuditEvent, getMockRoleFromQuery } from '@/lib/teamAdmin/mockService';
import { DashboardPage, type DashboardTab } from '@/components/layout';
import { ErrorState, Loading, useToast } from '@/components/ui';
import MemberRequestsTab from '@/components/teamAdmin/tabs/MemberRequestsTab';
import MembersTab from '@/components/teamAdmin/tabs/MembersTab';
import ModerationTab from '@/components/teamAdmin/tabs/ModerationTab';
import LivePermissionsTab from '@/components/teamAdmin/tabs/LivePermissionsTab';
import CustomizationTab from '@/components/teamAdmin/tabs/CustomizationTab';
import EmotesTab from '@/components/teamAdmin/tabs/EmotesTab';
import AuditTab from '@/components/teamAdmin/tabs/AuditTab';

export default function TeamAdminPage() {
  const { toast } = useToast();
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();

  const viewerRole = useMemo(() => {
    return getMockRoleFromQuery(sp?.get('role') ?? null) ?? 'Team_Admin';
  }, [sp]);

  const caps = getTeamAdminCapabilities(viewerRole);

  // NOTE: This admin console is still UI-only / mock-backed. We treat slug as the team identifier.
  const teamSlug = params?.slug ?? 'team_demo_001';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TeamAdminSnapshot | null>(null);

  const [activeTab, setActiveTab] = useState<string>('requests');

  const api = useMemo(() => createMockTeamAdminApi(), []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSnapshot(teamSlug);
      setSnapshot(data);
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Failed to load');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [teamSlug]);

  if (loading) {
    return <Loading fullScreen text="Loading team admin console..." />;
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ErrorState title="Failed to load" description={error ?? 'Unknown error'} onRetry={load} />
      </div>
    );
  }

  const fallbackActor = snapshot.members[0]?.profile ?? {
    id: 'actor',
    username: 'actor',
    displayName: null,
    avatarUrl: null,
  };

  const actorProfile = snapshot.members.find((m) => m.role === viewerRole)?.profile ?? fallbackActor;

  const applyAudit = (event: ReturnType<typeof createAuditEvent>) => {
    setSnapshot((s) => {
      if (!s) return s;
      return { ...s, audit: [event, ...s.audit] };
    });
  };

  const tabs: DashboardTab[] = [
    {
      id: 'requests',
      label: 'Member Requests',
      icon: <UserPlus className="w-4 h-4" />,
      content: (
        <MemberRequestsTab
          requests={snapshot.requests}
          canApprove={caps.canApproveMemberRequests}
          canReject={caps.canRejectMemberRequests}
          onApprove={(requestId, note) => {
            setSnapshot((s) => {
              if (!s) return s;
              const req = s.requests.find((r) => r.id === requestId) ?? null;
              const next = { ...s, requests: s.requests.filter((r) => r.id !== requestId) };
              if (req) {
                applyAudit(
                  createAuditEvent({
                    actor: actorProfile,
                    actorRole: viewerRole,
                    action: 'Approved member request',
                    targetLabel: `@${req.profile.username}`,
                    detail: note ? `Note: ${note}` : null,
                    severity: 'info',
                  })
                );
              }
              return next;
            });
          }}
          onReject={(requestId, note) => {
            setSnapshot((s) => {
              if (!s) return s;
              const req = s.requests.find((r) => r.id === requestId) ?? null;
              const next = { ...s, requests: s.requests.filter((r) => r.id !== requestId) };
              if (req) {
                applyAudit(
                  createAuditEvent({
                    actor: actorProfile,
                    actorRole: viewerRole,
                    action: 'Rejected member request',
                    targetLabel: `@${req.profile.username}`,
                    detail: note ? `Note: ${note}` : null,
                    severity: 'warning',
                  })
                );
              }
              return next;
            });
          }}
        />
      ),
    },
    ...(caps.canViewMembers
      ? [
          {
            id: 'members',
            label: 'Members',
            icon: <Users className="w-4 h-4" />,
            content: (
              <MembersTab
                members={snapshot.members}
                viewerRole={viewerRole}
                onChangeRole={(profileId, role) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const member = s.members.find((m) => m.profile.id === profileId);
                    const next = {
                      ...s,
                      members: s.members.map((m) => (m.profile.id === profileId ? { ...m, role } : m)),
                    };
                    if (member) {
                      applyAudit(
                        createAuditEvent({
                          actor: actorProfile,
                          actorRole: viewerRole,
                          action: 'Changed member role',
                          targetLabel: `@${member.profile.username}`,
                          detail: `${member.role} → ${role}`,
                          severity: 'info',
                        })
                      );
                    }
                    return next;
                  });
                }}
              />
            ),
          },
        ]
      : []),
    ...(caps.canMuteMembers || caps.canBanMembers
      ? [
          {
            id: 'moderation',
            label: 'Moderation',
            icon: <ShieldAlert className="w-4 h-4" />,
            content: (
              <ModerationTab
                members={snapshot.members}
                queue={snapshot.moderationQueue}
                viewerRole={viewerRole}
                onMute={(profileId, durationSeconds, reason) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const target = s.members.find((m) => m.profile.id === profileId);
                    const mutedUntil =
                      durationSeconds === null ? null : new Date(Date.now() + durationSeconds * 1000).toISOString();
                    const next = {
                      ...s,
                      members: s.members.map((m) =>
                        m.profile.id === profileId ? { ...m, status: { ...m.status, mutedUntil } } : m
                      ),
                    };
                    if (target) {
                      applyAudit(
                        createAuditEvent({
                          actor: actorProfile,
                          actorRole: viewerRole,
                          action: 'Muted member',
                          targetLabel: `@${target.profile.username}`,
                          detail: `${durationSeconds ?? 0}s${reason ? ` · Reason: ${reason}` : ''}`,
                          severity: 'warning',
                        })
                      );
                    }
                    return next;
                  });
                }}
                onBan={(profileId, durationSeconds, reason) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const target = s.members.find((m) => m.profile.id === profileId);
                    const bannedUntil =
                      durationSeconds === null ? null : new Date(Date.now() + durationSeconds * 1000).toISOString();
                    const next = {
                      ...s,
                      members: s.members.map((m) =>
                        m.profile.id === profileId ? { ...m, status: { ...m.status, bannedUntil } } : m
                      ),
                    };
                    if (target) {
                      applyAudit(
                        createAuditEvent({
                          actor: actorProfile,
                          actorRole: viewerRole,
                          action: 'Banned member',
                          targetLabel: `@${target.profile.username}`,
                          detail: `${durationSeconds === null ? 'permanent' : `${durationSeconds}s`}${reason ? ` · Reason: ${reason}` : ''}`,
                          severity: 'destructive',
                        })
                      );
                    }
                    return next;
                  });
                }}
                onQueueAction={(itemId, action) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const item = s.moderationQueue.find((i) => i.id === itemId);
                    const nextStatus: ModerationQueueItem['status'] = action === 'remove' ? 'actioned' : 'dismissed';
                    const nextQueue = s.moderationQueue.map((i) =>
                      i.id === itemId ? { ...i, status: nextStatus } : i
                    );
                    if (item) {
                      applyAudit(
                        createAuditEvent({
                          actor: actorProfile,
                          actorRole: viewerRole,
                          action: action === 'remove' ? 'Removed content' : 'Dismissed report',
                          targetLabel: `${item.type}:${item.id}`,
                          detail: item.summary,
                          severity: action === 'remove' ? 'warning' : 'info',
                        })
                      );
                    }
                    return { ...s, moderationQueue: nextQueue };
                  });
                }}
              />
            ),
          },
        ]
      : []),
    ...(caps.canEditLivePermissions
      ? [
          {
            id: 'live',
            label: 'Live',
            icon: <Radio className="w-4 h-4" />,
            content: (
              <LivePermissionsTab
                value={snapshot.livePermissions.whoCanGoLive}
                viewerRole={viewerRole}
                onChange={(v) => {
                  setSnapshot((s) => (s ? { ...s, livePermissions: { ...s.livePermissions, whoCanGoLive: v } } : s));
                  applyAudit(
                    createAuditEvent({
                      actor: actorProfile,
                      actorRole: viewerRole,
                      action: 'Changed live permissions',
                      detail: `Policy: ${v}`,
                      severity: 'info',
                    })
                  );
                }}
              />
            ),
          },
        ]
      : []),
    ...(caps.canEditCustomization
      ? [
          {
            id: 'customization',
            label: 'Customization',
            icon: <Paintbrush className="w-4 h-4" />,
            content: (
              <CustomizationTab
                team={snapshot.team}
                value={snapshot.customization}
                viewerRole={viewerRole}
                onChange={(v) => {
                  setSnapshot((s) => (s ? { ...s, customization: v } : s));
                  applyAudit(
                    createAuditEvent({
                      actor: actorProfile,
                      actorRole: viewerRole,
                      action: 'Updated team customization',
                      detail: 'Branding/theme/rules updated (UI only).',
                      severity: 'info',
                    })
                  );
                }}
              />
            ),
          },
        ]
      : []),
    ...(caps.canManageEmotes
      ? [
          {
            id: 'emotes',
            label: 'Emotes',
            icon: <SmilePlus className="w-4 h-4" />,
            content: (
              <EmotesTab
                emotes={snapshot.emotes}
                viewerRole={viewerRole}
                onToggle={(emoteId, enabled) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const emote = s.emotes.find((e) => e.id === emoteId);
                    const next = { ...s, emotes: s.emotes.map((e) => (e.id === emoteId ? { ...e, enabled } : e)) };
                    if (emote) {
                      applyAudit(
                        createAuditEvent({
                          actor: actorProfile,
                          actorRole: viewerRole,
                          action: enabled ? 'Enabled emote' : 'Disabled emote',
                          targetLabel: `:${emote.name}:`,
                          severity: 'info',
                        })
                      );
                    }
                    return next;
                  });
                }}
                onUpload={(name, file) => {
                  setSnapshot((s) => {
                    if (!s) return s;
                    const id = `emote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    const next = {
                      ...s,
                      emotes: [
                        {
                          id,
                          name,
                          imageUrl: URL.createObjectURL(file),
                          enabled: true,
                          createdAt: new Date().toISOString(),
                          createdBy: s.members[0]?.profile,
                        },
                        ...s.emotes,
                      ],
                    };
                    applyAudit(
                      createAuditEvent({
                        actor: actorProfile,
                        actorRole: viewerRole,
                        action: 'Uploaded emote',
                        targetLabel: `:${name}:`,
                        severity: 'info',
                      })
                    );
                    return next;
                  });
                }}
              />
            ),
          },
        ]
      : []),
    ...(caps.canViewAudit
      ? [
          {
            id: 'audit',
            label: 'Audit',
            icon: <Activity className="w-4 h-4" />,
            content: <AuditTab events={snapshot.audit} />,
          },
        ]
      : []),
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <a href={`/teams/${teamSlug}/admin?role=${viewerRole}`}>
        <span className="text-xs text-muted-foreground">Role:</span>
      </a>
      <span className="text-xs font-mono text-foreground">{viewerRole}</span>
      <a href={`/teams/${teamSlug}/admin?role=Team_Admin`}>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted"
          onClick={() => toast({ title: 'Switched to Admin', description: 'UI-only role simulation.', variant: 'info' })}
        >
          Admin
        </button>
      </a>
      <a href={`/teams/${teamSlug}/admin?role=Team_Moderator`}>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted"
          onClick={() => toast({ title: 'Switched to Moderator', description: 'UI-only role simulation.', variant: 'info' })}
        >
          Mod
        </button>
      </a>
      <a href={`/teams/${teamSlug}/admin?role=Team_Member`}>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted"
          onClick={() => toast({ title: 'Switched to Member', description: 'UI-only role simulation.', variant: 'info' })}
        >
          Member
        </button>
      </a>
    </div>
  );

  const roleChipStyles =
    viewerRole === 'Team_Admin'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
      : viewerRole === 'Team_Moderator'
        ? 'bg-sky-500/15 text-sky-200 border-sky-500/30'
        : 'bg-muted/60 text-foreground border-border';

  const bannerStyle: React.CSSProperties = {
    backgroundImage: snapshot.team.bannerUrl
      ? `url(${snapshot.team.bannerUrl})`
      : `linear-gradient(135deg, ${snapshot.customization.theme.primary} 0%, ${snapshot.customization.theme.accent} 50%, ${snapshot.customization.theme.primary} 100%)`,
  };

  const hero = (
    <div className="relative overflow-hidden">
      <div className="h-44 sm:h-56 bg-cover bg-center" style={bannerStyle} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

      <div className="relative">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="-mt-12 sm:-mt-14 flex items-end gap-3 pb-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-border bg-background/80 backdrop-blur shadow-xl overflow-hidden">
                {snapshot.team.iconUrl ? (
                  <img src={snapshot.team.iconUrl} alt={snapshot.team.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-foreground">
                    {snapshot.team.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl border border-border bg-background/80 backdrop-blur flex items-center justify-center shadow"
                aria-hidden
              >
                <div className="w-5 h-5 rounded-md" style={{ background: snapshot.customization.theme.primary }} />
              </div>
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                  {snapshot.team.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${roleChipStyles}`}
                >
                  {viewerRole === 'Team_Admin'
                    ? 'Team Admin'
                    : viewerRole === 'Team_Moderator'
                      ? 'Team Moderator'
                      : 'Team Member'}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {snapshot.members.length} members
                {snapshot.requests.length > 0 ? ` · ${snapshot.requests.length} pending` : ''}
                {caps.canViewAudit ? ' · Audit enabled' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardPage
      title={`${snapshot.team.name} — Team Console`}
      description="Moderation + customization (UI only)"
      icon={<Shield className="w-6 h-6" />}
      hero={hero}
      tabs={tabs}
      defaultTab="requests"
      activeTab={activeTab}
      onTabChange={(t) => setActiveTab(t)}
      showRefresh
      onRefresh={load}
      headerActions={headerActions}
    />
  );
}
