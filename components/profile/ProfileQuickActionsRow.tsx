/**
 * ProfileQuickActionsRow Component - Web
 * 
 * Displays type-specific quick action buttons below profile header.
 * Actions vary based on profile type (Streamer, Musician, Business, etc.)
 */

'use client';

import React from 'react';
import { Video, Calendar, Film, PlayCircle, Music, Ticket, ShoppingBag, Package, ClipboardList, Star, Sparkles, FileText, Link as LinkIcon } from 'lucide-react';
import type { ProfileType } from './ProfileTypeBadge';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  onPress: () => void;
}

interface ProfileQuickActionsRowProps {
  /** The profile type determines which actions to show */
  profileType: ProfileType;
  /** Optional custom className */
  className?: string;
  /** Callbacks for specific actions (optional - will use placeholders if not provided) */
  onGoLive?: () => void;
  onSchedule?: () => void;
  onClips?: () => void;
  onPlay?: () => void;
  onShows?: () => void;
  onMerch?: () => void;
  onBook?: () => void;
  onProducts?: () => void;
  onBookings?: () => void;
  onReviews?: () => void;
  onFeatured?: () => void;
  onPosts?: () => void;
  onLinks?: () => void;
}

const placeholderAction = (label: string) => () => {
  alert(`${label} feature coming soon!`);
};

export function ProfileQuickActionsRow({
  profileType,
  className = '',
  onGoLive,
  onSchedule,
  onClips,
  onPlay,
  onShows,
  onMerch,
  onBook,
  onProducts,
  onBookings,
  onReviews,
  onFeatured,
  onPosts,
  onLinks,
}: ProfileQuickActionsRowProps) {
  const getActions = (): QuickAction[] => {
    switch (profileType) {
      case 'streamer':
        return [
          {
            id: 'go-live',
            label: 'Go Live',
            icon: Video,
            color: '#EF4444',
            onPress: onGoLive || placeholderAction('Go Live'),
          },
          {
            id: 'schedule',
            label: 'Schedule',
            icon: Calendar,
            color: '#8B5CF6',
            onPress: onSchedule || placeholderAction('Schedule'),
          },
          {
            id: 'clips',
            label: 'Clips',
            icon: Film,
            color: '#0EA5E9',
            onPress: onClips || placeholderAction('Clips'),
          },
        ];
      
      case 'musician':
        return [
          {
            id: 'play',
            label: 'Play',
            icon: PlayCircle,
            color: '#8B5CF6',
            onPress: onPlay || placeholderAction('Play Music'),
          },
          {
            id: 'shows',
            label: 'Shows',
            icon: Music,
            color: '#EC4899',
            onPress: onShows || placeholderAction('Shows'),
          },
          {
            id: 'merch',
            label: 'Merch',
            icon: ShoppingBag,
            color: '#F59E0B',
            onPress: onMerch || placeholderAction('Merch'),
          },
        ];
      
      case 'comedian':
        return [
          {
            id: 'clips',
            label: 'Clips',
            icon: Film,
            color: '#F59E0B',
            onPress: onClips || placeholderAction('Clips'),
          },
          {
            id: 'shows',
            label: 'Shows',
            icon: Calendar,
            color: '#EF4444',
            onPress: onShows || placeholderAction('Shows'),
          },
          {
            id: 'book',
            label: 'Book',
            icon: Ticket,
            color: '#8B5CF6',
            onPress: onBook || placeholderAction('Book'),
          },
        ];
      
      case 'business':
        return [
          {
            id: 'products',
            label: 'Products',
            icon: Package,
            color: '#0EA5E9',
            onPress: onProducts || placeholderAction('Products'),
          },
          {
            id: 'bookings',
            label: 'Bookings',
            icon: ClipboardList,
            color: '#10B981',
            onPress: onBookings || placeholderAction('Bookings'),
          },
          {
            id: 'reviews',
            label: 'Reviews',
            icon: Star,
            color: '#F59E0B',
            onPress: onReviews || placeholderAction('Reviews'),
          },
        ];
      
      case 'creator':
        return [
          {
            id: 'featured',
            label: 'Featured',
            icon: Sparkles,
            color: '#EC4899',
            onPress: onFeatured || placeholderAction('Featured'),
          },
          {
            id: 'posts',
            label: 'Posts',
            icon: FileText,
            color: '#8B5CF6',
            onPress: onPosts || placeholderAction('Posts'),
          },
          {
            id: 'links',
            label: 'Links',
            icon: LinkIcon,
            color: '#0EA5E9',
            onPress: onLinks || placeholderAction('Links'),
          },
        ];
    }
  };

  const actions = getActions();

  // Don't render anything if no actions
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`flex justify-center gap-3 py-4 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onPress}
            className="flex flex-col items-center gap-2 px-3 py-2 rounded-xl hover:opacity-80 transition-all transform hover:scale-105 active:scale-95 min-w-[80px]"
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center border"
              style={{ 
                backgroundColor: `${action.color}18`,
                borderColor: `${action.color}26`
              }}
            >
              <Icon size={24} style={{ color: action.color }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ProfileQuickActionsRow;

