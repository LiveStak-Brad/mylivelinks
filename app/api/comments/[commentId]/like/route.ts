import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function POST(request: NextRequest, context: { params: { commentId: string } }) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commentId = context.params.commentId;
    const supabase = createAuthedRouteHandlerClient(request);

    // Try to insert a like (will fail if already exists due to unique constraint)
    const { data, error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        profile_id: user.id,
      })
      .select('id, created_at')
      .single();

    if (error) {
      // If it's a duplicate key error, user already liked this comment
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already liked' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ like: data }, { status: 200 });
  } catch (err) {
    console.error('POST /api/comments/[commentId]/like error:', err);
    return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { commentId: string } }) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commentId = context.params.commentId;
    const supabase = createAuthedRouteHandlerClient(request);

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('profile_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/comments/[commentId]/like error:', err);
    return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 });
  }
}

