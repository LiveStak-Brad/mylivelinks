// Coming Soon Rooms - Mock Data
// Each room represents a themed community space that users can express interest in

export type RoomCategory = 'Gaming' | 'Music' | 'Entertainment';

export interface ComingSoonRoom {
  id: string;
  name: string;
  description: string;
  category: RoomCategory;
  image_url: string;
  fallback_gradient: string;
  interest_count: number;
  status: 'coming_soon' | 'opening_soon';
  special_badge?: string;
  disclaimer?: string;
}

// Curated Unsplash images for each room theme
// All images are free to use (Unsplash license)
export const comingSoonRooms: ComingSoonRoom[] = [
  // Gaming Rooms
  {
    id: 'cod-room',
    name: 'Call of Duty Room',
    description: 'Join the ultimate CoD community. Watch epic plays, discuss loadouts, and compete with fellow soldiers.',
    category: 'Gaming',
    // Military/tactical dark moody aesthetic
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop',
    fallback_gradient: 'from-stone-800 via-zinc-900 to-black',
    interest_count: 2847,
    status: 'coming_soon',
  },
  {
    id: 'fortnite-room',
    name: 'Fortnite Room',
    description: 'Drop in with the Fortnite community! Watch victory royales, discuss strategies, and flex your skins.',
    category: 'Gaming',
    // Colorful gaming setup with purple/blue neon vibes
    image_url: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&h=400&fit=crop',
    fallback_gradient: 'from-purple-600 via-blue-500 to-cyan-400',
    interest_count: 3156,
    status: 'coming_soon',
  },
  {
    id: 'gta-rp-room',
    name: 'GTA RP Room',
    description: 'Roleplay with the best. Watch cinematic storylines, bank heists, and the craziest RP moments.',
    category: 'Gaming',
    // City nightlife, neon urban vibes
    image_url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=400&fit=crop',
    fallback_gradient: 'from-purple-900 via-pink-700 to-orange-500',
    interest_count: 1923,
    status: 'coming_soon',
  },
  {
    id: 'valorant-room',
    name: 'Valorant Room',
    description: 'Tactical shooters unite! Discuss agents, watch clutch plays, and learn from the pros.',
    category: 'Gaming',
    // Esports/competitive gaming with red accent
    image_url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&h=400&fit=crop',
    fallback_gradient: 'from-red-600 via-rose-500 to-pink-400',
    interest_count: 2134,
    status: 'coming_soon',
  },
  {
    id: '2k-madden-room',
    name: '2K / Madden Room',
    description: 'Sports gaming at its finest. NBA 2K, Madden, FIFA — all the sports gaming content in one place.',
    category: 'Gaming',
    // Basketball court / sports arena vibes
    image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop',
    fallback_gradient: 'from-orange-500 via-red-600 to-rose-700',
    interest_count: 1456,
    status: 'coming_soon',
  },
  
  // Music Rooms
  {
    id: 'rap-battle-room',
    name: 'Rap Battle Room',
    description: 'Bars on bars. Watch live rap battles, freestyle sessions, and discover raw talent.',
    category: 'Music',
    // Hip-hop microphone / concert vibes
    image_url: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600&h=400&fit=crop',
    fallback_gradient: 'from-yellow-600 via-amber-700 to-orange-800',
    interest_count: 1789,
    status: 'coming_soon',
  },
  {
    id: 'open-mic-room',
    name: 'Open Mic Room',
    description: 'Your stage awaits. Singers, musicians, poets — share your art with a live audience.',
    category: 'Music',
    // Stage with spotlight / microphone
    image_url: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=600&h=400&fit=crop',
    fallback_gradient: 'from-violet-600 via-purple-700 to-indigo-800',
    interest_count: 1234,
    status: 'coming_soon',
  },
  
  // Entertainment Rooms
  {
    id: 'roast-room',
    name: 'Roast Room',
    description: 'Think you can handle the heat? Watch and participate in comedy roasts with consenting participants.',
    category: 'Entertainment',
    // Comedy stage / fire theme
    image_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&h=400&fit=crop',
    fallback_gradient: 'from-red-700 via-orange-600 to-yellow-500',
    interest_count: 2567,
    status: 'coming_soon',
    special_badge: 'Comedy / Roast',
    disclaimer: 'All participants must provide consent. Community guidelines apply.',
  },
];

// Helper function to format interest count
export function formatInterestCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toLocaleString();
}

// Stub function for marking interest - to be connected to backend later
export async function markInterest(roomId: string): Promise<boolean> {
  // TODO: Connect to Supabase to track user interest
  console.log(`[Coming Soon Rooms] User marked interest in room: ${roomId}`);
  return true;
}

// Stub function for notification signup
export async function signUpForNotification(roomId: string, email?: string): Promise<boolean> {
  // TODO: Connect to notification system
  console.log(`[Coming Soon Rooms] User signed up for notifications: ${roomId}`, email);
  return true;
}

