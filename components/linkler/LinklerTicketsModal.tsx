'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase';

type TicketSummary = {
  id: string;
  status: string;
  updated_at: string;
  created_at: string;
  message: string | null;
};

type LinklerTicketsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LinklerTicketsModal({ open, onClose }: LinklerTicketsModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Sign in to view tickets.');
      setTickets([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('support_tickets')
      .select('id,status,updated_at,created_at,message')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (queryError) {
      setError(queryError.message);
      setTickets([]);
    } else {
      setTickets(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (open) {
      void loadTickets();
    }
  }, [open, loadTickets]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Support tickets"
      description="Recent tickets routed to the human team."
      size="md"
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tickets...</p>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet. Create one from the chat composer.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <Button variant="outline" size="sm" onClick={() => void loadTickets()} disabled={loading}>
            Refresh
          </Button>
          <a href="/tickets" className="font-semibold text-primary hover:underline">
            View all tickets
          </a>
        </div>
      </div>
    </Modal>
  );
}

function TicketRow({ ticket }: { ticket: TicketSummary }) {
  const status = ticket.status?.toLowerCase() ?? '';
  return (
    <div className="space-y-1 rounded-lg border border-muted/70 p-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-foreground">#{ticket.id.slice(0, 8).toUpperCase()}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            status === 'resolved'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'open'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {status || 'pending'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Updated {new Date(ticket.updated_at).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </p>
      {ticket.message ? <p className="text-sm text-foreground">{ticket.message}</p> : null}
    </div>
  );
}
