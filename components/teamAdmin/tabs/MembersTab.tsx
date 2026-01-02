'use client';

import { useMemo, useState } from 'react';
import { Shield, Users, Search, UserCog } from 'lucide-react';
import type { TeamMember, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, Button, Chip, EmptyState, Input, Modal, useToast } from '@/components/ui';
import { MutedBannedBadges } from '@/components/teamAdmin/shared';

export interface MembersTabProps {
  members: TeamMember[];
  viewerRole: TeamRole;
  onChangeRole: (profileId: string, role: TeamRole) => void;
}

const ROLE_FILTERS: Array<{ id: TeamRole | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Team_Admin', label: 'Admins' },
  { id: 'Team_Moderator', label: 'Mods' },
  { id: 'Team_Member', label: 'Members' },
];

const STATUS_FILTERS: Array<{ id: 'all' | 'muted' | 'banned'; label: string }> = [
  { id: 'all', label: 'All statuses' },
  { id: 'muted', label: 'Muted' },
  { id: 'banned', label: 'Banned' },
];

function roleLabel(role: TeamRole) {
  if (role === 'Team_Admin') return 'Admin';
  if (role === 'Team_Moderator') return 'Moderator';
  return 'Member';
}

export default function MembersTab({ members, viewerRole, onChangeRole }: MembersTabProps) {
  const { toast } = useToast();
  const viewerCaps = getTeamAdminCapabilities(viewerRole);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'muted' | 'banned'>('all');
  const [active, setActive] = useState<null | { profileId: string; current: TeamRole }>(null);
  const [pendingRole, setPendingRole] = useState<TeamRole>('Team_Member');

  const adminCount = useMemo(() => members.filter((m) => m.role === 'Team_Admin').length, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;

      if (statusFilter === 'muted' && !m.status.mutedUntil) return false;
      if (statusFilter === 'banned' && !m.status.bannedUntil) return false;

      if (!q) return true;
      const dn = (m.profile.displayName ?? '').toLowerCase();
      return m.profile.username.toLowerCase().includes(q) || dn.includes(q);
    });
  }, [members, query, roleFilter, statusFilter]);

  const close = () => setActive(null);

  return (
    <div className="space-y-4">
      <DashboardSection title="Members" description="Search members and manage roles (UI only)">
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            leftIcon={<Search className="w-4 h-4" />}
            inputSize="lg"
          />

          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => (
              <Chip
                key={f.id}
                selected={roleFilter === f.id}
                onClick={() => setRoleFilter(f.id)}
                variant="outline"
                size="sm"
              >
                {f.label}
              </Chip>
            ))}
            <span className="w-full" />
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.id}
                selected={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
                variant="outline"
                size="sm"
              >
                {f.label}
              </Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10" />}
              title={members.length === 0 ? 'No members yet' : 'No results'}
              description={members.length === 0 ? 'When members join, they will appear here.' : 'Try different filters.'}
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => {
                const isSelfProtected = m.role === 'Team_Admin' && adminCount === 1;
                const canEditThisRole = viewerCaps.canEditMemberRoles;

                return (
                  <div key={m.profile.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{m.profile.displayName || m.profile.username}</span>
                          <span className="text-sm text-muted-foreground truncate">@{m.profile.username}</span>
                        </div>
                        <div className="mt-2">
                          <MutedBannedBadges mutedUntil={m.status.mutedUntil} bannedUntil={m.status.bannedUntil} />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge variant={m.role === 'Team_Admin' ? 'info' : m.role === 'Team_Moderator' ? 'success' : 'default'} size="sm">
                          {roleLabel(m.role)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEditThisRole || isSelfProtected}
                          onClick={() => {
                            setActive({ profileId: m.profile.id, current: m.role });
                            setPendingRole(m.role);
                          }}
                          className="gap-2"
                        >
                          <UserCog className="w-4 h-4" />
                          Role
                        </Button>
                      </div>
                    </div>

                    {!viewerCaps.canEditMemberRoles && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Only Team Admins can change roles.
                      </div>
                    )}
                    {isSelfProtected && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Guardrail: you can&apos;t demote the last Team Admin.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardSection>

      <Modal
        isOpen={!!active}
        onClose={close}
        title="Change role"
        description="Role changes affect who can manage the team. This is UI-only wiring."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!active) return;

                const isDemotingLastAdmin = active.current === 'Team_Admin' && pendingRole !== 'Team_Admin' && adminCount === 1;
                if (isDemotingLastAdmin) {
                  toast({
                    title: 'Guardrail',
                    description: 'You cannot demote the last Team Admin.',
                    variant: 'warning',
                  });
                  return;
                }

                onChangeRole(active.profileId, pendingRole);
                toast({
                  title: 'Role updated',
                  description: 'Role change saved (UI only).',
                  variant: 'success',
                });
                close();
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Guardrails</p>
                <p className="text-sm text-muted-foreground">Admins have full team management. Moderators handle approvals and moderation.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New role</label>
            <select
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
              value={pendingRole}
              onChange={(e) => setPendingRole(e.target.value as TeamRole)}
            >
              <option value="Team_Admin">Team Admin</option>
              <option value="Team_Moderator">Team Moderator</option>
              <option value="Team_Member">Team Member</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
