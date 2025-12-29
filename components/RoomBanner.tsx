'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export interface RoomBannerProps {
  roomKey?: string;
  roomName?: string;
  roomLogoUrl?: string | null;
  presentedBy?: string | null;
  bannerStyle?: 'default' | 'minimal' | 'card' | 'gradient';
  className?: string;
}

/**
 * Room Banner Component
 * Displays a compact, customizable banner for each room
 * Replaces the static "BETA/TESTING - NO CASH VALUE" banner
 */
export default function RoomBanner({
  roomKey = 'live-central',
  roomName = 'Live Central',
  roomLogoUrl = '/livecentral.png',
  presentedBy = 'MyLiveLinks Official',
  bannerStyle = 'default',
  className = '',
}: RoomBannerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 py-1.5 ${className}`} />
    );
  }

  // Style variants
  const styles = {
    default: {
      container: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
      padding: 'py-2 px-4',
      logoSize: 'w-12 h-12',
      fontSize: 'text-base',
    },
    minimal: {
      container: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700',
      padding: 'py-1.5 px-4',
      logoSize: 'w-10 h-10',
      fontSize: 'text-sm',
    },
    card: {
      container: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b-2 border-purple-500 shadow-sm',
      padding: 'py-2 px-4',
      logoSize: 'w-14 h-14',
      fontSize: 'text-base',
    },
    gradient: {
      container: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      padding: 'py-2 px-4',
      logoSize: 'w-12 h-12',
      fontSize: 'text-base',
    },
  };

  const currentStyle = styles[bannerStyle] || styles.default;

  return (
    <div 
      className={`w-full ${currentStyle.container} ${currentStyle.padding} ${currentStyle.fontSize} z-50 flex-shrink-0 flex items-center justify-between ${className}`}
    >
      {/* Left: Logo + Room Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {roomLogoUrl && (
          <div className={`${currentStyle.logoSize} flex-shrink-0 relative`}>
            <Image
              src={roomLogoUrl}
              alt={`${roomName} logo`}
              width={56}
              height={56}
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <span className="font-bold truncate">
          {roomName}
        </span>
      </div>

      {/* Right: Presented By */}
      {presentedBy && (
        <span className="hidden sm:block font-medium opacity-90 text-right flex-shrink-0 ml-4">
          by {presentedBy}
        </span>
      )}
    </div>
  );
}

