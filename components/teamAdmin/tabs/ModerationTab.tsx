'use client';

import { useMemo, useState } from 'react';
import { Ban, Clock, MessageSquare, ShieldAlert, Trash2, CheckCircle } from 'lucide-react';
import type { ModerationQueueItem, TeamMember, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, Button, EmptyState, Input, Modal, Textarea, useToast } from '@/components/ui';
import { MutedBannedBadges } from '@/components/teamAdmin/shared';

type DurationPreset = { label: string; seconds: number | null };

const MUTE_PRESETS: DurationPreset[] = [
  { label: '10m', seconds: 10 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '24h', seconds: 24 * 60 * 60 },
  { label: '7d', seconds: 7 * 24 * 60 * 60 },
];

const BAN_PRESETS: DurationPreset[] = [
  { label: '1d', seconds: 24 * 60 * 60 },
  { label: '7d', seconds: 7 * 24 * 60 * 60 },
  { label: '30d', seconds: 30 * 24 * 60 * 60 },
  { label: 'Permanent', seconds: null },
];

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export interface ModerationTabProps {
  members: TeamMember[];
  queue: ModerationQueueItem[];
  viewerRole: TeamRole;
  onMute: (profileId: string, durationSeconds: number | null, reason: string | null) => void;
  onBan: (profileId: string, durationSeconds: number | null, reason: string | null) => void;
  onQueueAction: (itemId: string, action: 'remove' | 'dismiss') => void;
}

export default function ModerationTab({
  members,
  queue,
  viewerRole,
  onMute,
  onBan,
  onQueueAction,
}: ModerationTabProps) {
  const { toast } = useToast();
  const caps = getTeamAdminCapabilities(viewerRole);

  const [memberQuery, setMemberQuery] = useState('');
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [mode, setMode] = useState<'mute' | 'ban'>('mute');
  const [durationSeconds, setDurationSeconds] = useState<number | null>(60 * 60);
  const [reason, setReason] = useState('');

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      m.profile.username.toLowerCase().includes(q) ||
      (m.profile.displayName ?? '').toLowerCase().includes(q)
    );
  }, [memberQuery, members]);

  const presets = mode === 'mute' ? MUTE_PRESETS : BAN_PRESETS;

  const canModerate = mode === 'mute' ? caps.canMuteMembers : caps.canBanMembers;

  const close = () => {
    setSelected(null);
    setReason('');
    setDurationSeconds(mode === 'mute' ? 60 * 60 : null);
  };

  const apply = () => {
    if (!selected) return;
    const r = reason.trim() ? reason.trim() : null;

    if (mode === 'mute') {
      onMute(selected.profile.id, durationSeconds, r);
      toast({ title: 'Member muted', description: 'Mute applied (UI only).', variant: 'warning' });
    } else {
      onBan(selected.profile.id, durationSeconds, r);
      toast({ title: 'Member banned', description: 'Ban applied (UI only).', variant: 'error' });
    }

    close();
  };

  const queueBadge = (count: number) => (count >= 2 ? 'warning' : 'secondary');

  return (
    <div className="space-y-4">
      <DashboardSection title="Member moderation" description="Mute/ban with duration + reason (UI only)">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant={mode === 'mute' ? 'primary' : 'outline'}
              onClick={() => {
                setMode('mute');
                setDurationSeconds(60 * 60);
              }}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Mute
            </Button>
            <Button
              variant={mode === 'ban' ? 'primary' : 'outline'}
              onClick={() => {
                setMode('ban');
                setDurationSeconds(null);
              }}
              className="gap-2"
            >
              <Ban className="w-4 h-4" />
              Ban
            </Button>
          </div>

          <Input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="Search members"
            inputSize="lg"
          />

          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="w-10 h-10" />}
              title="No members found"
              description="Try a different search query."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {filteredMembers.slice(0, 12).map((m) => (
                <div key={m.profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{m.profile.displayName || m.profile.username}</div>
                    <div className="text-sm text-muted-foreground truncate">@{m.profile.username}</div>
                    <div className="mt-2">
                      <MutedBannedBadges mutedUntil={m.status.mutedUntil} bannedUntil={m.status.bannedUntil} />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canModerate}
                      onClick={() => {
                        setSelected(m);
                        setReason('');
                      }}
                      className={mode === 'ban' ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}
                    >
                      {mode === 'mute' ? 'Mute' : 'Ban'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!canModerate && (
            <div className="text-sm text-muted-foreground">This action is restricted by role (UI-only matrix).</div>
          )}
        </div>
      </DashboardSection>

      <DashboardSection title="Content moderation queue" description="Placeholder queue for posts/comments in team scope">
        <div className="space-y-3">
          {queue.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="w-10 h-10" />}
              title="No queue items"
              description="Reported team content will show up here."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {queue.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={queueBadge(item.reportCount) as any} size="sm">{item.reportCount} reports</Badge>
                        <span className="text-sm font-semibold text-foreground">{item.type.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">@{item.author.username}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">{item.summary}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onQueueAction(item.id, 'dismiss');
                          toast({ title: 'Dismissed', description: 'Queue item dismissed (UI only).', variant: 'success' });
                        }}
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onQueueAction(item.id, 'remove');
                          toast({ title: 'Removed', description: 'Content removed (UI only).', variant: 'warning' });
                        }}
                        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardSection>

      <Modal
        isOpen={!!selected}
        onClose={close}
        title={mode === 'mute' ? 'Mute member' : 'Ban member'}
        description="Set a duration and optional reason (UI only)."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              variant={mode === 'ban' ? 'outline' : 'primary'}
              onClick={apply}
              className={mode === 'ban' ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}
              disabled={!canModerate}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">
              Target: {selected?.profile.displayName || selected?.profile.username}
              {selected?.profile.username ? <span className="text-muted-foreground"> · @{selected.profile.username}</span> : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Duration</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDurationSeconds(p.seconds)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    durationSeconds === p.seconds ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    {p.label}
                  </div>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {durationSeconds === null
                ? 'Permanent'
                : `Until ${addSecondsIso(durationSeconds)}`}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason (optional)</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Add a reason for the audit log" />
          </div>

          {!canModerate && (
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              Your role does not allow this action.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
