/**
 * Mock Data Providers for Profile Sections
 * 
 * Temporary mock data for each profile section.
 * These will be replaced with real API calls from the Logic Manager.
 * 
 * USAGE: Import the needed provider and call it with profile data.
 * FUTURE: Replace these with actual data fetching logic.
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
// MOCK DATA PROVIDERS
// ============================================================================

/**
 * Mock Music Showcase Data (for musicians)
 */
export function getMockMusicShowcase(profileType?: ProfileType): MusicTrack[] {
  if (profileType !== 'musician') return [];
  
  return [
    {
      id: '1',
      title: 'Summer Vibes',
      artist: 'Latest Single',
      duration: '3:42',
      coverUrl: undefined,
    },
    {
      id: '2',
      title: 'Midnight Dreams',
      artist: 'Featured Track',
      duration: '4:15',
      coverUrl: undefined,
    },
    {
      id: '3',
      title: 'Electric Soul',
      artist: 'Fan Favorite',
      duration: '3:28',
      coverUrl: undefined,
    },
  ];
}

/**
 * Mock Upcoming Events Data (for musicians, comedians)
 */
export function getMockUpcomingEvents(profileType?: ProfileType): Event[] {
  if (profileType !== 'musician' && profileType !== 'comedian') return [];
  
  const eventType = profileType === 'comedian' ? 'Comedy Show' : 'Live Performance';
  
  return [
    {
      id: '1',
      title: `${eventType} - Los Angeles`,
      date: '2025-02-15',
      location: 'The Venue, LA',
      ticketUrl: 'https://example.com/tickets',
      description: 'Join us for an unforgettable night!',
    },
    {
      id: '2',
      title: `${eventType} - New York`,
      date: '2025-03-20',
      location: 'Madison Square Garden',
      ticketUrl: 'https://example.com/tickets',
      description: 'Big city energy!',
    },
  ];
}

/**
 * Mock Merchandise Data (for musicians, comedians)
 */
export function getMockMerchandise(profileType?: ProfileType): Product[] {
  if (profileType !== 'musician' && profileType !== 'comedian') return [];
  
  return [
    {
      id: '1',
      name: 'Official T-Shirt',
      price: 29.99,
      imageUrl: undefined,
      description: 'Comfortable cotton tee with tour logo',
    },
    {
      id: '2',
      name: 'Limited Edition Poster',
      price: 19.99,
      imageUrl: undefined,
      description: 'Signed poster from the latest tour',
    },
    {
      id: '3',
      name: 'Premium Hoodie',
      price: 54.99,
      imageUrl: undefined,
      description: 'Warm and stylish with embroidered logo',
    },
  ];
}

/**
 * Mock Business Info Data (for business profiles)
 */
export function getMockBusinessInfo(profileType?: ProfileType): BusinessInfo | null {
  if (profileType !== 'business') return null;
  
  return {
    tagline: 'Innovative solutions for modern challenges',
    services: [
      'Web Development',
      'Mobile Apps',
      'UI/UX Design',
      'Consulting',
    ],
    hours: 'Mon-Fri: 9AM-6PM EST',
    location: 'San Francisco, CA',
    contactEmail: 'hello@example.com',
    contactPhone: '+1 (555) 123-4567',
  };
}

/**
 * Mock Portfolio Data (for business, creator profiles)
 */
export function getMockPortfolio(profileType?: ProfileType): PortfolioItem[] {
  if (profileType !== 'business' && profileType !== 'creator') return [];
  
  return [
    {
      id: '1',
      title: 'Project Alpha',
      imageUrl: 'https://via.placeholder.com/400x300',
      description: 'A stunning website redesign',
    },
    {
      id: '2',
      title: 'Mobile App Launch',
      imageUrl: 'https://via.placeholder.com/400x300',
      description: 'iOS and Android app development',
    },
    {
      id: '3',
      title: 'Brand Identity',
      imageUrl: 'https://via.placeholder.com/400x300',
      description: 'Complete rebranding package',
    },
  ];
}

/**
 * Mock Streaming Stats (for streamers)
 */
export function getMockStreamingStats(profileType?: ProfileType) {
  if (profileType !== 'streamer') return null;
  
  return {
    total_streams: 247,
    total_minutes_live: 15420,
    total_viewers: 45230,
    peak_viewers: 1842,
    diamonds_earned_lifetime: 125800,
    diamonds_earned_7d: 8420,
    followers_gained_from_streams: 2341,
    last_stream_at: '2025-01-10T18:30:00Z',
  };
}

/**
 * Check if section has mock data available
 */
export function hasMockData(section: string, profileType?: ProfileType): boolean {
  switch (section) {
    case 'music_showcase':
      return getMockMusicShowcase(profileType).length > 0;
    case 'upcoming_events':
      return getMockUpcomingEvents(profileType).length > 0;
    case 'merchandise':
      return getMockMerchandise(profileType).length > 0;
    case 'business_info':
      return getMockBusinessInfo(profileType) !== null;
    case 'portfolio':
      return getMockPortfolio(profileType).length > 0;
    case 'streaming_stats':
      return getMockStreamingStats(profileType) !== null;
    default:
      return true; // Assume other sections have real data
  }
}

// ============================================================================
// PLACEHOLDER COMPONENT DATA
// ============================================================================

/**
 * Get placeholder text for empty sections
 */
export function getEmptyStateText(section: string, profileType?: ProfileType): { title: string; text: string } {
  const emptyStates: Record<string, { title: string; text: string }> = {
    music_showcase: {
      title: 'No Music Yet',
      text: 'Music tracks and releases will appear here',
    },
    upcoming_events: {
      title: 'No Upcoming Events',
      text: 'Check back later for show dates and tickets',
    },
    merchandise: {
      title: 'No Merchandise',
      text: 'Official merch coming soon!',
    },
    business_info: {
      title: 'Business Info Unavailable',
      text: 'Contact information will be displayed here',
    },
    portfolio: {
      title: 'No Portfolio Items',
      text: 'Work samples and projects will appear here',
    },
    streaming_stats: {
      title: 'No Streaming Stats',
      text: 'Start streaming to see your stats here',
    },
  };

  return emptyStates[section] || {
    title: 'No Content',
    text: 'Content will appear here',
  };
}

