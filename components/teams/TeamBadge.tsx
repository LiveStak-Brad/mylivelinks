'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { TeamIdentityContext } from '@/types/teams';
import { AVATAR_SIZES, TYPOGRAPHY, buildTeamGradient } from '@/lib/teams/designTokens';

/**
 * TeamBadge - Displays team identity in a compact pill format
 * 
 * VISUAL DESIGN LOCKED:
 * - Avatar: CIRCLE ONLY (non-negotiable)
 * - Clear visual border using team color
 * - Tag always visible, name optional on larger screens
 */

type BadgeSize = 'sm' | 'md' | 'lg';

interface TeamBadgeProps {
  team?: TeamIdentityContext | null;
  className?: string;
  /** Badge size variant */
  size?: BadgeSize;
  /** Show the full team name (hidden on mobile by default) */
  showName?: boolean;
  /** Use team's theme color for accent ring */
  useTeamColor?: boolean;
}

const SIZE_CONFIG: Record<BadgeSize, { avatar: string; padding: string; text: string }> = {
  sm: { avatar: 'h-4 w-4', padding: 'px-2 py-0.5', text: 'text-[10px]' },
  md: { avatar: 'h-5 w-5', padding: 'px-3 py-1', text: 'text-[11px]' },
  lg: { avatar: 'h-6 w-6', padding: 'px-3.5 py-1.5', text: 'text-xs' },
};

export default function TeamBadge({
  team,
  className,
  size = 'md',
  showName = true,
  useTeamColor = true,
}: TeamBadgeProps) {
  if (!team) {
    return null;
  }

  const sizeConfig = SIZE_CONFIG[size];
  const teamPrimary = team.theme?.primary ?? '#8B5CF6';
  const teamAccent = team.theme?.accent ?? '#6366F1';

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border backdrop-blur-md',
        'transition-all duration-200',
        // Subtle glassmorphism
        'bg-white/[0.06] border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.25)]',
        'hover:bg-white/[0.1] hover:border-white/25',
        sizeConfig.padding,
        className
      )}
      aria-label={`${team.name} team`}
    >
      {/* AVATAR - CIRCLE ONLY */}
      <div className="relative flex-shrink-0">
        {team.iconUrl ? (
          <Image
            src={team.iconUrl}
            alt={team.name}
            width={24}
            height={24}
            className={clsx(
              sizeConfig.avatar,
              'rounded-full object-cover',
              // Team color ring
              useTeamColor ? 'ring-2' : 'ring-1 ring-white/30'
            )}
            style={useTeamColor ? { 
              boxShadow: `0 0 0 2px ${teamPrimary}40`,
            } : undefined}
          />
        ) : (
          <div
            className={clsx(
              sizeConfig.avatar,
              'rounded-full flex items-center justify-center',
              'text-[9px] font-bold uppercase text-white',
              'ring-1 ring-white/20'
            )}
            style={{
              background: buildTeamGradient(teamPrimary, teamAccent),
            }}
          >
            {team.tag.slice(0, 2)}
          </div>
        )}
      </div>

      {/* TAG - Always visible */}
      <span
        className={clsx(
          sizeConfig.text,
          TYPOGRAPHY.teamTag.weight,
          TYPOGRAPHY.teamTag.tracking,
          'text-white'
        )}
      >
        {team.tag}
      </span>

      {/* NAME - Optional, hidden on mobile */}
      {showName && (
        <span
          className={clsx(
            'hidden text-xs text-white/70 sm:inline-block max-w-[140px] truncate'
          )}
        >
          {team.name}
        </span>
      )}
    </div>
  );
}
