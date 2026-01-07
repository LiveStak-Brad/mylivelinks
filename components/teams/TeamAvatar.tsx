'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { AVATAR_SIZES, PRESENCE, ROLE_STYLES, buildTeamGradient, type AvatarContext, type PresenceStatus, type RoleType } from '@/lib/teams/designTokens';

/**
 * TeamAvatar - Unified avatar component for Teams
 * 
 * VISUAL DESIGN LOCKED:
 * - ALWAYS CIRCULAR (non-negotiable)
 * - Presence ring: Green = online, Red dot/LIVE badge = live
 * - Role badge is icon-based, not text-heavy
 * - Clear visual border using team color
 */

interface TeamAvatarProps {
  /** Avatar image URL */
  src?: string | null;
  /** Alt text / display name */
  alt: string;
  /** Size context */
  size?: AvatarContext;
  /** Presence status */
  presence?: PresenceStatus | null;
  /** User role for styling */
  role?: RoleType;
  /** Team primary color for ring */
  teamColor?: string;
  /** Show LIVE badge overlay */
  isLive?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export default function TeamAvatar({
  src,
  alt,
  size = 'feed',
  presence,
  role,
  teamColor,
  isLive,
  className,
  onClick,
}: TeamAvatarProps) {
  const sizeConfig = AVATAR_SIZES[size];
  const roleConfig = role ? ROLE_STYLES[role] : null;

  // Determine ring color
  const ringColor = teamColor
    ? `ring-2`
    : presence === 'live' || isLive
      ? 'ring-2 ring-red-500/50'
      : presence === 'online'
        ? 'ring-2 ring-green-500/50'
        : 'ring-1 ring-white/20';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={clsx(
        'relative inline-flex flex-shrink-0',
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
      onClick={onClick}
      aria-label={onClick ? `View ${alt}'s profile` : undefined}
    >
      {/* Avatar Image */}
      <div
        className={clsx(
          sizeConfig.className,
          'rounded-full overflow-hidden bg-white/10',
          ringColor
        )}
        style={teamColor ? { 
          boxShadow: `0 0 0 2px ${teamColor}50`,
        } : undefined}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={sizeConfig.size}
            height={sizeConfig.size}
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src="/no-profile-pic.png"
            alt={alt}
            width={sizeConfig.size}
            height={sizeConfig.size}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Presence Indicator */}
      {presence && !isLive && (
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 rounded-full',
            PRESENCE[presence].size,
            PRESENCE[presence].color,
            'ring-2 ring-[#0a0a0f]',
            presence === 'live' && 'animate-pulse'
          )}
        />
      )}

      {/* LIVE Badge */}
      {isLive && (
        <span
          className={clsx(
            'absolute -bottom-1 left-1/2 -translate-x-1/2',
            'flex items-center gap-1 rounded-full',
            'bg-red-500 px-1.5 py-0.5',
            'text-[8px] font-bold uppercase text-white',
            'shadow-md'
          )}
        >
          <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
          Live
        </span>
      )}

      {/* Role Indicator (top-right, icon only) */}
      {roleConfig && role !== 'member' && role !== 'guest' && (
        <span
          className={clsx(
            'absolute -top-0.5 -right-0.5',
            'flex h-4 w-4 items-center justify-center',
            'rounded-full text-[8px]',
            roleConfig.badgeColor,
            'ring-1 ring-[#0a0a0f]'
          )}
        >
          {role === 'leader' ? '★' : '◆'}
        </span>
      )}
    </Component>
  );
}

/**
 * TeamAvatarStack - Displays overlapping avatars for presence strip
 */
interface TeamAvatarStackProps {
  avatars: Array<{
    src?: string | null;
    alt: string;
    isLive?: boolean;
    color?: string;
  }>;
  maxVisible?: number;
  size?: AvatarContext;
  className?: string;
  showOverflowCount?: boolean;
  overlapClassName?: string;
}

export function TeamAvatarStack({
  avatars,
  maxVisible = 5,
  size = 'compact',
  className,
  showOverflowCount = true,
  overlapClassName,
}: TeamAvatarStackProps) {
  const visible = avatars.slice(0, maxVisible);
  const remaining = avatars.length - maxVisible;
  const sizeConfig = AVATAR_SIZES[size];

  return (
    <div className={clsx('flex items-center', className)}>
      {/* Overlapping avatars */}
      <div className={clsx('flex', overlapClassName ?? '-space-x-2')}>
        {visible.map((avatar, i) => (
          <TeamAvatar
            key={i}
            src={avatar.src}
            alt={avatar.alt}
            size={size}
            isLive={avatar.isLive}
            teamColor={avatar.color}
            className="ring-2 ring-[#0a0a0f]"
          />
        ))}
      </div>

      {/* Overflow count */}
      {showOverflowCount && remaining > 0 && (
        <span
          className={clsx(
            sizeConfig.className,
            'ml-1 rounded-full bg-white/10 flex items-center justify-center',
            'text-xs font-semibold text-white/70'
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
