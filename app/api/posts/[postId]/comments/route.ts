import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function GET(request: NextRequest, context: { params: { postId: string } }) {
  try {
    const postId = context.params.postId;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

    const supabase = createAuthedRouteHandlerClient(request);
    
    // Get current user (may be null for anonymous users)
    const user = await getSessionUser(request);
    const currentUserId = user?.id || null;

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, post_id, author_id, text_content, created_at, like_count, profiles:author_id(id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Check which comments the current user has liked
    let likedCommentIds = new Set<string>();
    if (currentUserId && comments && comments.length > 0) {
      const commentIds = comments.map((c: any) => c.id);
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('profile_id', currentUserId)
        .in('comment_id', commentIds);
      
      if (likes) {
        likedCommentIds = new Set(likes.map((l: any) => String(l.comment_id)));
      }
    }

    const normalized = (comments ?? []).map((c: any) => ({
      id: String(c.id),
      post_id: String(c.post_id),
      text_content: String(c.text_content ?? ''),
      created_at: String(c.created_at),
      like_count: Number(c.like_count ?? 0),
      is_liked: likedCommentIds.has(String(c.id)),
      author: {
        id: String(c.profiles?.id ?? c.author_id),
        username: String(c.profiles?.username ?? ''),
        avatar_url: c.profiles?.avatar_url ? String(c.profiles.avatar_url) : null,
      },
    }));

    return NextResponse.json({ comments: normalized, limit }, { status: 200 });
  } catch (err) {
    console.error('GET /api/posts/[postId]/comments error:', err);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: { postId: string } }) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = context.params.postId;

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const textContent = typeof body?.text_content === 'string' ? body.text_content.trim() : '';
    if (!textContent) {
      return NextResponse.json({ error: 'text_content is required' }, { status: 400 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data: inserted, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        text_content: textContent,
      })
      .select('id, post_id, author_id, text_content, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ comment: inserted }, { status: 200 });
  } catch (err) {
    console.error('POST /api/posts/[postId]/comments error:', err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
