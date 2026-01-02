'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { TeamIdentityContext } from '@/types/teams';
import { BANNER_CONFIG, AVATAR_SIZES, buildTeamGradient, TYPOGRAPHY } from '@/lib/teams/designTokens';

/**
 * TeamBanner - Team header banner with identity
 * 
 * VISUAL DESIGN LOCKED:
 * - Height: ~20-25% viewport max (180px cap, 120px min)
 * - Uses team color gradient OR team image (blurred + darkened)
 * - Banner never scrolls independently (no parallax)
 * - Avatar appears overlaid at bottom-left
 */

interface TeamBannerProps {
  team: TeamIdentityContext;
  className?: string;
  /** Member count to display */
  memberCount?: number;
  /** Online member count */
  onlineCount?: number;
  /** Show the team name and stats overlay */
  showOverlay?: boolean;
  /** Custom banner image URL */
  bannerUrl?: string | null;
  /** Children to render in overlay area */
  children?: React.ReactNode;
}

export default function TeamBanner({
  team,
  className,
  memberCount,
  onlineCount,
  showOverlay = true,
  bannerUrl,
  children,
}: TeamBannerProps) {
  const teamPrimary = team.theme?.primary ?? '#8B5CF6';
  const teamAccent = team.theme?.accent ?? '#6366F1';
  const hasImage = Boolean(bannerUrl);

  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden',
        // Height: 20-25% viewport, capped
        'h-[140px] sm:h-[160px] md:h-[180px]',
        className
      )}
    >
      {/* Background Layer */}
      {hasImage ? (
        // Image banner with blur + darken
        <div className="absolute inset-0">
          <Image
            src={bannerUrl!}
            alt=""
            fill
            className="object-cover"
            style={{
              filter: `blur(${BANNER_CONFIG.imageBlur}px)`,
            }}
            priority
          />
          {/* Darken overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${BANNER_CONFIG.imageDarken})` }}
          />
        </div>
      ) : (
        // Gradient banner
        <div
          className="absolute inset-0"
          style={{
            background: buildTeamGradient(teamPrimary, teamAccent),
          }}
        />
      )}

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 50%)',
        }}
      />

      {/* Gradient overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: BANNER_CONFIG.overlay,
        }}
      />

      {/* Content Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 pb-4 sm:px-6">
            <div className="flex items-end gap-4">
              {/* Team Avatar - CIRCLE ONLY */}
              <div className="relative flex-shrink-0">
                <div
                  className={clsx(
                    AVATAR_SIZES.header.className,
                    'rounded-full overflow-hidden',
                    'ring-4 ring-[#0a0a0f]/80 shadow-xl',
                    'bg-[#0a0a0f]'
                  )}
                >
                  {team.iconUrl ? (
                    <Image
                      src={team.iconUrl}
                      alt={team.name}
                      width={AVATAR_SIZES.header.size}
                      height={AVATAR_SIZES.header.size}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-lg font-bold text-white"
                      style={{
                        background: buildTeamGradient(teamPrimary, teamAccent),
                      }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Team level badge */}
                <div
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg"
                  style={{
                    background: buildTeamGradient(teamPrimary, teamAccent),
                  }}
                >
                  Lv
                </div>
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className={clsx(
                      TYPOGRAPHY.teamName.size,
                      TYPOGRAPHY.teamName.weight,
                      TYPOGRAPHY.teamName.tracking,
                      'text-white drop-shadow-md'
                    )}
                  >
                    {team.name}
                  </h1>
                  <span
                    className={clsx(
                      TYPOGRAPHY.teamTag.size,
                      TYPOGRAPHY.teamTag.weight,
                      TYPOGRAPHY.teamTag.tracking,
                      'text-white/70'
                    )}
                  >
                    {team.tag}
                  </span>
                </div>
                {(memberCount !== undefined || onlineCount !== undefined) && (
                  <div className="mt-1 flex items-center gap-3 text-sm text-white/70">
                    {memberCount !== undefined && (
                      <span>{memberCount.toLocaleString()} members</span>
                    )}
                    {onlineCount !== undefined && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        {onlineCount} online
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}
