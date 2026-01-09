'use client';

import clsx from 'clsx';
import newProBadge from '@/newprobadge.png';
import { getOwnerProfileIds } from '@/lib/owner-ids';

export type MllProBadgeSize = 'default' | 'compact';

const SIZE_CLASSES: Record<MllProBadgeSize, string> = {
  default: 'h-16 w-16',
  compact: 'h-5 w-5',
};

const OWNER_IDS = new Set(getOwnerProfileIds());

export function shouldShowMllProBadge(
  profileId?: string | null,
  profile?: { is_mll_pro?: boolean }
): boolean {
  if (!profileId) return false;
  if (OWNER_IDS.has(profileId)) return true;
  return profile?.is_mll_pro === true;
}

export interface MllProBadgeProps {
  size?: MllProBadgeSize;
  className?: string;
  altText?: string;
}

export function MllProBadge({
  size = 'default',
  className,
  altText = 'MLL PRO badge',
}: MllProBadgeProps) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.default;

  return (
    <span className={clsx('inline-flex items-center justify-center relative overflow-hidden', sizeClass, className)}>
      <img
        src={newProBadge.src}
        alt={altText}
        className="absolute inset-0 h-full w-full object-contain scale-[1.35]"
      />
    </span>
  );
}

export default MllProBadge;
