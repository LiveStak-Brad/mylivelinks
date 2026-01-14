import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const textContent = typeof body?.text_content === 'string' ? body.text_content.trim() : '';
    const mediaUrl = typeof body?.media_url === 'string' ? body.media_url.trim() : null;
    const visibility = typeof body?.visibility === 'string' && ['public', 'friends', 'followers'].includes(body.visibility) 
      ? body.visibility 
      : 'public';
    const feelingId = typeof body?.feeling_id === 'number' ? body.feeling_id : null;

    if (!textContent && !(mediaUrl && mediaUrl.length) && !feelingId) {
      return NextResponse.json({ error: 'text_content, media_url, or feeling is required' }, { status: 400 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        text_content: textContent || null,
        media_url: mediaUrl && mediaUrl.length ? mediaUrl : null,
        visibility: visibility,
        feeling_id: feelingId,
      })
      .select('id, author_id, text_content, media_url, visibility, feeling_id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ post: data }, { status: 200 });
  } catch (err) {
    console.error('POST /api/posts error:', err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
