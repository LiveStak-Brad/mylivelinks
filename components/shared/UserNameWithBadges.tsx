'use client';

import { ReactNode } from 'react';
import MllProBadge, { shouldShowMllProBadge } from '@/components/mll/MllProBadge';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';

interface UserNameWithBadgesProps {
  /** Profile ID for MLL PRO badge check */
  profileId?: string | null;
  /** Username or display name to render */
  name: string;
  /** Optional gifter status for tier badge */
  gifterStatus?: GifterStatus | null;
  /** Text size class (e.g., 'text-sm', 'text-xs') - badge will match */
  textSize?: string;
  /** Additional className for the name text */
  nameClassName?: string;
  /** Additional className for the container */
  className?: string;
  /** Whether to show gifter badge */
  showGifterBadge?: boolean;
  /** Gifter badge size variant */
  gifterBadgeSize?: 'sm' | 'md' | 'lg';
  /** Optional click handler for the name */
  onClick?: (e?: any) => void;
  /** Whether name is clickable (shows hover styles) */
  clickable?: boolean;
  /** Optional children to render after badges */
  children?: ReactNode;
}

/**
 * Shared primitive for rendering username + MLL PRO badge + gifter badges inline.
 * 
 * This component ensures consistent badge placement across all surfaces:
 * - MLL PRO badge appears immediately after the name
 * - Gifter badge appears after MLL PRO badge
 * - Badge sizing matches text height
 * - No layout shift from transparent padding
 * 
 * Usage:
 * ```tsx
 * <UserNameWithBadges
 *   profileId={user.id}
 *   name={user.display_name || user.username}
 *   gifterStatus={user.gifter_status}
 *   textSize="text-sm"
 *   clickable
 *   onClick={() => openProfile(user.id)}
 * />
 * ```
 */
export default function UserNameWithBadges({
  profileId,
  name,
  gifterStatus,
  textSize = 'text-sm',
  nameClassName = '',
  className = '',
  showGifterBadge = true,
  gifterBadgeSize = 'sm',
  onClick,
  clickable = false,
  children,
}: UserNameWithBadgesProps) {
  const showMllPro = shouldShowMllProBadge(profileId);
  const hasGifterBadge = showGifterBadge && gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0;

  const nameElement = (
    <span
      className={`font-semibold ${textSize} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${nameClassName}`}
      onClick={onClick}
    >
      {name}
    </span>
  );

  return (
    <div className={`inline-flex items-center gap-1.5 ${textSize} ${className}`}>
      {nameElement}
      {showMllPro && (
        <MllProBadge size="compact" className="flex-shrink-0" />
      )}
      {hasGifterBadge && (
        <TierBadge
          tier_key={gifterStatus.tier_key}
          level={gifterStatus.level_in_tier}
          size={gifterBadgeSize}
        />
      )}
      {children}
    </div>
  );
}
