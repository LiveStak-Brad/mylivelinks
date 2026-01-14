import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Fetch the post with author info
    const { data: post, error: postError } = await admin
      .from('posts')
      .select(`
        id,
        text_content,
        media_url,
        feeling_id,
        visibility,
        created_at,
        author_id,
        profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_mll_pro
        )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      console.error('[API /post/:postId] Query error:', postError);
      return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get feeling info if present
    let feelingEmoji: string | null = null;
    let feelingLabel: string | null = null;

    if (post.feeling_id) {
      const { data: feeling } = await admin
        .from('post_feelings')
        .select('emoji, label')
        .eq('id', post.feeling_id)
        .maybeSingle();

      if (feeling) {
        feelingEmoji = feeling.emoji;
        feelingLabel = feeling.label;
      }
    }

    // Get counts
    const [likesResult, commentsResult, viewsResult] = await Promise.all([
      admin.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', postId),
      admin.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
      admin.from('content_views').select('id', { count: 'exact', head: true }).eq('content_id', postId).eq('content_type', 'feed_post'),
    ]);

    const author = post.profiles as any;

    const response = {
      id: post.id,
      text_content: post.text_content,
      media_url: post.media_url,
      feeling_emoji: feelingEmoji,
      feeling_label: feelingLabel,
      visibility: post.visibility || 'public',
      created_at: post.created_at,
      author: {
        id: author?.id || post.author_id,
        username: author?.username || 'unknown',
        display_name: author?.display_name || author?.username || 'Unknown',
        avatar_url: author?.avatar_url || null,
        is_mll_pro: author?.is_mll_pro || false,
      },
      likes_count: likesResult.count || 0,
      comment_count: commentsResult.count || 0,
      views_count: viewsResult.count || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /post/:postId] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
