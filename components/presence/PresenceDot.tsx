'use client';

import { usePresence } from '@/contexts/PresenceContext';
import clsx from 'clsx';

interface PresenceDotProps {
  profileId: string;
  isLive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceDot({ profileId, isLive = false, size = 'md', className }: PresenceDotProps) {
  const { isOnline } = usePresence();

  if (isLive) {
    return null;
  }

  if (!isOnline(profileId)) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div
      className={clsx(
        'absolute bottom-0 right-0 rounded-full bg-purple-500 ring-2 ring-card shadow-lg shadow-purple-500/50',
        sizeClasses[size],
        className
      )}
      aria-label="Online"
    />
  );
}
