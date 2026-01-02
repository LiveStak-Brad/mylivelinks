'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export interface RoomBannerProps {
  roomKey?: string;
  roomName?: string;
  roomLogoUrl?: string | null;
  presentedBy?: string | null;
  bannerStyle?: 'default' | 'minimal' | 'card' | 'gradient';
  customGradient?: string; // e.g. "from-purple-600 to-pink-600"
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onBackClick?: () => void;
  // Go Live button
  showGoLiveButton?: boolean;
  isLive?: boolean;
  onGoLiveClick?: () => void;
  canPublish?: boolean;
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
  customGradient,
  className = '',
  collapsed = false,
  onToggle,
  onBackClick,
  showGoLiveButton = true,
  isLive = false,
  onGoLiveClick,
  canPublish = false,
}: RoomBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 1024);
      setCanGoBack(window.history.length > 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 py-1.5 ${className}`} />
    );
  }

  // Style variants
  const defaultGradient = 'from-purple-600 to-pink-600';
  const gradientClass = customGradient || defaultGradient;
  
  const styles = {
    default: {
      container: `bg-gradient-to-r ${gradientClass} text-white`,
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
      container: `bg-gradient-to-r ${gradientClass} text-white`,
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
      <div className="flex items-center gap-2 font-semibold">
        {isMobile && (onBackClick || canGoBack) && (
          <button
            type="button"
            onClick={() => {
              if (onBackClick) {
                onBackClick();
                return;
              }
              if (typeof window !== 'undefined') {
                window.history.back();
              }
            }}
            className="text-white/90 hover:text-white transition"
            title="Back"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div>{roomName}</div>
      </div>
      
      {/* Right: Presented By + Go Live Button + Collapse Button */}
      <div className="flex items-center gap-3">
        <div className="font-semibold">
          {presentedBy}
        </div>
        
        {/* Go Live Camera Button */}
        {showGoLiveButton && onGoLiveClick && (
          <button
            onClick={onGoLiveClick}
            disabled={!canPublish && !isLive}
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all
              ${isLive 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : canPublish
                  ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50'
                  : 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
              }
            `}
            title={isLive ? 'Click to end live' : canPublish ? 'Go Live' : 'You cannot go live in this room'}
          >
            {/* Camera Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            {isLive ? 'End Live' : 'Go Live'}
          </button>
        )}
        
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

