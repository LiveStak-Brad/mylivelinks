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

export { ShowsSection } from './ShowsSection';
export type { ShowItem } from './ShowsSection';

export { PressKitSection } from './PressKitSection';
export type { PressKitItem } from './PressKitSection';

// Business sections
export { ProductsOrServicesSection } from './ProductsOrServicesSection';
export type { ProductOrServiceItem } from './ProductsOrServicesSection';
