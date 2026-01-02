'use client';

import { ReactNode } from 'react';
import { Badge, Button } from '@/components/ui';

export function MutedBannedBadges({ mutedUntil, bannedUntil }: { mutedUntil: string | null; bannedUntil: string | null }) {
  if (!mutedUntil && !bannedUntil) {
    return <span className="text-sm text-muted-foreground">Active</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {bannedUntil && <Badge variant="destructive" size="sm">Banned</Badge>}
      {mutedUntil && <Badge variant="warning" size="sm">Muted</Badge>}
    </div>
  );
}

export function SectionHeaderRow({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`
              text-left rounded-xl border p-4 transition
              ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                {opt.description && <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>}
              </div>
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 ${selected ? 'bg-primary border-primary' : 'border-border'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function InlineDangerZone({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={onAction} disabled={disabled} className="text-destructive border-destructive/30 hover:bg-destructive/10">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
