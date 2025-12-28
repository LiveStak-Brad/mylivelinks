import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

    const body = await request.json().catch(() => null);
    const clipId = typeof body?.clip_id === 'string' ? body.clip_id : null;
    const projectId = typeof body?.project_id === 'string' ? body.project_id : null;

    if (!clipId) {
      return NextResponse.json({ error: 'clip_id is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const { data: clip, error: clipErr } = await supabase
      .from('clips')
      .select('id, producer_profile_id, storage_path')
      .eq('id', clipId)
      .maybeSingle();

    if (clipErr) {
      return NextResponse.json({ error: clipErr.message }, { status: 400 });
    }

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.producer_profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const storagePathRaw = typeof clip.storage_path === 'string' ? clip.storage_path.trim() : '';
    const storagePath = storagePathRaw.length > 0 ? storagePathRaw.replace(/^\/+/, '').replace(/\/+$/, '') : `clips/${clipId}`;

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_CLIPS_BUCKET || 'clips';
    const objectPath = `${storagePath}/source.mp4`;

    const admin = getSupabaseAdmin();
    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(objectPath);

    const assetUrl = publicUrlData?.publicUrl ?? null;
    if (!assetUrl) {
      return NextResponse.json({ error: 'Failed to compute asset_url' }, { status: 500 });
    }

    const { error: updateErr } = await supabase
      .from('clips')
      .update({
        storage_path: storagePath,
        asset_url: assetUrl,
        status: 'ready',
      })
      .eq('id', clipId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        clip_id: clipId,
        project_id: projectId,
        asset_url: assetUrl,
        storage_path: storagePath,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/clips/upload-complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
