'use client';

import { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import type { TeamAuditEvent } from '@/lib/teamAdmin/types';
import { DashboardSection } from '@/components/layout';
import { Badge, Chip, EmptyState, Input } from '@/components/ui';

export interface AuditTabProps {
  events: TeamAuditEvent[];
}

const SEV_FILTERS: Array<{ id: 'all' | TeamAuditEvent['severity']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'info', label: 'Info' },
  { id: 'warning', label: 'Warning' },
  { id: 'destructive', label: 'Destructive' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditTab({ events }: AuditTabProps) {
  const [q, setQ] = useState('');
  const [sev, setSev] = useState<'all' | TeamAuditEvent['severity']>('all');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events.filter((e) => {
      if (sev !== 'all' && e.severity !== sev) return false;
      if (!query) return true;
      return (
        e.action.toLowerCase().includes(query) ||
        (e.targetLabel ?? '').toLowerCase().includes(query) ||
        (e.detail ?? '').toLowerCase().includes(query) ||
        e.actor.username.toLowerCase().includes(query)
      );
    });
  }, [events, q, sev]);

  const badgeVariant = (s: TeamAuditEvent['severity']) => {
    if (s === 'destructive') return 'destructive';
    if (s === 'warning') return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <DashboardSection title="Recent actions" description="A wire-ready audit feed (UI only)">
        <div className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actions, users, or details"
            inputSize="lg"
            leftIcon={<Search className="w-4 h-4" />}
          />

          <div className="flex flex-wrap gap-2">
            {SEV_FILTERS.map((f) => (
              <Chip
                key={f.id}
                selected={sev === f.id}
                onClick={() => setSev(f.id)}
                variant="outline"
                size="sm"
              >
                {f.label}
              </Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-10 h-10" />}
              title={events.length === 0 ? 'No actions yet' : 'No results'}
              description={events.length === 0 ? 'Admin and mod actions will show up here.' : 'Try another search.'}
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badgeVariant(e.severity) as any} size="sm">{e.severity.toUpperCase()}</Badge>
                        <span className="text-sm font-semibold text-foreground">{e.action}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(e.createdAt)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>@{e.actor.username}</span>
                        <span className="ml-2">
                          <Badge variant="secondary" size="sm">{e.actorRole.replace('Team_', '')}</Badge>
                        </span>
                        {e.targetLabel && <span> · {e.targetLabel}</span>}
                      </div>
                      {e.detail && <div className="text-sm text-muted-foreground mt-2">{e.detail}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardSection>
    </div>
  );
}
