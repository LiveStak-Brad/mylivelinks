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

    if (!textContent && !(mediaUrl && mediaUrl.length)) {
      return NextResponse.json({ error: 'text_content or media_url is required' }, { status: 400 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        text_content: textContent,
        media_url: mediaUrl && mediaUrl.length ? mediaUrl : null,
      })
      .select('id, author_id, text_content, media_url, created_at')
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
