import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function GET(request: NextRequest, context: { params: { postId: string } }) {
  try {
    const postId = context.params.postId;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);

    const supabase = createAuthedRouteHandlerClient(request);
    const user = await getSessionUser(request); // Get current user for like status

    // Fetch top-level comments (parent_comment_id IS NULL) AND their replies
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id, 
        post_id, 
        author_id, 
        text_content, 
        created_at, 
        like_count,
        reply_count,
        parent_comment_id,
        profiles:author_id(id, username, avatar_url),
        comment_likes!left(profile_id)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Separate top-level comments from replies
    const topLevelComments = (comments ?? []).filter((c: any) => !c.parent_comment_id);
    const repliesMap = new Map<string, any[]>();
    
    (comments ?? []).forEach((c: any) => {
      if (c.parent_comment_id) {
        const parentId = String(c.parent_comment_id);
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId)!.push(c);
      }
    });

    const normalized = topLevelComments.map((c: any) => {
      const commentId = String(c.id);
      const replies = (repliesMap.get(commentId) || []).map((r: any) => ({
        id: String(r.id),
        post_id: String(r.post_id),
        parent_comment_id: String(r.parent_comment_id),
        text_content: String(r.text_content ?? ''),
        created_at: String(r.created_at),
        like_count: Number(r.like_count || 0),
        reply_count: Number(r.reply_count || 0),
        is_liked_by_current_user: user ? r.comment_likes.some((l: any) => l.profile_id === user.id) : false,
        author: {
          id: String(r.profiles?.id ?? r.author_id),
          username: String(r.profiles?.username ?? ''),
          avatar_url: r.profiles?.avatar_url ? String(r.profiles.avatar_url) : null,
        },
      }));

      return {
        id: commentId,
        post_id: String(c.post_id),
        parent_comment_id: null,
        text_content: String(c.text_content ?? ''),
        created_at: String(c.created_at),
        like_count: Number(c.like_count || 0),
        reply_count: Number(c.reply_count || 0),
        is_liked_by_current_user: user ? c.comment_likes.some((l: any) => l.profile_id === user.id) : false,
        replies,
        author: {
          id: String(c.profiles?.id ?? c.author_id),
          username: String(c.profiles?.username ?? ''),
          avatar_url: c.profiles?.avatar_url ? String(c.profiles.avatar_url) : null,
        },
      };
    });

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

    const parentCommentId = body?.parent_comment_id ? String(body.parent_comment_id) : null;

    const supabase = createAuthedRouteHandlerClient(request);

    const insertData: any = {
      post_id: postId,
      author_id: user.id,
      text_content: textContent,
    };

    if (parentCommentId) {
      insertData.parent_comment_id = parentCommentId;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('post_comments')
      .insert(insertData)
      .select('id, post_id, author_id, text_content, created_at, parent_comment_id')
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
