/**
 * Profile Section Types + Empty State Copy (MOBILE)
 *
 * IMPORTANT:
 * - This file previously contained mock data providers (dummy content).
 * - UI components must render real data only; if unavailable, show empty states.
 * - Keep empty state copy centralized here to ensure web+mobile wording parity.
 */

import { ProfileType } from './profileTypeConfig';

// ============================================================================
// MOCK DATA TYPES
// ============================================================================

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl?: string;
  previewUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  ticketUrl?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
}

export interface BusinessInfo {
  tagline?: string;
  services: string[];
  hours?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

// ============================================================================
// EMPTY STATE COPY (NO DUMMY CONTENT)
// ============================================================================

/**
 * Get placeholder text for empty sections
 */
export function getEmptyStateText(
  section: string,
  profileType?: ProfileType
): { title: string; text: string; ownerCTA?: string } {
  const emptyStates: Record<string, { title: string; text: string; ownerCTA?: string }> = {
    music_showcase: {
      title: 'No Music Yet',
      text: 'Music tracks and releases will appear here',
      ownerCTA: 'Add Your First Track',
    },
    upcoming_events: {
      title: 'No Upcoming Events',
      text: 'Check back later for show dates and tickets',
      ownerCTA: 'Add Your First Event',
    },
    merchandise: {
      title: 'No Merchandise',
      text: 'Official merch coming soon!',
      ownerCTA: 'Add Merchandise',
    },
    business_info: {
      title: 'Business Info Unavailable',
      text: 'Contact information will be displayed here',
      ownerCTA: 'Add Business Info',
    },
    portfolio: {
      title: 'No Portfolio Items',
      text: 'Work samples and projects will appear here',
      ownerCTA: 'Add Portfolio Item',
    },
    streaming_stats: {
      title: 'No Streaming Stats',
      text: 'Start streaming to see your stats here',
      ownerCTA: 'Go Live Now',
    },
    feed: {
      title: 'No Posts Yet',
      text: 'Posts and updates will appear here',
      ownerCTA: 'Create Your First Post',
    },
    photos: {
      title: 'No Photos Yet',
      text: 'Photos and media will appear here',
      ownerCTA: 'Upload Photos',
    },
    videos: {
      title: 'No Videos Yet',
      text: 'Video content will appear here',
      ownerCTA: 'Upload Video',
    },
  };

  return emptyStates[section] || {
    title: 'No Content',
    text: 'Content will appear here',
    ownerCTA: 'Add Content',
  };
}



