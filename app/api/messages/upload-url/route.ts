import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'video/mp4') return 'mp4';
  if (m === 'video/webm') return 'webm';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : null;
    if (!mimeType) {
      return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
    }

    const ext = extFromMime(mimeType);
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported mimeType' }, { status: 400 });
    }

    const otherProfileId = typeof body?.otherProfileId === 'string' ? body.otherProfileId : null;
    let conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;

    if (!conversationId) {
      if (!otherProfileId) {
        return NextResponse.json({ error: 'conversationId or otherProfileId is required' }, { status: 400 });
      }

      const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
        p_other_profile_id: otherProfileId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      conversationId = data;
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_DM_MEDIA_BUCKET || 'pinned-posts';
    const path = `${user.id}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const adminSupabase = getSupabaseAdmin();
    const { data, error } = await adminSupabase.storage.from(bucket).createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 });
    }

    const { data: publicUrlData } = adminSupabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json(
      {
        bucket,
        path,
        signedUrl: data.signedUrl,
        token: data.token,
        publicUrl: publicUrlData?.publicUrl ?? null,
        conversationId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/messages/upload-url error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
