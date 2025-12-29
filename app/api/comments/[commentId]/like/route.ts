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

    const { error } = await supabase.rpc('like_comment', { p_comment_id: commentId });

    if (error) {
      console.error('like_comment RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
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

    const { error } = await supabase.rpc('unlike_comment', { p_comment_id: commentId });

    if (error) {
      console.error('unlike_comment RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/comments/[commentId]/like error:', err);
    return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 });
  }
}

