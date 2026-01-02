'use client';

import { useMemo, useState } from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import type { TeamMemberRequest } from '@/lib/teamAdmin/types';
import { DashboardSection } from '@/components/layout';
import { Button, Input, Modal, Textarea, EmptyState, useToast } from '@/components/ui';

export interface MemberRequestsTabProps {
  requests: TeamMemberRequest[];
  onApprove: (requestId: string, note: string | null) => void;
  onReject: (requestId: string, note: string | null) => void;
  canApprove: boolean;
  canReject: boolean;
}

export default function MemberRequestsTab({
  requests,
  onApprove,
  onReject,
  canApprove,
  canReject,
}: MemberRequestsTabProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<null | { id: string; action: 'approve' | 'reject' }>(null);
  const [note, setNote] = useState('');

  const canConfirm = active?.action === 'approve' ? canApprove : active?.action === 'reject' ? canReject : false;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      r.profile.username.toLowerCase().includes(q) ||
      (r.profile.displayName ?? '').toLowerCase().includes(q)
    );
  }, [query, requests]);

  const close = () => {
    setActive(null);
    setNote('');
  };

  return (
    <div className="space-y-4">
      <DashboardSection title="Pending requests" description="Approve or reject requests to join this team">
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests by username or name"
            inputSize="lg"
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="w-10 h-10" />}
              title={requests.length === 0 ? 'No pending requests' : 'No results'}
              description={
                requests.length === 0
                  ? 'When members request to join, they will show up here.'
                  : 'Try a different search term.'
              }
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {r.profile.displayName || r.profile.username}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">@{r.profile.username}</div>
                    {r.note && <div className="text-xs text-muted-foreground mt-2 line-clamp-2">“{r.note}”</div>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canReject}
                      onClick={() => setActive({ id: r.id, action: 'reject' })}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!canApprove}
                      onClick={() => setActive({ id: r.id, action: 'approve' })}
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!canApprove || !canReject) && (
            <div className="mt-2 text-sm text-muted-foreground">
              Actions are restricted by role. In this demo, moderators may be view-only unless explicitly enabled.
            </div>
          )}
        </div>
      </DashboardSection>

      <Modal
        isOpen={!!active}
        onClose={close}
        title={active?.action === 'approve' ? 'Approve request' : 'Reject request'}
        description="Optional note for the audit log (UI only)."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              variant={active?.action === 'approve' ? 'primary' : 'outline'}
              onClick={() => {
                if (!active) return;
                if (!canConfirm) return;
                const noteValue = note.trim() ? note.trim() : null;
                if (active.action === 'approve') {
                  onApprove(active.id, noteValue);
                  toast({
                    title: 'Request approved',
                    description: 'Member request approved (UI only).',
                    variant: 'success',
                  });
                } else {
                  onReject(active.id, noteValue);
                  toast({
                    title: 'Request rejected',
                    description: 'Member request rejected (UI only).',
                    variant: 'warning',
                  });
                }
                close();
              }}
              className={active?.action === 'reject' ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}
              disabled={!canConfirm}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          rows={4}
        />
      </Modal>
    </div>
  );
}
