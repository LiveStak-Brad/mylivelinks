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
  collapsed?: boolean;
  onToggle?: () => void;
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
  collapsed = false,
  onToggle,
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
      logoSize: 'w-16 h-16',
      fontSize: 'text-base',
    },
    minimal: {
      container: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700',
      padding: 'py-1.5 px-4',
      logoSize: 'w-14 h-14',
      fontSize: 'text-sm',
    },
    card: {
      container: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b-2 border-purple-500 shadow-sm',
      padding: 'py-2 px-4',
      logoSize: 'w-20 h-20',
      fontSize: 'text-base',
    },
    gradient: {
      container: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      padding: 'py-2 px-4',
      logoSize: 'w-16 h-16',
      fontSize: 'text-base',
    },
  };

  const currentStyle = styles[bannerStyle] || styles.default;

  // If collapsed, show only a small arrow tab
  if (collapsed) {
    return (
      <div 
        className={`w-full ${currentStyle.container} py-0.5 px-4 z-50 flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition ${className}`}
        onClick={onToggle}
        title="Click to expand banner"
      >
        {/* Down arrow to expand */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${currentStyle.container} py-1 px-4 text-sm z-50 flex-shrink-0 flex items-center justify-between ${className}`}
    >
      {/* Left: Room Name */}
      <div className="font-semibold">
        {roomName}
      </div>
      
      {/* Right: Presented By + Collapse Button */}
      <div className="flex items-center gap-2">
        <div className="font-semibold">
          {presentedBy}
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-white/60 hover:text-white transition"
            title="Collapse banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

