import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

type TopGifter = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_coins: number;
};

type FeedPost = {
  id: string;
  text_content: string;
  media_url: string | null;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_live?: boolean;
  };
  comment_count: number;
  gift_total_coins: number;
  gift_total_diamonds: number;
  top_gifters: TopGifter[];
  likes_count: number;
  views_count: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const limitParam = url.searchParams.get('limit');
    const beforeCreatedAt = url.searchParams.get('before_created_at');
    const beforeId = url.searchParams.get('before_id');
    const username = url.searchParams.get('username');

    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 50);

    const supabase = createAuthedRouteHandlerClient(request);

    const { data, error } = await supabase.rpc('get_public_feed', {
      p_limit: limit,
      p_before_created_at: beforeCreatedAt,
      p_before_id: beforeId,
      p_username: username,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as any[];

    const postIds = rows.map((r: any) => String(r.post_id));

    // Fetch top gifters for all posts in one query
    let topGiftersMap: Record<string, TopGifter[]> = {};
    if (postIds.length > 0) {
      const { data: giftsData } = await supabase
        .from('gifts')
        .select(`
          id,
          coin_amount,
          sender_id,
          metadata
        `)
        .in('metadata->>post_id', postIds)
        .order('coin_amount', { ascending: false });

      if (giftsData && giftsData.length > 0) {
        // Get unique sender IDs
        const senderIds = [...new Set(giftsData.map((g: any) => g.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', senderIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        // Group by post_id and aggregate
        const giftersByPost: Record<string, Map<string, number>> = {};
        for (const gift of giftsData) {
          const postId = (gift.metadata as any)?.post_id;
          if (!postId) continue;
          if (!giftersByPost[postId]) giftersByPost[postId] = new Map();
          const current = giftersByPost[postId].get(gift.sender_id) || 0;
          giftersByPost[postId].set(gift.sender_id, current + Number(gift.coin_amount || 0));
        }

        // Convert to sorted arrays
        for (const [postId, gifterMap] of Object.entries(giftersByPost)) {
          const sorted = [...gifterMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([senderId, totalCoins]) => {
              const profile = profileMap.get(senderId);
              return {
                id: senderId,
                username: profile?.username || 'Unknown',
                avatar_url: profile?.avatar_url || null,
                total_coins: totalCoins,
              };
            });
          topGiftersMap[postId] = sorted;
        }
      }
    }

    const posts: FeedPost[] = rows.map((r) => {
      const postId = String(r.post_id);
      const giftCoins = Number(r.gift_total_coins ?? 0);
      return {
        id: postId,
        text_content: String(r.text_content ?? ''),
        media_url: r.media_url ? String(r.media_url) : null,
        created_at: String(r.created_at),
        author: {
          id: String(r.author_id),
          username: String(r.author_username ?? ''),
          avatar_url: r.author_avatar_url ? String(r.author_avatar_url) : null,
          is_live: Boolean(r.author_is_live ?? false),
        },
        comment_count: Number(r.comment_count ?? 0),
        gift_total_coins: giftCoins,
        gift_total_diamonds: giftCoins, // 1:1 ratio for now
        top_gifters: topGiftersMap[postId] || [],
        likes_count: Number(r.likes_count ?? 0),
        views_count: Number(r.views_count ?? 0),
      };
    });

    const last = posts[posts.length - 1];
    const nextCursor = last
      ? {
          before_created_at: last.created_at,
          before_id: last.id,
        }
      : null;

    return NextResponse.json({ posts, nextCursor, limit });
  } catch (err) {
    console.error('GET /api/feed error:', err);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}
