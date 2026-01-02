'use client';

import { Radio } from 'lucide-react';
import type { LivePermissionPolicy, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, useToast } from '@/components/ui';
import { SegmentedControl } from '@/components/teamAdmin/shared';

export interface LivePermissionsTabProps {
  value: LivePermissionPolicy;
  viewerRole: TeamRole;
  onChange: (v: LivePermissionPolicy) => void;
}

export default function LivePermissionsTab({ value, viewerRole, onChange }: LivePermissionsTabProps) {
  const { toast } = useToast();
  const caps = getTeamAdminCapabilities(viewerRole);

  return (
    <div className="space-y-4">
      <DashboardSection
        title="Live permissions"
        description="Control who can go live in team rooms (UI only)"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Who can go live</p>
              <p className="text-sm text-muted-foreground">
                This setting will later be enforced by the backend. Right now it is mock state.
              </p>
              {!caps.canEditLivePermissions && (
                <div className="mt-2">
                  <Badge variant="secondary" size="sm">Admin-only setting</Badge>
                </div>
              )}
            </div>
          </div>

          <SegmentedControl
            value={value}
            disabled={!caps.canEditLivePermissions}
            onChange={(v) => {
              if (!caps.canEditLivePermissions) return;
              onChange(v);
              toast({
                title: 'Live permissions updated',
                description: `Policy set to ${v} (UI only).`,
                variant: 'success',
              });
            }}
            options={[
              {
                value: 'admins_only',
                label: 'Admins only',
                description: 'Only Team Admins can start a live.',
              },
              {
                value: 'admins_and_mods',
                label: 'Admins + Mods',
                description: 'Admins and Moderators can go live.',
              },
              {
                value: 'all_members',
                label: 'All members',
                description: 'Any member can go live in team rooms.',
              },
            ]}
          />

          <div className="text-sm text-muted-foreground">
            Current: <span className="font-mono">{value}</span>
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}
