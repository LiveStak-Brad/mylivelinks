/**
 * Mock Data for [Username]TV Feature
 * 
 * MOCK DATA LAYER - All mock data is centralized here for easy swap to real API.
 * 
 * WIRING PLAN:
 * - Replace fetchTVVideos() with: GET /api/profile/:profileId/tv or supabase.rpc('get_tv_content', { p_profile_id })
 * - Replace fetchVideoById() with: GET /api/tv/video/:id or supabase.from('creator_studio_items').select().eq('id', id)
 * - Replace fetchVideoComments() with: supabase.from('tv_comments').select() or reuse post_comments with video_id
 * - Replace fetchRelatedVideos() with: supabase.rpc('get_related_videos', { p_video_id, p_content_type })
 */

export interface TVVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  duration: string;
  duration_seconds: number; // For sorting
  views: number;
  likes: number;
  published_at: string;
  content_type: 'podcast' | 'movie' | 'series' | 'education' | 'comedy' | 'vlog' | 'music_video' | 'other';
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    subscriber_count: number;
  };
  tags?: string[];
  // Series/Episode info
  series_id?: string;
  series_title?: string;
  episode_number?: number;
  season_number?: number;
  // Featured flag
  is_featured?: boolean;
}

export interface TVComment {
  id: string;
  text: string;
  created_at: string;
  likes: number;
  dislikes?: number;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  replies?: TVComment[];
}

// ============================================================================
// MOCK VIDEO DATA (20 items)
// ============================================================================
export const MOCK_TV_VIDEOS: TVVideoItem[] = [
  {
    id: 'tv-1',
    title: 'My First Podcast Episode - Getting Started with Content Creation',
    description: 'In this episode, I share my journey into content creation and the lessons I\'ve learned along the way. We discuss equipment, mindset, and building an audience from scratch.',
    thumbnail_url: 'https://picsum.photos/seed/tv1/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '45:23',
    duration_seconds: 2723,
    views: 12500,
    likes: 890,
    published_at: '2024-01-10T10:00:00Z',
    content_type: 'podcast',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['podcast', 'content creation', 'beginners'],
    is_featured: true,
  },
  {
    id: 'tv-2',
    title: 'Behind the Scenes: Making of My Latest Music Video',
    description: 'Go behind the scenes of our latest music video production. See the creative process, challenges we faced, and how we brought the vision to life.',
    thumbnail_url: 'https://picsum.photos/seed/tv2/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '12:45',
    duration_seconds: 765,
    views: 8300,
    likes: 620,
    published_at: '2024-01-08T14:30:00Z',
    content_type: 'music_video',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['music', 'behind the scenes', 'production'],
  },
  {
    id: 'tv-3',
    title: 'Comedy Special: Live at the Downtown Theater',
    description: 'My first full-length comedy special recorded live at the Downtown Theater. An hour of laughs covering relationships, technology, and everyday life.',
    thumbnail_url: 'https://picsum.photos/seed/tv3/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '1:02:15',
    duration_seconds: 3735,
    views: 45000,
    likes: 3200,
    published_at: '2024-01-05T20:00:00Z',
    content_type: 'comedy',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['comedy', 'standup', 'live'],
    is_featured: true,
  },
  {
    id: 'tv-4',
    title: 'Tutorial: Advanced Video Editing Techniques',
    description: 'Learn advanced video editing techniques including color grading, motion graphics, and sound design. Perfect for intermediate editors looking to level up.',
    thumbnail_url: 'https://picsum.photos/seed/tv4/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '28:30',
    duration_seconds: 1710,
    views: 15200,
    likes: 1100,
    published_at: '2024-01-03T09:00:00Z',
    content_type: 'education',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['tutorial', 'editing', 'premiere pro'],
  },
  {
    id: 'tv-5',
    title: 'Day in My Life - Studio Session Vlog',
    description: 'Join me for a day in the studio as I work on new music, meet with collaborators, and share my creative process.',
    thumbnail_url: 'https://picsum.photos/seed/tv5/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '18:42',
    duration_seconds: 1122,
    views: 6700,
    likes: 480,
    published_at: '2024-01-01T16:00:00Z',
    content_type: 'vlog',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['vlog', 'studio', 'day in my life'],
  },
  {
    id: 'tv-6',
    title: 'The Documentary: My Journey So Far',
    description: 'A personal documentary exploring my path from unknown artist to where I am today. Features interviews with family, friends, and collaborators.',
    thumbnail_url: 'https://picsum.photos/seed/tv6/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: '52:18',
    duration_seconds: 3138,
    views: 23400,
    likes: 1800,
    published_at: '2023-12-28T12:00:00Z',
    content_type: 'movie',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['documentary', 'personal', 'journey'],
    is_featured: true,
  },
  {
    id: 'tv-7',
    title: 'The Creative Process - Episode 1: Finding Inspiration',
    description: 'Episode 1 of my new series exploring the creative process. This week: Finding inspiration in unexpected places.',
    thumbnail_url: 'https://picsum.photos/seed/tv7/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    duration: '24:15',
    duration_seconds: 1455,
    views: 18900,
    likes: 1400,
    published_at: '2023-12-25T18:00:00Z',
    content_type: 'series',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['series', 'creative', 'inspiration'],
    series_id: 'series-creative-process',
    series_title: 'The Creative Process',
    season_number: 1,
    episode_number: 1,
  },
  {
    id: 'tv-8',
    title: 'Q&A Session: Answering Your Questions',
    description: 'I answer your most asked questions about my career, creative process, and personal life. Thanks for 100K subscribers!',
    thumbnail_url: 'https://picsum.photos/seed/tv8/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    duration: '35:50',
    duration_seconds: 2150,
    views: 9100,
    likes: 720,
    published_at: '2023-12-22T15:00:00Z',
    content_type: 'other',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['q&a', 'community', '100k'],
  },
  {
    id: 'tv-9',
    title: 'Podcast #2: Interview with Industry Expert',
    description: 'In this episode, I sit down with industry veteran Sarah Chen to discuss the future of content creation and building sustainable careers.',
    thumbnail_url: 'https://picsum.photos/seed/tv9/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    duration: '58:20',
    duration_seconds: 3500,
    views: 11200,
    likes: 850,
    published_at: '2023-12-20T10:00:00Z',
    content_type: 'podcast',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['podcast', 'interview', 'industry'],
  },
  {
    id: 'tv-10',
    title: 'Stand-up Clip: The Airplane Bit',
    description: 'A fan-favorite clip from my live show - my take on airplane travel and the people you meet at 30,000 feet.',
    thumbnail_url: 'https://picsum.photos/seed/tv10/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    duration: '8:45',
    duration_seconds: 525,
    views: 32000,
    likes: 2400,
    published_at: '2023-12-18T20:00:00Z',
    content_type: 'comedy',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['comedy', 'standup', 'clip'],
  },
  {
    id: 'tv-11',
    title: 'Music Video: Summer Nights (Official)',
    description: 'The official music video for "Summer Nights" - a nostalgic trip through warm evenings and endless possibilities.',
    thumbnail_url: 'https://picsum.photos/seed/tv11/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    duration: '4:12',
    duration_seconds: 252,
    views: 87000,
    likes: 6500,
    published_at: '2023-12-15T12:00:00Z',
    content_type: 'music_video',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['music video', 'official', 'summer'],
    is_featured: true,
  },
  {
    id: 'tv-12',
    title: 'Masterclass: Building Your Brand Online',
    description: 'A comprehensive masterclass on building your personal brand online. Covers social media strategy, content planning, and audience growth.',
    thumbnail_url: 'https://picsum.photos/seed/tv12/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    duration: '1:15:30',
    duration_seconds: 4530,
    views: 28500,
    likes: 2100,
    published_at: '2023-12-12T09:00:00Z',
    content_type: 'education',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['masterclass', 'branding', 'social media'],
  },
  {
    id: 'tv-13',
    title: 'The Creative Process - Episode 2: Overcoming Blocks',
    description: 'Episode 2 dives deep into creative blocks - what causes them and practical strategies to overcome them.',
    thumbnail_url: 'https://picsum.photos/seed/tv13/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    duration: '22:45',
    duration_seconds: 1365,
    views: 14300,
    likes: 1050,
    published_at: '2023-12-10T18:00:00Z',
    content_type: 'series',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['series', 'creative', 'blocks'],
    series_id: 'series-creative-process',
    series_title: 'The Creative Process',
    season_number: 1,
    episode_number: 2,
  },
  {
    id: 'tv-14',
    title: 'Weekend Vlog: NYC Content Creator Meetup',
    description: 'Spent the weekend in NYC meeting fellow creators, attending workshops, and exploring the city. So many inspiring conversations!',
    thumbnail_url: 'https://picsum.photos/seed/tv14/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '25:18',
    duration_seconds: 1518,
    views: 8900,
    likes: 670,
    published_at: '2023-12-08T16:00:00Z',
    content_type: 'vlog',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['vlog', 'nyc', 'meetup'],
  },
  {
    id: 'tv-15',
    title: 'Podcast #3: Mental Health in the Creator Economy',
    description: 'An important conversation about mental health challenges faced by content creators and strategies for maintaining balance.',
    thumbnail_url: 'https://picsum.photos/seed/tv15/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '1:05:40',
    duration_seconds: 3940,
    views: 19800,
    likes: 1650,
    published_at: '2023-12-05T10:00:00Z',
    content_type: 'podcast',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['podcast', 'mental health', 'wellness'],
  },
  {
    id: 'tv-16',
    title: 'Comedy Sketch: Working From Home',
    description: 'A comedic take on the work-from-home life - featuring video call disasters, pet interruptions, and questionable productivity.',
    thumbnail_url: 'https://picsum.photos/seed/tv16/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '6:30',
    duration_seconds: 390,
    views: 41000,
    likes: 3100,
    published_at: '2023-12-03T20:00:00Z',
    content_type: 'comedy',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['comedy', 'sketch', 'wfh'],
  },
  {
    id: 'tv-17',
    title: 'Music Video: Midnight Drive (Acoustic Version)',
    description: 'An intimate acoustic version of "Midnight Drive" filmed in a single take at sunset.',
    thumbnail_url: 'https://picsum.photos/seed/tv17/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '3:48',
    duration_seconds: 228,
    views: 52000,
    likes: 4200,
    published_at: '2023-12-01T12:00:00Z',
    content_type: 'music_video',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['music video', 'acoustic', 'live'],
  },
  {
    id: 'tv-18',
    title: 'Tutorial: Lighting Setup for Home Studios',
    description: 'Complete guide to setting up professional lighting in your home studio on any budget. Covers 3-point lighting, natural light, and LED panels.',
    thumbnail_url: 'https://picsum.photos/seed/tv18/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '32:15',
    duration_seconds: 1935,
    views: 21000,
    likes: 1580,
    published_at: '2023-11-28T09:00:00Z',
    content_type: 'education',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['tutorial', 'lighting', 'studio'],
  },
  {
    id: 'tv-19',
    title: 'Short Film: The Last Message',
    description: 'A 15-minute short film about connection, loss, and the messages we leave behind. Written and directed by me.',
    thumbnail_url: 'https://picsum.photos/seed/tv19/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: '15:42',
    duration_seconds: 942,
    views: 35000,
    likes: 2800,
    published_at: '2023-11-25T18:00:00Z',
    content_type: 'movie',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['short film', 'drama', 'original'],
  },
  {
    id: 'tv-20',
    title: 'The Creative Process - Episode 3: Collaboration',
    description: 'The final episode of season 1 explores the art of collaboration - finding partners, managing creative differences, and creating together.',
    thumbnail_url: 'https://picsum.photos/seed/tv20/1280/720',
    video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    duration: '26:30',
    duration_seconds: 1590,
    views: 12100,
    likes: 920,
    published_at: '2023-11-22T18:00:00Z',
    content_type: 'series',
    creator: { id: '1', username: 'creator', display_name: 'The Creator', avatar_url: 'https://picsum.photos/seed/avatar1/100/100', subscriber_count: 15400 },
    tags: ['series', 'creative', 'collaboration'],
    series_id: 'series-creative-process',
    series_title: 'The Creative Process',
    season_number: 1,
    episode_number: 3,
  },
];

// ============================================================================
// MOCK COMMENTS DATA
// ============================================================================
export const MOCK_TV_COMMENTS: TVComment[] = [
  {
    id: 'c1',
    text: 'This is exactly what I needed to hear today. Your content always inspires me to keep creating!',
    created_at: '2024-01-10T12:30:00Z',
    likes: 45,
    author: { id: 'u1', username: 'creativefan', display_name: 'Creative Fan', avatar_url: 'https://picsum.photos/seed/user1/100/100' },
    replies: [
      {
        id: 'c1r1',
        text: 'Same here! Been following since day one.',
        created_at: '2024-01-10T13:00:00Z',
        likes: 12,
        author: { id: 'u2', username: 'dayone_supporter', display_name: 'Day One', avatar_url: 'https://picsum.photos/seed/user2/100/100' },
      },
    ],
  },
  {
    id: 'c2',
    text: 'The production quality keeps getting better! What camera are you using now?',
    created_at: '2024-01-10T11:15:00Z',
    likes: 28,
    author: { id: 'u3', username: 'techgeek', display_name: 'Tech Geek', avatar_url: 'https://picsum.photos/seed/user3/100/100' },
  },
  {
    id: 'c3',
    text: 'Watched this 3 times already. The part about finding your voice really resonated with me.',
    created_at: '2024-01-10T10:45:00Z',
    likes: 67,
    author: { id: 'u4', username: 'aspiring_creator', display_name: 'Aspiring Creator', avatar_url: 'https://picsum.photos/seed/user4/100/100' },
  },
  {
    id: 'c4',
    text: 'Can you do a video on how you plan your content calendar? Would love to see your process!',
    created_at: '2024-01-10T09:30:00Z',
    likes: 89,
    author: { id: 'u5', username: 'plannerlife', display_name: 'Planner Life', avatar_url: 'https://picsum.photos/seed/user5/100/100' },
    replies: [
      {
        id: 'c4r1',
        text: 'Yes please! That would be so helpful.',
        created_at: '2024-01-10T09:45:00Z',
        likes: 15,
        author: { id: 'u6', username: 'newbie_here', display_name: 'Newbie', avatar_url: 'https://picsum.photos/seed/user6/100/100' },
      },
      {
        id: 'c4r2',
        text: 'I second this! Content planning is my weakness.',
        created_at: '2024-01-10T10:00:00Z',
        likes: 8,
        author: { id: 'u7', username: 'struggling_creator', display_name: 'Struggling Creator', avatar_url: 'https://picsum.photos/seed/user7/100/100' },
      },
    ],
  },
  {
    id: 'c5',
    text: '🔥🔥🔥 Fire content as always!',
    created_at: '2024-01-10T08:00:00Z',
    likes: 34,
    author: { id: 'u8', username: 'hype_man', display_name: 'Hype Man', avatar_url: 'https://picsum.photos/seed/user8/100/100' },
  },
  {
    id: 'c6',
    text: 'The editing in this video is next level. How long did post-production take?',
    created_at: '2024-01-09T22:00:00Z',
    likes: 52,
    author: { id: 'u9', username: 'editor_pro', display_name: 'Editor Pro', avatar_url: 'https://picsum.photos/seed/user9/100/100' },
  },
  {
    id: 'c7',
    text: 'Just subscribed! Can\'t believe I\'ve been missing out on this content.',
    created_at: '2024-01-09T20:30:00Z',
    likes: 23,
    author: { id: 'u10', username: 'new_subscriber', display_name: 'New Sub', avatar_url: 'https://picsum.photos/seed/user10/100/100' },
  },
  {
    id: 'c8',
    text: 'This helped me so much with my own channel. Thank you for sharing your knowledge!',
    created_at: '2024-01-09T18:15:00Z',
    likes: 41,
    author: { id: 'u11', username: 'grateful_viewer', display_name: 'Grateful Viewer', avatar_url: 'https://picsum.photos/seed/user11/100/100' },
  },
];

// ============================================================================
// MOCK DATA FETCH FUNCTIONS
// These simulate API calls and can be easily replaced with real implementations
// ============================================================================

/**
 * Fetch all TV videos for a profile
 * Uses get_public_creator_studio_items RPC AND legacy profile_music_videos for real data
 * Matches UsernameTVTab behavior for parity
 */
export async function fetchTVVideos(profileId: string, contentType?: string): Promise<TVVideoItem[]> {
  // Import supabase client dynamically to avoid SSR issues
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  // Map frontend content types to DB item_type enum
  const contentTypeMap: Record<string, string> = {
    'podcast': 'podcast',
    'movie': 'movie',
    'series': 'series_episode',
    'education': 'education',
    'comedy': 'comedy_special',
    'vlog': 'vlog',
    'music_video': 'music_video',
    'other': 'other',
  };
  
  const dbItemType = contentType && contentType !== 'all' ? contentTypeMap[contentType] : null;
  
  // Fetch profile info for creator data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, follower_count')
    .eq('id', profileId)
    .single();
  
  // Fetch from both creator_studio_items AND legacy profile_music_videos (matching UsernameTVTab)
  const [csResult, legacyResult] = await Promise.all([
    supabase.rpc('get_public_creator_studio_items', {
      p_profile_id: profileId,
      p_item_type: dbItemType,
      p_limit: 100,
      p_offset: 0,
    }),
    // Only fetch legacy music videos if not filtering by a non-music type
    (!dbItemType || dbItemType === 'music_video') 
      ? supabase.rpc('get_music_videos', { p_profile_id: profileId })
      : Promise.resolve({ data: null, error: null }),
  ]);
  
  // Map DB item_type back to frontend content_type
  const reverseContentTypeMap: Record<string, TVVideoItem['content_type']> = {
    'podcast': 'podcast',
    'movie': 'movie',
    'series_episode': 'series',
    'education': 'education',
    'comedy_special': 'comedy',
    'vlog': 'vlog',
    'music_video': 'music_video',
    'music': 'music_video',
    'other': 'other',
  };
  
  const allVideos: TVVideoItem[] = [];
  const seenTitles = new Set<string>();
  
  // Add Creator Studio items first
  if (csResult.data && !csResult.error) {
    for (const item of csResult.data) {
      const titleKey = (item.title || '').toLowerCase();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        allVideos.push({
          id: item.id,
          title: item.title || 'Untitled',
          description: item.description || '',
          thumbnail_url: item.thumb_url || item.artwork_url || '',
          video_url: item.media_url || '',
          duration: formatDuration(item.duration_seconds || 0),
          duration_seconds: item.duration_seconds || 0,
          views: 0,
          likes: Number(item.likes_count) || 0,
          published_at: item.created_at,
          content_type: reverseContentTypeMap[item.item_type] || 'other',
          creator: {
            id: profile?.id || profileId,
            username: profile?.username || '',
            display_name: profile?.display_name || profile?.username || '',
            avatar_url: profile?.avatar_url || '',
            subscriber_count: profile?.follower_count || 0,
          },
          tags: [],
          is_featured: false,
        });
      }
    }
  }
  
  // Add legacy music videos (dedupe by title)
  if (legacyResult.data && !legacyResult.error) {
    for (const item of legacyResult.data) {
      const titleKey = (item.title || '').toLowerCase();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        // Extract YouTube thumbnail if available
        let thumbUrl = item.thumbnail_url || '';
        if (!thumbUrl && item.youtube_id) {
          thumbUrl = `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`;
        }
        allVideos.push({
          id: item.id,
          title: item.title || 'Untitled',
          description: '',
          thumbnail_url: thumbUrl,
          video_url: item.youtube_url || '',
          duration: '0:00',
          duration_seconds: 0,
          views: 0,
          likes: 0,
          published_at: item.created_at,
          content_type: 'music_video',
          creator: {
            id: profile?.id || profileId,
            username: profile?.username || '',
            display_name: profile?.display_name || profile?.username || '',
            avatar_url: profile?.avatar_url || '',
            subscriber_count: profile?.follower_count || 0,
          },
          tags: [],
          is_featured: false,
        });
      }
    }
  }
  
  return allVideos;
}

/**
 * Format duration in seconds to display string (e.g., "12:34" or "1:02:15")
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetch a single video by ID
 * Uses creator_studio_items table for real data
 */
export async function fetchVideoById(videoId: string): Promise<TVVideoItem | null> {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  const { data: item, error } = await supabase
    .from('creator_studio_items')
    .select(`
      id,
      title,
      description,
      item_type,
      media_url,
      thumb_url,
      artwork_url,
      duration_seconds,
      created_at,
      owner_profile_id,
      profiles:owner_profile_id (
        id,
        username,
        display_name,
        avatar_url,
        follower_count
      )
    `)
    .eq('id', videoId)
    .eq('status', 'ready')
    .eq('visibility', 'public')
    .single();
  
  if (error || !item) {
    console.error('Error fetching video:', error);
    return null;
  }
  
  // Get likes count
  const { count: likesCount } = await supabase
    .from('creator_studio_item_likes')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', videoId);
  
  const reverseContentTypeMap: Record<string, TVVideoItem['content_type']> = {
    'podcast': 'podcast',
    'movie': 'movie',
    'series_episode': 'series',
    'education': 'education',
    'comedy_special': 'comedy',
    'vlog': 'vlog',
    'music_video': 'music_video',
    'music': 'music_video',
    'other': 'other',
  };
  
  const profile = item.profiles as any;
  
  return {
    id: item.id,
    title: item.title || 'Untitled',
    description: item.description || '',
    thumbnail_url: item.thumb_url || item.artwork_url || '',
    video_url: item.media_url || '',
    duration: formatDuration(item.duration_seconds || 0),
    duration_seconds: item.duration_seconds || 0,
    views: 0,
    likes: likesCount || 0,
    published_at: item.created_at,
    content_type: reverseContentTypeMap[item.item_type] || 'other',
    creator: {
      id: profile?.id || item.owner_profile_id,
      username: profile?.username || '',
      display_name: profile?.display_name || profile?.username || '',
      avatar_url: profile?.avatar_url || '',
      subscriber_count: profile?.follower_count || 0,
    },
    tags: [],
    is_featured: false,
  };
}

/**
 * Fetch comments for a video
 * WIRING: Replace with supabase.from('tv_comments').select() or reuse post_comments
 */
export async function fetchVideoComments(videoId: string): Promise<TVComment[]> {
  await new Promise(resolve => setTimeout(resolve, 250));
  return MOCK_TV_COMMENTS;
}

/**
 * Fetch related videos (same content type, excluding current)
 * Fetches other public videos from the same creator
 */
export async function fetchRelatedVideos(videoId: string, contentType: string, limit = 10): Promise<TVVideoItem[]> {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  // First get the current video to find the owner
  const { data: currentVideo } = await supabase
    .from('creator_studio_items')
    .select('owner_profile_id')
    .eq('id', videoId)
    .single();
  
  if (!currentVideo) return [];
  
  // Fetch other videos from the same creator
  const videos = await fetchTVVideos(currentVideo.owner_profile_id);
  
  return videos
    .filter(v => v.id !== videoId)
    .slice(0, limit);
}

/**
 * Post a new comment
 * WIRING: Replace with supabase.from('tv_comments').insert()
 */
export async function postVideoComment(videoId: string, text: string, authorId: string): Promise<TVComment> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    id: `c-${Date.now()}`,
    text,
    created_at: new Date().toISOString(),
    likes: 0,
    author: {
      id: authorId,
      username: 'current_user',
      display_name: 'You',
      avatar_url: 'https://picsum.photos/seed/currentuser/100/100',
    },
  };
}

/**
 * Toggle like on a video
 * WIRING: Replace with supabase.rpc('toggle_video_like', { p_video_id })
 */
export async function toggleVideoLike(videoId: string): Promise<{ liked: boolean; newCount: number }> {
  await new Promise(resolve => setTimeout(resolve, 150));
  const video = MOCK_TV_VIDEOS.find(v => v.id === videoId);
  return { liked: true, newCount: (video?.likes || 0) + 1 };
}
