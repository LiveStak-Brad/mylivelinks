'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type MenuIntent = 'default' | 'destructive';

export interface MenuItemRowProps {
  icon: LucideIcon;
  label: string;
  intent?: MenuIntent;
  disabled?: boolean;
  badge?: string;
  className?: string;
}

/**
 * Shared visual row used by both App and User menus so styling stays consistent.
 */
export function MenuItemRow({
  icon: Icon,
  label,
  intent = 'default',
  disabled = false,
  badge,
  className,
}: MenuItemRowProps) {
  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-colors',
        disabled
          ? 'text-muted-foreground opacity-60 cursor-not-allowed'
          : intent === 'destructive'
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-foreground hover:bg-muted',
        className
      )}
    >
      <Icon
        className={cn(
          'w-5 h-5 flex-shrink-0',
          intent === 'destructive' ? 'text-destructive' : 'text-muted-foreground'
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </div>
  );
}
