/**
 * ProfileTypeBadge Component - Web
 * 
 * Displays a small pill badge showing the profile type (Streamer, Musician, etc.)
 * Positioned near username/display name on profile screens
 */

'use client';

import React from 'react';

export type ProfileType = 
  | 'streamer'
  | 'musician' 
  | 'comedian'
  | 'business'
  | 'creator';

interface ProfileTypeBadgeProps {
  /** The profile type to display */
  profileType: ProfileType;
  /** Optional custom className */
  className?: string;
}

const PROFILE_TYPE_CONFIG: Record<ProfileType, { 
  label: string; 
  emoji: string; 
  color: string;
  bgLight: string;
  bgDark: string;
}> = {
  streamer: {
    label: 'Streamer',
    emoji: '📺',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
    bgDark: 'rgba(239, 68, 68, 0.2)',
  },
  musician: {
    label: 'Musician',
    emoji: '🎵',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    bgDark: 'rgba(139, 92, 246, 0.2)',
  },
  comedian: {
    label: 'Comedian',
    emoji: '🎭',
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    bgDark: 'rgba(245, 158, 11, 0.2)',
  },
  business: {
    label: 'Business',
    emoji: '💼',
    color: '#0EA5E9',
    bgLight: 'rgba(14, 165, 233, 0.12)',
    bgDark: 'rgba(14, 165, 233, 0.2)',
  },
  creator: {
    label: 'Creator',
    emoji: '✨',
    color: '#EC4899',
    bgLight: 'rgba(236, 72, 153, 0.12)',
    bgDark: 'rgba(236, 72, 153, 0.2)',
  },
};

export function ProfileTypeBadge({ profileType, className = '' }: ProfileTypeBadgeProps) {
  const config = PROFILE_TYPE_CONFIG[profileType] || PROFILE_TYPE_CONFIG.creator;
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${className}`}
      style={{ 
        backgroundColor: `var(--tw-bg-opacity, 1) ${config.bgLight}`,
      }}
    >
      <span className="text-xs">{config.emoji}</span>
      <span 
        className="text-xs font-bold tracking-wide"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}

export default ProfileTypeBadge;

