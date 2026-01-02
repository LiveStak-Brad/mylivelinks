'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { TeamIdentityContext } from '@/types/teams';

interface TeamBadgeProps {
  team?: TeamIdentityContext | null;
  className?: string;
}

export default function TeamBadge({ team, className }: TeamBadgeProps) {
  if (!team) {
    return null;
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 backdrop-blur-lg shadow-[0_6px_18px_rgba(0,0,0,0.35)]',
        'transition-colors duration-200 text-white',
        className
      )}
      aria-label={`${team.name} team`}
    >
      {team.iconUrl ? (
        <Image
          src={team.iconUrl}
          alt={team.name}
          width={20}
          height={20}
          className="h-5 w-5 rounded-full object-cover ring-1 ring-white/30"
        />
      ) : (
        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-white/50 to-white/10 text-[10px] font-bold uppercase text-black/80 flex items-center justify-center ring-1 ring-white/30">
          {team.tag.slice(0, 2)}
        </div>
      )}
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
        {team.tag}
      </span>
      <span className="hidden text-xs text-white/80 sm:inline-block max-w-[160px] truncate">
        {team.name}
      </span>
    </div>
  );
}
