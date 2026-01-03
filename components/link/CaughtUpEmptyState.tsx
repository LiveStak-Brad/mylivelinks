'use client';

import { RefreshCcw, Sparkles } from 'lucide-react';

type Variant = 'regular' | 'dating' | 'auto';

interface CaughtUpEmptyStateProps {
  onRefresh: () => void;
  onSecondary?: () => void;
  showAutoLinkTip?: boolean;
  variant?: Variant;
  subtitle?: string;
}

export function CaughtUpEmptyState({
  onRefresh,
  onSecondary,
  showAutoLinkTip = false,
  variant = 'regular',
  subtitle,
}: CaughtUpEmptyStateProps) {
  const title = "You're all caught up";
  const description = subtitle ?? 'Check back later for more Links.';

  const secondaryLabel = variant === 'dating' ? 'Edit Dating Profile' : 'Edit Link Profile';

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/90 p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      {showAutoLinkTip && (
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 p-3 text-left">
          <p className="text-xs font-semibold text-foreground">Tip</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Turn on Auto-Link to link back instantly when someone follows you.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>

        {onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
