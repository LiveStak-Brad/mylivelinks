/**
 * Profile Section Components
 * 
 * Reusable section components for different profile types.
 * Each component handles its own layout, empty states, and owner/visitor modes.
 */

// Featured (All profile types)
export { FeaturedSection } from './FeaturedSection';
export type { FeaturedItem } from './FeaturedSection';

// Streamer sections
export { ScheduleSection } from './ScheduleSection';
export type { ScheduleItem } from './ScheduleSection';

export { ClipsSection } from './ClipsSection';
export type { ClipItem } from './ClipsSection';

// Musician sections
export { MusicSection } from './MusicSection';
export type { MusicItem } from './MusicSection';

export { MusicVideosSection } from './MusicVideosSection';
export type { MusicVideoItem } from './MusicVideosSection';

export { ComedySpecialsSection } from './ComedySpecialsSection';
export type { ComedySpecialItem } from './ComedySpecialsSection';

export { VideoPlaylistPlayer } from './VideoPlaylistPlayer';
export type { VideoPlaylistItem } from './VideoPlaylistPlayer';

export { VlogReelsSection } from './VlogReelsSection';
export type { VlogItem } from './VlogReelsSection';

export { AudioPlaylistPlayer } from './AudioPlaylistPlayer';
export type { ProfileMusicTrack } from './AudioPlaylistPlayer';

export { ShowsSection } from './ShowsSection';
export type { ShowItem } from './ShowsSection';

export { PressKitSection } from './PressKitSection';
export type { PressKitItem } from './PressKitSection';

// Business sections
export { ProductsOrServicesSection } from './ProductsOrServicesSection';
export type { ProductOrServiceItem } from './ProductsOrServicesSection';

export { BusinessInfoSection } from './BusinessInfoSection';
export type { BusinessInfoData } from './BusinessInfoSection';

export { MerchSection } from './MerchSection';
export type { MerchItem } from './MerchSection';

// Portfolio (Business + Creator)
export { PortfolioSection } from './PortfolioSection';
export type { PortfolioItem, PortfolioMediaType } from './PortfolioSection';
