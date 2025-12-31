import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

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
  likes_count: number;
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

    const posts: FeedPost[] = rows.map((r) => ({
      id: String(r.post_id),
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
      gift_total_coins: Number(r.gift_total_coins ?? 0),
      likes_count: Number(r.likes_count ?? 0),
    }));

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
