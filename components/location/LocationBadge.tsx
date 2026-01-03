'use client';

import { MapPin, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { ProfileLocation, canShowLocation, formatLocationDisplay } from '@/lib/location';

export interface LocationBadgeProps {
  location?: ProfileLocation | null;
  isSelf?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  muted?: boolean;
  includeZip?: boolean;
}

export function LocationBadge({
  location,
  isSelf = false,
  className,
  showIcon = true,
  size = 'md',
  muted = false,
  includeZip = false,
}: LocationBadgeProps) {
  if (!location) return null;

  if (location.hidden && !isSelf) {
    return null;
  }

  if (location.hidden && isSelf) {
    return (
      <div
        className={clsx(
          'inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground',
          className
        )}
      >
        <EyeOff className="h-4 w-4" />
        Hidden from everyone else
      </div>
    );
  }

  if (!canShowLocation(location, isSelf)) {
    return null;
  }

  const label = formatLocationDisplay(location, {
    includeZip,
    isSelf,
  });

  if (!label) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        muted ? 'border-border text-muted-foreground bg-muted/40' : 'border-primary/40 text-primary bg-primary/10',
        size === 'sm' && 'text-[11px] px-2 py-0.5',
        className
      )}
    >
      {showIcon && <MapPin className={clsx('h-3.5 w-3.5', muted ? 'text-muted-foreground' : 'text-primary')} />}
      {label}
    </span>
  );
}
