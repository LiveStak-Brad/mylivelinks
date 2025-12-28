/**
 * ProfileSectionTabs Component - Web
 * 
 * Horizontal scrollable chip-based tabs for profile sections.
 * Tabs vary based on profile type. Controlled via local state.
 * Does NOT render section content - only tab navigation.
 */

'use client';

import React from 'react';
import type { ProfileType } from './ProfileTypeBadge';

export type SectionTab = {
  id: string;
  label: string;
  emoji?: string;
};

interface ProfileSectionTabsProps {
  /** The profile type determines which tabs to show */
  profileType: ProfileType;
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab is selected */
  onTabChange: (tabId: string) => void;
  /** Optional custom className */
  className?: string;
  /** Optional accent color */
  accentColor?: string;
}

const PROFILE_SECTIONS: Record<ProfileType, SectionTab[]> = {
  streamer: [
    { id: 'info', label: 'Info' },
    { id: 'feed', label: 'Feed' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
  ],
  musician: [
    { id: 'info', label: 'Info' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'videos', label: 'Videos' },
    { id: 'events', label: 'Events', emoji: '📅' },
    { id: 'photos', label: 'Photos' },
  ],
  comedian: [
    { id: 'info', label: 'Info' },
    { id: 'videos', label: 'Videos' },
    { id: 'events', label: 'Shows', emoji: '📅' },
    { id: 'photos', label: 'Photos' },
  ],
  business: [
    { id: 'info', label: 'About' },
    { id: 'products', label: 'Products' },
    { id: 'photos', label: 'Gallery' },
  ],
  creator: [
    { id: 'info', label: 'Info' },
    { id: 'featured', label: 'Featured', emoji: '✨' },
    { id: 'gallery', label: 'Gallery', emoji: '🖼️' },
    { id: 'posts', label: 'Posts', emoji: '📝' },
    { id: 'links', label: 'Links', emoji: '🔗' },
    { id: 'feed', label: 'Feed', emoji: '📰' },
    { id: 'photos', label: 'Photos', emoji: '📸' },
};

export function ProfileSectionTabs({
  profileType,
  activeTab,
  onTabChange,
  className = '',
  accentColor = '#8B5CF6',
}: ProfileSectionTabsProps) {
  const tabs = PROFILE_SECTIONS[profileType] || PROFILE_SECTIONS.creator;

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 rounded-full
                transition-all duration-200 text-sm font-semibold
                border-2 whitespace-nowrap
                ${isActive 
                  ? 'shadow-md transform scale-105' 
                  : 'hover:opacity-70 hover:scale-102'
                }
              `}
              style={{
                backgroundColor: isActive 
                  ? `${accentColor}18` 
                  : 'rgba(139, 92, 246, 0.05)',
                borderColor: isActive ? accentColor : 'transparent',
                color: isActive ? accentColor : undefined,
              }}
            >
              {tab.emoji && (
                <span className="text-sm">{tab.emoji}</span>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileSectionTabs;

