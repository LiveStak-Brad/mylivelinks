/**
 * Seed Data for Development/Preview Mode
 * Generates fake streamers, profiles, and chat messages
 */

export interface SeedStreamer {
  id: string;
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_published: boolean;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
}

export interface SeedProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  display_name?: string;
  follower_count: number;
  total_gifts_received: number;
  total_gifts_sent: number;
  gifter_level: number;
  is_live: boolean;
  coin_balance: number;
  earnings_balance: number;
}

const gifterLevels = [
  { level: 0, name: 'New Gifter', color: '#9CA3AF' },
  { level: 1, name: 'Bronze', color: '#CD7F32' },
  { level: 2, name: 'Silver', color: '#C0C0C0' },
  { level: 3, name: 'Gold', color: '#FFD700' },
  { level: 4, name: 'Platinum', color: '#E5E4E2' },
  { level: 5, name: 'Diamond', color: '#B9F2FF' },
  { level: 6, name: 'Master', color: '#9966CC' },
  { level: 7, name: 'Grand Master', color: '#FF6B6B' },
  { level: 8, name: 'Legend', color: '#4ECDC4' },
  { level: 9, name: 'Mythic', color: '#FFE66D' },
  { level: 10, name: 'Titan', color: '#95E1D3' },
];

const usernames = [
  'streamer_pro', 'live_legend', 'gift_master', 'diamond_dreamer',
  'coin_collector', 'viewer_king', 'chat_champion', 'badge_hunter',
  'live_lover', 'gift_guru', 'diamond_diva', 'coin_queen',
];

const bios = [
  'Live streaming enthusiast 🎥',
  'Gifting is my passion 💎',
  'Building my gifter level one coin at a time',
  'Love connecting with viewers!',
  'Professional streamer and content creator',
  'Diamond collector and gift enthusiast',
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateAvatarUrl(username: string): string {
  // Use a placeholder service or generate initials
  const initial = username[0].toUpperCase();
  return `https://ui-avatars.com/api/?name=${initial}&background=random&size=128`;
}

export function generateSeedStreamers(count: number = 12, sortMode: 'random' | 'most_viewed' | 'most_gifted' | 'newest' = 'random'): SeedStreamer[] {
  const streamers: SeedStreamer[] = [];
  
  // Use deterministic seed for consistent results
  const seed = 12345; // Fixed seed for deterministic behavior
  
  for (let i = 0; i < count; i++) {
    const username = `demo_user_${i + 1}`;
    const profileId = `seed-${i + 1}`;
    // Deterministic gifter level based on index
    const gifterLevel = (i * 3) % 11; // Cycles through 0-10
    const badge = gifterLevels[gifterLevel];
    const isPublished = i < 9; // First 9 are published
    
    // Deterministic values for sorting
    // Most Viewed: Higher viewer counts for lower indices
    const viewerCount = isPublished ? Math.max(1, 50 - (i * 4)) : 0;
    
    // Most Gifted: Higher gift totals for lower indices (session gifts)
    const sessionGiftsTotal = isPublished ? (50 - i) * 100 : 0;
    
    // Newest: More recent went_live_at for higher indices
    const wentLiveAt = new Date(Date.now() - (i * 60000)); // 1 minute apart
    
    streamers.push({
      id: `stream-${i + 1}`,
      profile_id: profileId,
      username,
      avatar_url: generateAvatarUrl(username),
      is_published: isPublished,
      live_available: true,
      viewer_count: viewerCount,
      gifter_level: gifterLevel,
      badge_name: badge.name,
      badge_color: badge.color,
      // Add sort metadata for seed mode
      session_gifts_total: sessionGiftsTotal,
      went_live_at: wentLiveAt.toISOString(),
    } as any);
  }

  // Apply sorting based on mode
  if (sortMode === 'most_viewed') {
    streamers.sort((a, b) => b.viewer_count - a.viewer_count);
  } else if (sortMode === 'most_gifted') {
    streamers.sort((a, b) => ((b as any).session_gifts_total || 0) - ((a as any).session_gifts_total || 0));
  } else if (sortMode === 'newest') {
    streamers.sort((a, b) => {
      const aTime = new Date((a as any).went_live_at || 0).getTime();
      const bTime = new Date((b as any).went_live_at || 0).getTime();
      return bTime - aTime;
    });
  } else if (sortMode === 'random') {
    // Stable random shuffle using seed
    const shuffled = [...streamers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((seed + i) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  return streamers;
}

export function generateSeedProfile(username: string): SeedProfile {
  const gifterLevel = Math.floor(Math.random() * 11);
  const badge = gifterLevels[gifterLevel];
  const isLive = Math.random() > 0.5;

  return {
    id: `seed-${username}`,
    username,
    avatar_url: generateAvatarUrl(username),
    bio: getRandomElement(bios),
    display_name: username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    follower_count: Math.floor(Math.random() * 1000) + 10,
    total_gifts_received: Math.floor(Math.random() * 50000) + 1000,
    total_gifts_sent: Math.floor(Math.random() * 30000) + 500,
    gifter_level: gifterLevel,
    is_live: isLive,
    coin_balance: Math.floor(Math.random() * 10000) + 100,
    earnings_balance: Math.floor(Math.random() * 5000) + 50,
  };
}

export function generateSeedChatMessages(count: number = 20) {
  const messages = [];
  const messageTemplates = [
    'Hey everyone! 👋',
    'This is awesome!',
    'Love the live room!',
    'Gifting time! 💎',
    'Who else is here?',
    'Streamer is amazing!',
    'Let\'s go! 🚀',
    'Diamonds incoming!',
    'Best live room ever!',
    'Keep it up!',
  ];

  for (let i = 0; i < count; i++) {
    const username = getRandomElement(usernames);
    const content = getRandomElement(messageTemplates);
    const gifterLevel = Math.floor(Math.random() * 11);
    const badge = gifterLevels[gifterLevel];

    messages.push({
      id: i + 1,
      profile_id: `seed-${username}`,
      username,
      avatar_url: generateAvatarUrl(username),
      gifter_level: gifterLevel,
      badge_name: badge.name,
      badge_color: badge.color,
      message_type: 'text',
      content,
      created_at: new Date(Date.now() - (count - i) * 60000).toISOString(),
    });
  }

  return messages;
}

export function getSeedProfileByUsername(username: string): SeedProfile | null {
  if (username.startsWith('demo_user_')) {
    return generateSeedProfile(username);
  }
  return null;
}

