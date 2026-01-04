'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Shield, User } from 'lucide-react';
import type {
  SupportMessage,
  SupportTicketDetail,
  SupportTicketStatus,
} from '@/types/support';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/owner/ui-kit';

interface TicketDetailProps {
  ticket: SupportTicketDetail | null;
  loading: boolean;
  statusUpdating: boolean;
  messageSending: boolean;
  availableStatuses: SupportTicketStatus[];
  onStatusChange: (status: SupportTicketStatus, assignToOwner?: boolean) => Promise<void> | void;
  onSendMessage: (payload: { message: string; kind: 'reply' | 'internal_note' }) => Promise<void> | void;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isInternal = message.metadata?.is_internal;
  const label = message.sender?.username ?? (message.role === 'assistant' ? 'Linkler' : 'System');

  return (
    <div className="rounded-lg border border-border p-3 bg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isInternal && (
            <Badge variant="warning" size="sm">
              Internal
            </Badge>
          )}
          <span>{formatDate(message.createdAt)}</span>
        </div>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap break-words">{message.message}</p>
    </div>
  );
}

export function TicketDetail({
  ticket,
  loading,
  statusUpdating,
  messageSending,
  availableStatuses,
  onStatusChange,
  onSendMessage,
}: TicketDetailProps) {
  const [composerValue, setComposerValue] = useState('');

  const aiSummary = ticket?.aiSummary;
  const contextJson = useMemo(() => {
    if (!ticket?.context) return '{}';
    try {
      return JSON.stringify(ticket.context, null, 2);
    } catch {
      return JSON.stringify(ticket.context);
    }
  }, [ticket?.context]);

  const handleSend = (kind: 'reply' | 'internal_note') => {
    if (!composerValue.trim()) {
      return;
    }
    const result = onSendMessage({ kind, message: composerValue.trim() });
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setComposerValue(''));
    } else {
      setComposerValue('');
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardBody>
          <div className="text-center text-muted-foreground py-10">Loading ticket…</div>
        </CardBody>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card className="h-full">
        <CardBody className="h-full flex items-center justify-center text-muted-foreground">
          Select a ticket to review the thread.
        </CardBody>
      </Card>
    );
  }

  const isEscalated = Boolean(ticket.assignedTo);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title={ticket.reporter?.username ?? 'Unknown reporter'}
        subtitle={`Created ${formatDate(ticket.createdAt)}`}
        action={
          <Badge variant={isEscalated ? 'warning' : 'secondary'} size="sm" dot>
            {ticket.status.replace('_', ' ')}
          </Badge>
        }
      />
      <CardBody className="flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="h-10 rounded-md border border-border bg-transparent px-2 text-sm"
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value as SupportTicketStatus)}
              disabled={statusUpdating}
            >
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Escalation</label>
            <Button
              variant={isEscalated ? 'secondary' : 'primary'}
              onClick={() => onStatusChange(ticket.status, !isEscalated)}
              disabled={statusUpdating}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isEscalated ? 'Clear escalation' : 'Escalate to owner'}
            </Button>
          </div>
        </div>

        {aiSummary && (
          <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertCircle className="w-4 h-4 text-warning" />
              AI Summary
            </div>
            <p className="text-sm text-foreground">{aiSummary.summary ?? 'No summary provided.'}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {aiSummary.category && <Badge variant="info">Category: {aiSummary.category}</Badge>}
              {aiSummary.severity && <Badge variant="destructive">Severity: {aiSummary.severity}</Badge>}
              {aiSummary.followups.length > 0 && (
                <span>Follow-ups: {aiSummary.followups.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Ticket Context</p>
          <pre className="rounded-lg border border-border bg-black/40 p-3 text-xs text-muted-foreground overflow-auto max-h-48">
            {contextJson}
          </pre>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {ticket.messages.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No messages yet.</div>
          ) : (
            ticket.messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-border bg-transparent p-3 text-sm"
            placeholder="Write a reply or internal note..."
            value={composerValue}
            onChange={(e) => setComposerValue(e.target.value)}
            disabled={messageSending}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={messageSending || !composerValue.trim()}
              onClick={() => handleSend('internal_note')}
            >
              Add Internal Note
            </Button>
            <Button
              variant="primary"
              disabled={messageSending || !composerValue.trim()}
              onClick={() => handleSend('reply')}
            >
              Send Reply
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
