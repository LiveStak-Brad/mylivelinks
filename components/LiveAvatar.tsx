'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LiveAvatarProps {
  /** User's avatar URL */
  avatarUrl?: string | null;
  /** Username for fallback initial and navigation */
  username: string;
  /** Display name for tooltip */
  displayName?: string;
  /** Is user currently live */
  isLive?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Shape variant */
  shape?: 'circle' | 'square';
  /** Whether to show the live badge */
  showLiveBadge?: boolean;
  /** Whether avatar should be clickable */
  clickable?: boolean;
  /** Custom click handler (if not navigating to live stream) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to navigate to live stream when clicked (default: true when isLive) */
  navigateToLive?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

const badgeSizes = {
  xs: 'text-[8px] px-1 py-0.5',
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
  lg: 'text-xs px-2 py-1',
  xl: 'text-xs px-2.5 py-1',
};

const ringWidths = {
  xs: 'ring-2',
  sm: 'ring-2',
  md: 'ring-[3px]',
  lg: 'ring-4',
  xl: 'ring-4',
};

/**
 * LiveAvatar Component
 * 
 * A reusable avatar component that shows a red pulsing ring when user is live
 * and navigates to their live stream when clicked.
 * 
 * @example
 * ```tsx
 * <LiveAvatar
 *   avatarUrl={user.avatar_url}
 *   username={user.username}
 *   displayName={user.display_name}
 *   isLive={user.is_live}
 *   size="md"
 * />
 * ```
 */
export default function LiveAvatar({
  avatarUrl,
  username,
  displayName,
  isLive = false,
  size = 'md',
  shape = 'circle',
  showLiveBadge = true,
  clickable = true,
  onClick,
  className = '',
  navigateToLive = true,
}: LiveAvatarProps) {
  const sizeClass = sizeClasses[size];
  const badgeSize = badgeSizes[size];
  const ringWidth = ringWidths[size];
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const normalizedUsername = String(username || '').trim().toLowerCase();
  const isTestStreamerUsername = normalizedUsername === 'cannastreams' || normalizedUsername === 'mylivelinksofficial';

  // Determine if should navigate to live stream
  const shouldNavigateToLive = isTestStreamerUsername && isLive && navigateToLive && clickable && !onClick;
  
  // Fallback for broken images
  const fallbackSrc = '/no-profile-pic.png';
  
  const avatarContent = (
    <div className={cn('relative flex-shrink-0', className)}>
      {/* Outer pulsing ring (only when live) */}
      {isLive && (
        <div className={cn('absolute inset-0 animate-pulse', roundedClass)}>
          <div className={cn('w-full h-full ring-red-500', ringWidth, roundedClass)}></div>
        </div>
      )}
      
      {/* Avatar */}
      {avatarUrl ? (
        <div 
          className={cn(
            'relative overflow-hidden shadow-lg',
            sizeClass,
            roundedClass,
            isLive ? `${ringWidth} ring-red-500` : `${ringWidth} ring-white/30 dark:ring-gray-700`,
            clickable && 'transition-transform hover:scale-105 cursor-pointer'
          )}
        >
          <Image
            src={avatarUrl}
            alt={displayName || username}
            fill
            className="object-cover"
            sizes={size === 'xs' ? '24px' : size === 'sm' ? '32px' : size === 'md' ? '44px' : size === 'lg' ? '48px' : '64px'}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = fallbackSrc;
            }}
          />
        </div>
      ) : (
        <div 
          className={cn(
            'flex items-center justify-center font-bold shadow-lg',
            sizeClass,
            roundedClass,
            isLive ? `${ringWidth} ring-red-500 bg-red-500 text-white` : `${ringWidth} ring-white/30 dark:ring-gray-700 bg-gradient-to-br from-blue-500 to-purple-600 text-white`,
            clickable && 'transition-transform hover:scale-105 cursor-pointer'
          )}
        >
          {username[0]?.toUpperCase() || '?'}
        </div>
      )}
      
      {/* Live badge */}
      {isLive && showLiveBadge && (
        <div 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 bg-red-500 text-white font-bold rounded-full shadow-lg flex items-center gap-0.5',
            badgeSize
          )}
        >
          <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
          <span className="leading-none">LIVE</span>
        </div>
      )}
    </div>
  );
  
  // If live and should navigate, wrap in Link
  if (shouldNavigateToLive) {
    return (
      <Link 
        href={`/live/${username}`}
        title={`Watch ${displayName || username} live`}
        className="inline-block"
      >
        {avatarContent}
      </Link>
    );
  }
  
  // If clickable with custom onClick
  if (clickable && onClick) {
    return (
      <button 
        onClick={onClick}
        type="button"
        className="inline-block"
        title={displayName || username}
      >
        {avatarContent}
      </button>
    );
  }
  
  // Otherwise just render the avatar
  return avatarContent;
}
