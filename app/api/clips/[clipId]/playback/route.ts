import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const { clipId } = await params;
    if (!clipId) {
      return NextResponse.json({ error: 'clipId is required' }, { status: 400 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data: clip, error } = await supabase
      .from('clips')
      .select('id,status,visibility,asset_url,thumbnail_url,storage_path')
      .eq('id', clipId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const status = typeof clip.status === 'string' ? clip.status : null;

    const existingAssetUrl =
      typeof clip.asset_url === 'string' && clip.asset_url.trim().length > 0 ? clip.asset_url.trim() : null;
    const existingThumbUrl =
      typeof clip.thumbnail_url === 'string' && clip.thumbnail_url.trim().length > 0 ? clip.thumbnail_url.trim() : null;

    if (clip.visibility === 'public' && clip.status === 'ready' && existingAssetUrl && existingThumbUrl) {
      return NextResponse.json(
        {
          asset_url: existingAssetUrl,
          thumbnail_url: existingThumbUrl,
          status,
        },
        { status: 200 }
      );
    }

    const basePathRaw = typeof clip.storage_path === 'string' ? clip.storage_path.trim() : '';
    const basePath = basePathRaw.length > 0 ? basePathRaw.replace(/^\/+/, '').replace(/\/+$/, '') : `clips/${clipId}`;

    const assetPath = `${basePath}/source.mp4`;
    const thumbPath = `${basePath}/thumb.jpg`;

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_CLIPS_BUCKET || 'clips';
    const admin = getSupabaseAdmin();

    const expiresIn = 60 * 60;
    const { data: assetSigned, error: assetErr } = await admin.storage.from(bucket).createSignedUrl(assetPath, expiresIn);
    const { data: thumbSigned, error: thumbErr } = await admin.storage.from(bucket).createSignedUrl(thumbPath, expiresIn);

    if (
      assetErr ||
      thumbErr ||
      !assetSigned?.signedUrl ||
      !thumbSigned?.signedUrl
    ) {
      return NextResponse.json(
        {
          asset_url: null,
          thumbnail_url: null,
          status,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        asset_url: assetSigned.signedUrl,
        thumbnail_url: thumbSigned.signedUrl,
        status,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /api/clips/[clipId]/playback error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
