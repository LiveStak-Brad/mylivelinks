import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function parseDurationSeconds(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 60 * 60 * 6) return null;
  return rounded;
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

    const body = await request.json().catch(() => null);
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : null;
    const durationSeconds = parseDurationSeconds(body?.durationSeconds ?? body?.duration_seconds);

    if (!mimeType) {
      return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });
    }

    if (mimeType.toLowerCase() !== 'video/mp4') {
      return NextResponse.json({ error: 'Unsupported mimeType (expected video/mp4)' }, { status: 400 });
    }

    if (!durationSeconds) {
      return NextResponse.json({ error: 'durationSeconds is required' }, { status: 400 });
    }

    const clipId = crypto.randomUUID();
    const storagePath = `clips/${clipId}`;

    const { error: clipErr } = await supabase.from('clips').insert({
      id: clipId,
      producer_profile_id: user.id,
      room_name: null,
      mode: 'my_view',
      target_profile_id: null,
      duration_seconds: durationSeconds,
      include_chat: false,
      layout_meta: {},
      status: 'draft',
      visibility: 'private',
      storage_path: storagePath,
      asset_url: null,
      thumbnail_url: null,
    });

    if (clipErr) {
      return NextResponse.json({ error: clipErr.message }, { status: 400 });
    }

    const { data: projectRows, error: projectErr } = await supabase.rpc('create_clip_project_from_clip', {
      p_clip_id: clipId,
      p_caption: null,
      p_composer_level: 'web',
    });

    if (projectErr) {
      return NextResponse.json({ error: projectErr.message }, { status: 400 });
    }

    const projectRow = Array.isArray(projectRows) ? projectRows[0] : projectRows;
    const projectId = typeof projectRow?.project_id === 'string' ? projectRow.project_id : null;

    if (!projectId) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_CLIPS_BUCKET || 'clips';
    const path = `${storagePath}/source.mp4`;

    const admin = getSupabaseAdmin();
    const { data: signed, error: signedErr } = await admin.storage.from(bucket).createSignedUploadUrl(path);

    if (signedErr || !signed) {
      return NextResponse.json({ error: signedErr?.message || 'Failed to create signed upload URL' }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json(
      {
        clip_id: clipId,
        project_id: projectId,
        asset_url: publicUrlData?.publicUrl ?? null,
        storage_path: storagePath,
        bucket,
        path,
        signedUrl: signed.signedUrl,
        token: signed.token,
        publicUrl: publicUrlData?.publicUrl ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/clips/upload-url error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
