'use client';

import clsx from 'clsx';
import newProBadge from '@/newprobadge.png';

export type MllProBadgeSize = 'default' | 'compact';

// Use em units to scale with text size - 2em container to prevent any clipping
const SIZE_CLASSES: Record<MllProBadgeSize, string> = {
  default: 'h-[2em] w-[2em]',
  compact: 'h-[2em] w-[2em]',
};

export function shouldShowMllProBadge(
  profileId?: string | null,
  profile?: { is_mll_pro?: boolean }
): boolean {
  if (!profileId) return false;
  return profile?.is_mll_pro === true;
}

export interface MllProBadgeProps {
  size?: MllProBadgeSize;
  className?: string;
  altText?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export function MllProBadge({
  size = 'default',
  className,
  altText = 'MLL PRO badge',
  clickable = true,
  onClick,
}: MllProBadgeProps) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.default;

  const content = (
    <img
      src={newProBadge.src}
      alt={altText}
      className="absolute inset-0 h-full w-full object-contain scale-[1.3]"
    />
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={clsx(
          'inline-flex items-center justify-center relative flex-shrink-0 pr-1.5',
          'cursor-pointer hover:opacity-80 transition-opacity',
          sizeClass,
          className
        )}
        aria-label="Learn about MLL PRO"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={clsx('inline-flex items-center justify-center relative flex-shrink-0 pr-1.5', sizeClass, className)}>
      {content}
    </span>
  );
}

export default MllProBadge;
