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

// Placeholder images using gradient patterns and Unsplash for demo
// These would be replaced with actual branded images in production
export const comingSoonRooms: ComingSoonRoom[] = [
  // Gaming Rooms
  {
    id: 'cod-room',
    name: 'Call of Duty Room',
    description: 'Join the ultimate CoD community. Watch epic plays, discuss loadouts, and compete with fellow soldiers.',
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop',
    fallback_gradient: 'from-orange-600 via-red-700 to-black',
    interest_count: 2847,
    status: 'coming_soon',
  },
  {
    id: 'fortnite-room',
    name: 'Fortnite Room',
    description: 'Drop in with the Fortnite community! Watch victory royales, discuss strategies, and flex your skins.',
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&h=400&fit=crop',
    fallback_gradient: 'from-purple-600 via-blue-500 to-cyan-400',
    interest_count: 3156,
    status: 'coming_soon',
  },
  {
    id: 'gta-rp-room',
    name: 'GTA RP Room',
    description: 'Roleplay with the best. Watch cinematic storylines, bank heists, and the craziest RP moments.',
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1614465000772-1b302f406c47?w=600&h=400&fit=crop',
    fallback_gradient: 'from-lime-500 via-green-600 to-emerald-800',
    interest_count: 1923,
    status: 'coming_soon',
  },
  {
    id: 'valorant-room',
    name: 'Valorant Room',
    description: 'Tactical shooters unite! Discuss agents, watch clutch plays, and learn from the pros.',
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0c?w=600&h=400&fit=crop',
    fallback_gradient: 'from-red-600 via-rose-500 to-pink-400',
    interest_count: 2134,
    status: 'coming_soon',
  },
  {
    id: '2k-madden-room',
    name: '2K / Madden Room',
    description: 'Sports gaming at its finest. NBA 2K, Madden, FIFA — all the sports gaming content in one place.',
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1493711662062-fa541f7f2f19?w=600&h=400&fit=crop',
    fallback_gradient: 'from-amber-500 via-orange-600 to-red-700',
    interest_count: 1456,
    status: 'coming_soon',
  },
  
  // Music Rooms
  {
    id: 'rap-battle-room',
    name: 'Rap Battle Room',
    description: 'Bars on bars. Watch live rap battles, freestyle sessions, and discover raw talent.',
    category: 'Music',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
    fallback_gradient: 'from-yellow-500 via-amber-600 to-orange-700',
    interest_count: 1789,
    status: 'coming_soon',
  },
  {
    id: 'open-mic-room',
    name: 'Open Mic Room',
    description: 'Your stage awaits. Singers, musicians, poets — share your art with a live audience.',
    category: 'Music',
    image_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=400&fit=crop',
    fallback_gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    interest_count: 1234,
    status: 'coming_soon',
  },
  
  // Entertainment Rooms
  {
    id: 'roast-room',
    name: 'Roast Room',
    description: 'Think you can handle the heat? Watch and participate in comedy roasts with consenting participants.',
    category: 'Entertainment',
    image_url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&h=400&fit=crop',
    fallback_gradient: 'from-red-700 via-rose-600 to-pink-500',
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

