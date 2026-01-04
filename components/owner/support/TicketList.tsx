'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import type { SupportBadgeCounts, SupportTicketFilters, SupportTicketSummary } from '@/types/support';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/owner/ui-kit';

interface TicketListProps {
  tickets: SupportTicketSummary[];
  badges: SupportBadgeCounts;
  filters: SupportTicketFilters;
  onFiltersChange: (updates: Partial<SupportTicketFilters>) => void;
  loading: boolean;
  error: string | null;
  selectedTicketId: string | null;
  onSelect: (ticketId: string) => void;
  refresh: () => void;
}

const STATUS_OPTIONS: Array<{ label: string; value: SupportTicketFilters['status'] }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Escalated', value: 'escalated' },
];

const SEVERITY_OPTIONS: Array<{ label: string; value: SupportTicketFilters['severity'] }> = [
  { label: 'All', value: 'all' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const severityVariantMap = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
} as const;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function TicketList({
  tickets,
  badges,
  filters,
  onFiltersChange,
  loading,
  error,
  selectedTicketId,
  onSelect,
  refresh,
}: TicketListProps) {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  useEffect(() => {
    setSearchValue(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      onFiltersChange({ search: searchValue || null });
    }, 400);

    return () => clearTimeout(handle);
  }, [searchValue, onFiltersChange]);

  const ticketItems = useMemo(() => {
    return tickets.map((ticket) => {
      const summary = ticket.aiSummary?.summary ?? ticket.message;
      const severity = ticket.aiSummary?.severity ?? 'low';
      const severityVariant = severityVariantMap[severity as keyof typeof severityVariantMap] ?? 'secondary';
      const isSelected = selectedTicketId === ticket.id;
      return (
        <button
          key={ticket.id}
          onClick={() => onSelect(ticket.id)}
          className={`text-left w-full p-4 rounded-lg border transition shadow-sm ${
            isSelected
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {ticket.reporter?.username ?? 'Unknown reporter'}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
            </div>
            <Badge variant={severityVariant} size="sm" dot>
              {ticket.aiSummary?.severity ?? 'n/a'}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-foreground line-clamp-2">{summary}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold uppercase">{ticket.status.replace('_', ' ')}</span>
            {ticket.assignedTo && <Badge variant="info" size="sm">Escalated</Badge>}
            {ticket.aiSummary?.category && (
              <span className="truncate">• {ticket.aiSummary.category}</span>
            )}
          </div>
        </button>
      );
    });
  }, [tickets, onSelect, selectedTicketId]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        title="Tickets"
        subtitle="Newest tickets first"
        action={
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />
      <CardBody className="flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="h-10 rounded-md border border-border bg-transparent px-2 text-sm"
              value={filters.status ?? 'all'}
              onChange={(e) => onFiltersChange({ status: e.target.value as SupportTicketFilters['status'] })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value ?? 'all'}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Severity</label>
            <select
              className="h-10 rounded-md border border-border bg-transparent px-2 text-sm"
              value={filters.severity ?? 'all'}
              onChange={(e) => onFiltersChange({ severity: e.target.value as SupportTicketFilters['severity'] })}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value ?? 'all'}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Category</label>
          <input
            type="text"
            className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
            placeholder="category (optional)"
            value={filters.category ?? ''}
            onChange={(e) => onFiltersChange({ category: e.target.value || null })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="h-10 w-full rounded-md border border-border bg-transparent pl-10 pr-3 text-sm"
              placeholder="message, summary, category..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="info" size="sm">
            Open: {badges.open}
          </Badge>
          <Badge variant="warning" size="sm">
            Escalated: {badges.escalated}
          </Badge>
          <Badge variant="destructive" size="sm">
            High: {badges.highSeverity}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading tickets…</div>
          )}
          {!loading && error && (
            <div className="text-sm text-destructive py-6 text-center">{error}</div>
          )}
          {!loading && !error && tickets.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">No tickets found</div>
          )}
          {!loading && !error && ticketItems}
        </div>
      </CardBody>
    </Card>
  );
}
