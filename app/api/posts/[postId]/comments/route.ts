import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function GET(request: NextRequest, context: { params: { postId: string } }) {
  try {
    const postId = context.params.postId;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

    const supabase = createAuthedRouteHandlerClient(request);

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, post_id, author_id, text_content, created_at, profiles:author_id(id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const normalized = (comments ?? []).map((c: any) => ({
      id: String(c.id),
      post_id: String(c.post_id),
      text_content: String(c.text_content ?? ''),
      created_at: String(c.created_at),
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
